#!/usr/bin/env node

/**
 * Comprehensive API Test Suite
 * Automated testing for critical e-commerce APIs
 * 
 * Usage: node tests/api/test-suite.js [--endpoint=<url>] [--verbose]
 */

const axios = require('axios');
const { performance } = require('perf_hooks');

// Test configuration
const config = {
  baseURL: process.env.TEST_API_URL || 'http://localhost:1337',
  timeout: 30000,
  verbose: process.argv.includes('--verbose'),
  maxRetries: 3
};

// Color codes for output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Logging utilities
const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  section: (msg) => console.log(`\n${colors.cyan}🧪 ${msg}${colors.reset}\n`)
};

// Test results tracking
class TestResults {
  constructor() {
    this.passed = 0;
    this.failed = 0;
    this.skipped = 0;
    this.errors = [];
    this.performance = [];
  }

  pass(testName, duration) {
    this.passed++;
    this.performance.push({ test: testName, duration });
    log.success(`${testName} (${Math.round(duration)}ms)`);
  }

  fail(testName, error, duration = 0) {
    this.failed++;
    this.errors.push({ test: testName, error: error.message, duration });
    log.error(`${testName} - ${error.message} (${Math.round(duration)}ms)`);
  }

  skip(testName, reason) {
    this.skipped++;
    log.warning(`${testName} - SKIPPED: ${reason}`);
  }

  get total() {
    return this.passed + this.failed + this.skipped;
  }

  get successRate() {
    return this.total > 0 ? Math.round((this.passed / this.total) * 100) : 0;
  }

  get averageResponseTime() {
    if (this.performance.length === 0) return 0;
    const total = this.performance.reduce((sum, p) => sum + p.duration, 0);
    return Math.round(total / this.performance.length);
  }

  getSummary() {
    return {
      total: this.total,
      passed: this.passed,
      failed: this.failed,
      skipped: this.skipped,
      successRate: this.successRate,
      averageResponseTime: this.averageResponseTime,
      errors: this.errors
    };
  }
}

// HTTP client with retry logic
class TestClient {
  constructor(baseURL) {
    this.client = axios.create({
      baseURL,
      timeout: config.timeout,
      validateStatus: () => true // Don't throw on HTTP error status
    });
    this.authToken = null;
  }

  async request(method, url, data = null, headers = {}) {
    let lastError;
    
    for (let attempt = 1; attempt <= config.maxRetries; attempt++) {
      try {
        const startTime = performance.now();
        
        const requestConfig = {
          method,
          url,
          headers: {
            'Content-Type': 'application/json',
            ...(this.authToken && { Authorization: `Bearer ${this.authToken}` }),
            ...headers
          }
        };

        if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
          requestConfig.data = data;
        }

        const response = await this.client.request(requestConfig);
        const duration = performance.now() - startTime;

        if (config.verbose) {
          console.log(`${method} ${url} -> ${response.status} (${Math.round(duration)}ms)`);
        }

        return { ...response, duration };
      } catch (error) {
        lastError = error;
        
        if (attempt < config.maxRetries) {
          await this.sleep(1000 * attempt); // Exponential backoff
        }
      }
    }

    throw lastError;
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  setAuthToken(token) {
    this.authToken = token;
  }
}

// Test suites
class APITestSuite {
  constructor() {
    this.client = new TestClient(config.baseURL);
    this.results = new TestResults();
    this.testUser = null;
  }

  async runTest(name, testFn) {
    const startTime = performance.now();
    
    try {
      await testFn();
      const duration = performance.now() - startTime;
      this.results.pass(name, duration);
    } catch (error) {
      const duration = performance.now() - startTime;
      this.results.fail(name, error, duration);
    }
  }

  // Health and system tests
  async testHealth() {
    log.section('System Health Tests');

    await this.runTest('Basic Health Check', async () => {
      const response = await this.client.request('GET', '/api/health');
      if (response.status !== 200) {
        throw new Error(`Expected 200, got ${response.status}`);
      }
    });

    await this.runTest('Advanced Health Check', async () => {
      const response = await this.client.request('GET', '/api/health/advanced');
      if (response.status !== 200) {
        throw new Error(`Expected 200, got ${response.status}`);
      }
      
      const data = response.data;
      if (!data.status || !data.system || !data.services) {
        throw new Error('Missing health check data structure');
      }
    });

    await this.runTest('Performance Metrics', async () => {
      const response = await this.client.request('GET', '/api/error-monitoring/stats');
      if (response.status !== 200) {
        throw new Error(`Expected 200, got ${response.status}`);
      }
    });
  }

  // Authentication tests
  async testAuthentication() {
    log.section('Authentication Tests');

    // Test registration
    await this.runTest('User Registration', async () => {
      const userData = {
        username: `testuser_${Date.now()}`,
        email: `test_${Date.now()}@example.com`,
        password: 'TestPassword123!'
      };

      const response = await this.client.request('POST', '/api/auth/local/register', userData);
      
      if (response.status !== 200) {
        throw new Error(`Registration failed: ${response.status} - ${JSON.stringify(response.data)}`);
      }

      if (!response.data.jwt || !response.data.user) {
        throw new Error('Missing JWT or user data in registration response');
      }

      this.testUser = response.data.user;
      this.client.setAuthToken(response.data.jwt);
    });

    // Test login
    await this.runTest('User Login', async () => {
      if (!this.testUser) {
        throw new Error('No test user available for login test');
      }

      const loginData = {
        identifier: this.testUser.email,
        password: 'TestPassword123!'
      };

      const response = await this.client.request('POST', '/api/auth/local', loginData);
      
      if (response.status !== 200) {
        throw new Error(`Login failed: ${response.status}`);
      }

      if (!response.data.jwt) {
        throw new Error('Missing JWT in login response');
      }
    });

    // Test protected endpoint
    await this.runTest('Protected Endpoint Access', async () => {
      const response = await this.client.request('GET', '/api/users/me');
      
      if (response.status !== 200) {
        throw new Error(`Protected endpoint failed: ${response.status}`);
      }

      if (!response.data.id) {
        throw new Error('Missing user data in protected endpoint response');
      }
    });
  }

  // E-commerce API tests
  async testEcommerce() {
    log.section('E-commerce API Tests');

    let testProduct = null;
    let testCart = null;

    // Test product listing
    await this.runTest('Product Listing', async () => {
      const response = await this.client.request('GET', '/api/artists-works?pagination[limit]=5');
      
      if (response.status !== 200) {
        throw new Error(`Product listing failed: ${response.status}`);
      }

      const data = response.data;
      if (!Array.isArray(data.data)) {
        throw new Error('Products data should be an array');
      }

      if (data.data.length > 0) {
        testProduct = data.data[0];
      }
    });

    // Test single product
    if (testProduct) {
      await this.runTest('Single Product Fetch', async () => {
        const response = await this.client.request('GET', `/api/artists-works/${testProduct.documentId}`);
        
        if (response.status !== 200) {
          throw new Error(`Single product fetch failed: ${response.status}`);
        }

        if (!response.data.data.documentId) {
          throw new Error('Missing product data');
        }
      });
    } else {
      this.results.skip('Single Product Fetch', 'No products available');
    }

    // Test cart creation
    await this.runTest('Cart Creation', async () => {
      const response = await this.client.request('GET', '/api/carts/me');
      
      // Cart might not exist yet, which is OK
      if (response.status === 404) {
        // Try to create cart by adding an item
        if (testProduct) {
          const addResponse = await this.client.request('POST', '/api/carts/add', {
            artId: testProduct.documentId,
            quantity: 1
          });
          
          if (addResponse.status !== 200) {
            throw new Error(`Cart creation failed: ${addResponse.status}`);
          }
          
          testCart = addResponse.data.data;
        } else {
          throw new Error('No test product available for cart creation');
        }
      } else if (response.status === 200) {
        testCart = response.data.data;
      } else {
        throw new Error(`Unexpected cart response: ${response.status}`);
      }
    });

    // Test cart operations
    if (testCart && testProduct) {
      await this.runTest('Add to Cart', async () => {
        const response = await this.client.request('POST', '/api/carts/add', {
          artId: testProduct.documentId,
          quantity: 2
        });
        
        if (response.status !== 200) {
          throw new Error(`Add to cart failed: ${response.status}`);
        }
      });

      await this.runTest('Cart Retrieval', async () => {
        const response = await this.client.request('GET', '/api/carts/me');
        
        if (response.status !== 200) {
          throw new Error(`Cart retrieval failed: ${response.status}`);
        }

        const cart = response.data.data;
        if (!cart || !cart.cart_items) {
          throw new Error('Invalid cart structure');
        }
      });
    } else {
      this.results.skip('Add to Cart', 'No cart or product available');
      this.results.skip('Cart Retrieval', 'No cart available');
    }
  }

  // Webhook tests
  async testWebhooks() {
    log.section('Webhook System Tests');

    let testWebhook = null;

    await this.runTest('Webhook Creation', async () => {
      const webhookData = {
        url: 'https://httpbin.org/post',
        secret: 'test_secret_123',
        events: ['order.created', 'payment.succeeded'],
        active: true
      };

      const response = await this.client.request('POST', '/api/webhooks', webhookData);
      
      if (response.status !== 201) {
        throw new Error(`Webhook creation failed: ${response.status}`);
      }

      testWebhook = response.data.data;
      if (!testWebhook.id) {
        throw new Error('Missing webhook ID');
      }
    });

    await this.runTest('Webhook Listing', async () => {
      const response = await this.client.request('GET', '/api/webhooks');
      
      if (response.status !== 200) {
        throw new Error(`Webhook listing failed: ${response.status}`);
      }

      const data = response.data;
      if (!Array.isArray(data.data)) {
        throw new Error('Webhooks data should be an array');
      }
    });

    if (testWebhook) {
      await this.runTest('Webhook Testing', async () => {
        const response = await this.client.request('POST', `/api/webhooks/${testWebhook.id}/test`, {
          event: 'webhook.test'
        });
        
        if (response.status !== 200) {
          throw new Error(`Webhook test failed: ${response.status}`);
        }
      });

      await this.runTest('Webhook Statistics', async () => {
        const response = await this.client.request('GET', '/api/webhooks/stats');
        
        if (response.status !== 200) {
          throw new Error(`Webhook stats failed: ${response.status}`);
        }

        const stats = response.data.data;
        if (typeof stats.totalWebhooks !== 'number') {
          throw new Error('Invalid webhook statistics structure');
        }
      });

      // Cleanup
      await this.runTest('Webhook Deletion', async () => {
        const response = await this.client.request('DELETE', `/api/webhooks/${testWebhook.id}`);
        
        if (response.status !== 204) {
          throw new Error(`Webhook deletion failed: ${response.status}`);
        }
      });
    } else {
      this.results.skip('Webhook Testing', 'No webhook created');
      this.results.skip('Webhook Statistics', 'No webhook created');
      this.results.skip('Webhook Deletion', 'No webhook created');
    }
  }

  // Error handling tests
  async testErrorHandling() {
    log.section('Error Handling Tests');

    await this.runTest('404 Error Handling', async () => {
      const response = await this.client.request('GET', '/api/nonexistent-endpoint');
      
      if (response.status !== 404) {
        throw new Error(`Expected 404, got ${response.status}`);
      }
    });

    await this.runTest('Invalid JSON Handling', async () => {
      const response = await this.client.request('POST', '/api/auth/local', 'invalid-json', {
        'Content-Type': 'application/json'
      });
      
      if (response.status !== 400) {
        throw new Error(`Expected 400 for invalid JSON, got ${response.status}`);
      }
    });

    await this.runTest('Error Monitoring API', async () => {
      const response = await this.client.request('GET', '/api/error-monitoring/health');
      
      if (response.status !== 200) {
        throw new Error(`Error monitoring health check failed: ${response.status}`);
      }
    });
  }

  // Performance tests
  async testPerformance() {
    log.section('Performance Tests');

    await this.runTest('Response Time Check', async () => {
      const iterations = 5;
      const times = [];

      for (let i = 0; i < iterations; i++) {
        const response = await this.client.request('GET', '/api/health');
        times.push(response.duration);
      }

      const averageTime = times.reduce((a, b) => a + b, 0) / times.length;
      
      if (averageTime > 1000) { // 1 second threshold
        throw new Error(`Average response time too high: ${Math.round(averageTime)}ms`);
      }

      log.info(`Average response time: ${Math.round(averageTime)}ms`);
    });

    await this.runTest('Concurrent Requests', async () => {
      const concurrentRequests = 10;
      const promises = Array.from({ length: concurrentRequests }, () =>
        this.client.request('GET', '/api/health')
      );

      const responses = await Promise.all(promises);
      const successCount = responses.filter(r => r.status === 200).length;

      if (successCount !== concurrentRequests) {
        throw new Error(`Only ${successCount}/${concurrentRequests} concurrent requests succeeded`);
      }

      log.info(`${concurrentRequests} concurrent requests completed successfully`);
    });
  }

  // Main test runner
  async runAllTests() {
    console.log(`${colors.cyan}🚀 Starting API Test Suite${colors.reset}`);
    console.log(`${colors.cyan}Target: ${config.baseURL}${colors.reset}\n`);

    const startTime = performance.now();

    try {
      await this.testHealth();
      await this.testAuthentication();
      await this.testEcommerce();
      await this.testWebhooks();
      await this.testErrorHandling();
      await this.testPerformance();
    } catch (error) {
      console.error('Test suite execution failed:', error);
    }

    const totalTime = performance.now() - startTime;
    this.printResults(totalTime);

    return this.results.getSummary();
  }

  printResults(totalTime) {
    const summary = this.results.getSummary();
    
    console.log(`\n${colors.cyan}📊 Test Results Summary${colors.reset}`);
    console.log('='.repeat(50));
    
    console.log(`Total Tests: ${summary.total}`);
    console.log(`${colors.green}Passed: ${summary.passed}${colors.reset}`);
    console.log(`${colors.red}Failed: ${summary.failed}${colors.reset}`);
    console.log(`${colors.yellow}Skipped: ${summary.skipped}${colors.reset}`);
    console.log(`Success Rate: ${summary.successRate}%`);
    console.log(`Average Response Time: ${summary.averageResponseTime}ms`);
    console.log(`Total Execution Time: ${Math.round(totalTime)}ms`);

    if (summary.failed > 0) {
      console.log(`\n${colors.red}❌ Failed Tests:${colors.reset}`);
      summary.errors.forEach(error => {
        console.log(`  • ${error.test}: ${error.error}`);
      });
    }

    if (summary.successRate >= 90) {
      console.log(`\n${colors.green}✅ Test suite passed! API is healthy.${colors.reset}`);
    } else if (summary.successRate >= 70) {
      console.log(`\n${colors.yellow}⚠️  Test suite passed with warnings.${colors.reset}`);
    } else {
      console.log(`\n${colors.red}❌ Test suite failed! Critical issues detected.${colors.reset}`);
    }
  }
}

// Main execution
async function main() {
  const testSuite = new APITestSuite();
  
  try {
    const results = await testSuite.runAllTests();
    
    // Exit with appropriate code
    process.exit(results.successRate >= 90 ? 0 : 1);
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { APITestSuite };