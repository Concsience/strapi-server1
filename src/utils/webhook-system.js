/**
 * Advanced Webhook System
 * Reliable webhook delivery with retry logic, signature verification, and monitoring
 */

import axios from 'axios';
import crypto from 'crypto';
import { performance } from 'perf_hooks';

export interface WebhookConfig {
  url: string;
  secret: string;
  events: string[];
  active: boolean;
  retryCount?: number;
  timeout?: number;
  headers?: Record<string, string>;
}

export interface WebhookPayload {
  event: string;
  timestamp: string;
  data: any;
  metadata?: {
    requestId?: string;
    userId?: string;
    version?: string;
  };
}

export interface WebhookDelivery {
  id: string;
  webhookId: string;
  event: string;
  url: string;
  payload: WebhookPayload;
  status: 'pending' | 'success' | 'failed' | 'retrying';
  attempts: WebhookAttempt[];
  createdAt: number;
  completedAt?: number;
  nextRetryAt?: number;
}

export interface WebhookAttempt {
  timestamp: number;
  status: 'success' | 'failed';
  statusCode?: number;
  responseTime: number;
  error?: string;
  responseBody?: string;
}

export class WebhookSystem {
  private webhooks: Map<string, WebhookConfig> = new Map();
  private deliveries: Map<string, WebhookDelivery> = new Map();
  private retryQueue: string[] = [];
  private maxRetries = 5;
  private retryDelays = [30, 60, 300, 900, 3600]; // seconds

  constructor() {
    // Start retry processor
    setInterval(() => this.processRetries(), 30000); // Every 30 seconds
    
    // Cleanup old deliveries
    setInterval(() => this.cleanupDeliveries(), 300000); // Every 5 minutes
  }

  /**
   * Register a webhook endpoint
   */
  registerWebhook(id: string, config: WebhookConfig): void {
    this.webhooks.set(id, {
      retryCount: this.maxRetries,
      timeout: 30000, // 30 seconds
      ...config
    });

    console.log(`Webhook registered: ${id} -> ${config.url}`);
  }

  /**
   * Unregister a webhook endpoint
   */
  unregisterWebhook(id: string): boolean {
    const result = this.webhooks.delete(id);
    if (result) {
      console.log(`Webhook unregistered: ${id}`);
    }
    return result;
  }

  /**
   * Send event to all registered webhooks
   */
  async sendEvent(event: string, data: any, metadata?: any): Promise<void> {
    const payload: WebhookPayload = {
      event,
      timestamp: new Date().toISOString(),
      data,
      metadata: {
        requestId: metadata?.requestId || this.generateId(),
        userId: metadata?.userId,
        version: '1.0.0',
        ...metadata
      }
    };

    const relevantWebhooks = Array.from(this.webhooks.entries())
      .filter(([, config]) => config.active && config.events.includes(event));

    if (relevantWebhooks.length === 0) {
      return;
    }

    console.log(`Sending event '${event}' to ${relevantWebhooks.length} webhooks`);

    // Send to all relevant webhooks in parallel
    const deliveryPromises = relevantWebhooks.map(([webhookId, config]) =>
      this.deliverWebhook(webhookId, config, payload)
    );

    await Promise.allSettled(deliveryPromises);
  }

  /**
   * Deliver webhook to specific endpoint
   */
  private async deliverWebhook(
    webhookId: string, 
    config: WebhookConfig, 
    payload: WebhookPayload
  ): Promise<void> {
    const deliveryId = this.generateId();
    const delivery: WebhookDelivery = {
      id: deliveryId,
      webhookId,
      event: payload.event,
      url: config.url,
      payload,
      status: 'pending',
      attempts: [],
      createdAt: Date.now()
    };

    this.deliveries.set(deliveryId, delivery);

    try {
      await this.attemptDelivery(delivery, config);
    } catch (error) {
      console.error(`Webhook delivery failed: ${webhookId}`, error);
      delivery.status = 'failed';
      this.scheduleRetry(deliveryId);
    }
  }

  /**
   * Attempt to deliver webhook
   */
  private async attemptDelivery(delivery: WebhookDelivery, config: WebhookConfig): Promise<void> {
    const startTime = performance.now();
    const timestamp = Date.now();

    try {
      // Generate signature
      const signature = this.generateSignature(delivery.payload, config.secret);

      // Prepare headers
      const headers = {
        'Content-Type': 'application/json',
        'X-Webhook-Event': delivery.event,
        'X-Webhook-Signature': signature,
        'X-Webhook-Delivery': delivery.id,
        'X-Webhook-Timestamp': delivery.payload.timestamp,
        'User-Agent': 'Strapi-Webhook/1.0',
        ...config.headers
      };

      // Make request
      const response = await axios.post(config.url, delivery.payload, {
        headers,
        timeout: config.timeout,
        validateStatus: (status) => status < 500 // Retry on 5xx errors
      });

      const responseTime = performance.now() - startTime;

      // Record successful attempt
      const attempt: WebhookAttempt = {
        timestamp,
        status: 'success',
        statusCode: response.status,
        responseTime,
        responseBody: this.truncateString(response.data, 1000)
      };

      delivery.attempts.push(attempt);
      delivery.status = 'success';
      delivery.completedAt = timestamp;

      console.log(`Webhook delivered successfully: ${delivery.webhookId} (${Math.round(responseTime)}ms)`);

    } catch (error: any) {
      const responseTime = performance.now() - startTime;
      
      const attempt: WebhookAttempt = {
        timestamp,
        status: 'failed',
        statusCode: error.response?.status,
        responseTime,
        error: error.message,
        responseBody: error.response?.data ? this.truncateString(error.response.data, 1000) : undefined
      };

      delivery.attempts.push(attempt);

      // Determine if we should retry
      if (delivery.attempts.length < this.maxRetries && this.shouldRetry(error)) {
        delivery.status = 'retrying';
        this.scheduleRetry(delivery.id);
        
        console.warn(`Webhook delivery failed, scheduling retry: ${delivery.webhookId} (attempt ${delivery.attempts.length}/${this.maxRetries})`);
      } else {
        delivery.status = 'failed';
        delivery.completedAt = timestamp;
        
        console.error(`Webhook delivery permanently failed: ${delivery.webhookId} after ${delivery.attempts.length} attempts`);
      }

      throw error;
    }
  }

  /**
   * Schedule retry for failed delivery
   */
  private scheduleRetry(deliveryId: string): void {
    const delivery = this.deliveries.get(deliveryId);
    if (!delivery) return;

    const attemptNumber = delivery.attempts.length - 1;
    const delaySeconds = this.retryDelays[Math.min(attemptNumber, this.retryDelays.length - 1)];
    
    delivery.nextRetryAt = Date.now() + (delaySeconds * 1000);
    
    if (!this.retryQueue.includes(deliveryId)) {
      this.retryQueue.push(deliveryId);
    }
  }

  /**
   * Process retry queue
   */
  private async processRetries(): Promise<void> {
    if (this.retryQueue.length === 0) return;

    const now = Date.now();
    const readyForRetry: string[] = [];

    // Find deliveries ready for retry
    for (const deliveryId of this.retryQueue) {
      const delivery = this.deliveries.get(deliveryId);
      if (delivery && delivery.nextRetryAt && delivery.nextRetryAt <= now) {
        readyForRetry.push(deliveryId);
      }
    }

    if (readyForRetry.length === 0) return;

    console.log(`Processing ${readyForRetry.length} webhook retries`);

    // Process retries
    for (const deliveryId of readyForRetry) {
      const delivery = this.deliveries.get(deliveryId);
      if (!delivery) continue;

      const webhook = this.webhooks.get(delivery.webhookId);
      if (!webhook || !webhook.active) {
        // Remove from retry queue if webhook is disabled
        this.retryQueue = this.retryQueue.filter(id => id !== deliveryId);
        continue;
      }

      try {
        await this.attemptDelivery(delivery, webhook);
        
        // Remove from retry queue if successful
        if (delivery.status === 'success') {
          this.retryQueue = this.retryQueue.filter(id => id !== deliveryId);
        }
      } catch (error) {
        // Will be handled by attemptDelivery
      }
    }

    // Clean up failed deliveries from retry queue
    this.retryQueue = this.retryQueue.filter(deliveryId => {
      const delivery = this.deliveries.get(deliveryId);
      return delivery && delivery.status !== 'failed';
    });
  }

  /**
   * Generate HMAC signature
   */
  private generateSignature(payload: any, secret: string): string {
    const payloadString = JSON.stringify(payload);
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payloadString);
    return `sha256=${hmac.digest('hex')}`;
  }

  /**
   * Verify webhook signature
   */
  static verifySignature(payload: string, signature: string, secret: string): boolean {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
    
    const receivedSignature = signature.replace('sha256=', '');
    
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(receivedSignature, 'hex')
    );
  }

  /**
   * Determine if error should trigger retry
   */
  private shouldRetry(error: any): boolean {
    // Don't retry on client errors (4xx)
    if (error.response?.status >= 400 && error.response?.status < 500) {
      return false;
    }

    // Retry on network errors and server errors (5xx)
    return true;
  }

  /**
   * Get webhook statistics
   */
  getStats(): {
    totalWebhooks: number;
    activeWebhooks: number;
    totalDeliveries: number;
    successfulDeliveries: number;
    failedDeliveries: number;
    pendingRetries: number;
    averageResponseTime: number;
  } {
    const totalWebhooks = this.webhooks.size;
    const activeWebhooks = Array.from(this.webhooks.values()).filter(w => w.active).length;
    const deliveries = Array.from(this.deliveries.values());
    
    const totalDeliveries = deliveries.length;
    const successfulDeliveries = deliveries.filter(d => d.status === 'success').length;
    const failedDeliveries = deliveries.filter(d => d.status === 'failed').length;
    const pendingRetries = this.retryQueue.length;

    // Calculate average response time
    const allAttempts = deliveries.flatMap(d => d.attempts);
    const totalResponseTime = allAttempts.reduce((sum, attempt) => sum + attempt.responseTime, 0);
    const averageResponseTime = allAttempts.length > 0 ? totalResponseTime / allAttempts.length : 0;

    return {
      totalWebhooks,
      activeWebhooks,
      totalDeliveries,
      successfulDeliveries,
      failedDeliveries,
      pendingRetries,
      averageResponseTime: Math.round(averageResponseTime)
    };
  }

  /**
   * Get delivery history for a webhook
   */
  getDeliveryHistory(webhookId: string, limit = 50): WebhookDelivery[] {
    return Array.from(this.deliveries.values())
      .filter(d => d.webhookId === webhookId)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit);
  }

  /**
   * Get recent deliveries
   */
  getRecentDeliveries(limit = 100): WebhookDelivery[] {
    return Array.from(this.deliveries.values())
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit);
  }

  /**
   * Clean up old deliveries to prevent memory leaks
   */
  private cleanupDeliveries(): void {
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    const cutoff = Date.now() - maxAge;
    
    let removedCount = 0;
    for (const [id, delivery] of this.deliveries.entries()) {
      if (delivery.createdAt < cutoff && delivery.status !== 'retrying') {
        this.deliveries.delete(id);
        removedCount++;
      }
    }

    if (removedCount > 0) {
      console.log(`Cleaned up ${removedCount} old webhook deliveries`);
    }
  }

  /**
   * Utility methods
   */
  private generateId(): string {
    return `wh_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private truncateString(str: any, maxLength: number): string {
    const stringified = typeof str === 'string' ? str : JSON.stringify(str);
    return stringified.length > maxLength 
      ? stringified.substring(0, maxLength) + '...'
      : stringified;
  }
}

// Singleton instance
export const webhookSystem = new WebhookSystem();

// E-commerce specific webhook events
export const WebhookEvents = {
  // Order events
  ORDER_CREATED: 'order.created',
  ORDER_UPDATED: 'order.updated',
  ORDER_COMPLETED: 'order.completed',
  ORDER_CANCELLED: 'order.cancelled',
  
  // Payment events
  PAYMENT_SUCCEEDED: 'payment.succeeded',
  PAYMENT_FAILED: 'payment.failed',
  PAYMENT_REFUNDED: 'payment.refunded',
  
  // Inventory events
  STOCK_LOW: 'inventory.stock_low',
  STOCK_OUT: 'inventory.stock_out',
  STOCK_UPDATED: 'inventory.updated',
  
  // User events
  USER_REGISTERED: 'user.registered',
  USER_UPDATED: 'user.updated',
  
  // Product events
  PRODUCT_CREATED: 'product.created',
  PRODUCT_UPDATED: 'product.updated',
  PRODUCT_DELETED: 'product.deleted'
};

// Helper function to send e-commerce events
export const sendEcommerceEvent = async (
  event: string, 
  data: any, 
  userId?: string,
  orderId?: string
) => {
  await webhookSystem.sendEvent(event, data, {
    userId,
    orderId,
    source: 'strapi-ecommerce'
  });
};