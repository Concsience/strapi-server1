/**
 * Performance Monitoring Middleware
 * Comprehensive performance tracking, metrics collection, and alerting
 */
const { performance } = require('perf_hooks');
const os = require('os');

class PerformanceMonitor {
    constructor() {
        this.metrics = [];
        this.responseTimes = [];
        this.endpointStats = new Map();
        this.alertThresholds = {
            responseTime: 2000,
            memoryUsage: 0.85,
            errorRate: 0.05,
            requestsPerMinute: 1000 // Max 1000 RPM
        };
        // Cleanup old metrics every 5 minutes
        setInterval(() => this.cleanupMetrics(), 5 * 60 * 1000);
        // Generate reports every minute
        setInterval(() => this.generateReport(), 60 * 1000);
    }

    /**
     * Main middleware function
     */
    middleware() {
        return async (ctx, next) => {
            const startTime = performance.now();
            const startCpuUsage = process.cpuUsage();
            const startMemory = process.memoryUsage();
            // Request metadata
            const requestId = this.generateRequestId();
            ctx.state.requestId = requestId;
            ctx.state.startTime = startTime;
            // Add request ID to headers
            ctx.set('X-Request-ID', requestId);
            let error = null;
            try {
                await next();
            }
            catch (err) {
                error = err;
                throw err;
            }
            finally {
                const endTime = performance.now();
                const responseTime = endTime - startTime;
                const endCpuUsage = process.cpuUsage(startCpuUsage);
                const endMemory = process.memoryUsage();
                // Collect metric
                const metric = {
                    timestamp: Date.now(),
                    method: ctx.method,
                    path: this.normalizePath(ctx.path),
                    statusCode: ctx.status,
                    responseTime,
                    memoryUsage: endMemory,
                    cpuUsage: endCpuUsage,
                    userAgent: ctx.get('User-Agent'),
                    ip: ctx.ip,
                    userId: ctx.state.user?.id,
                    contentLength: ctx.length,
                    error: error?.message
                };
                this.recordMetric(metric);
                this.checkAlerts(metric);
                // Add performance headers
                ctx.set('X-Response-Time', `${Math.round(responseTime)}ms`);
                ctx.set('X-Memory-Usage', `${Math.round(endMemory.heapUsed / 1024 / 1024)}MB`);
            }
        };
    }

    /**
     * Record performance metric
     */
    recordMetric(metric) {
        this.metrics.push(metric);
        this.responseTimes.push(metric.responseTime);
        // Update endpoint stats
        const endpointKey = `${metric.method} ${metric.path}`;
        if (!this.endpointStats.has(endpointKey)) {
            this.endpointStats.set(endpointKey, { times: [], errors: 0 });
        }
        const endpointStat = this.endpointStats.get(endpointKey);
        endpointStat.times.push(metric.responseTime);
        if (metric.statusCode >= 400) {
            endpointStat.errors++;
        }
        // Keep only last 1000 response times in memory
        if (this.responseTimes.length > 1000) {
            this.responseTimes = this.responseTimes.slice(-1000);
        }
        // Keep only last 100 times per endpoint
        if (endpointStat.times.length > 100) {
            endpointStat.times = endpointStat.times.slice(-100);
        }
        // Log slow requests
        if (metric.responseTime > 1000) {
            console.warn(`Slow request detected: ${metric.method} ${metric.path} - ${Math.round(metric.responseTime)}ms`, {
                requestId: metric.timestamp,
                userId: metric.userId,
                statusCode: metric.statusCode
            });
        }
    }

    /**
     * Check for performance alerts
     */
    checkAlerts(metric) {
        // Response time alert
        if (metric.responseTime > this.alertThresholds.responseTime) {
            this.triggerAlert('SLOW_RESPONSE', {
                path: metric.path,
                responseTime: metric.responseTime,
                threshold: this.alertThresholds.responseTime
            });
        }
        // Memory usage alert
        const memoryUsagePercentage = metric.memoryUsage.heapUsed / metric.memoryUsage.heapTotal;
        if (memoryUsagePercentage > this.alertThresholds.memoryUsage) {
            this.triggerAlert('HIGH_MEMORY', {
                usage: memoryUsagePercentage,
                heapUsed: metric.memoryUsage.heapUsed,
                heapTotal: metric.memoryUsage.heapTotal
            });
        }
        // Error rate alert (check last 100 requests)
        const recentMetrics = this.metrics.slice(-100);
        const errorCount = recentMetrics.filter(m => m.statusCode >= 400).length;
        const errorRate = errorCount / recentMetrics.length;
        if (errorRate > this.alertThresholds.errorRate && recentMetrics.length >= 10) {
            this.triggerAlert('HIGH_ERROR_RATE', {
                errorRate,
                errorCount,
                totalRequests: recentMetrics.length
            });
        }
    }

    /**
     * Trigger performance alert
     */
    triggerAlert(type, data) {
        const alert = {
            type,
            timestamp: new Date().toISOString(),
            data,
            severity: this.getAlertSeverity(type)
        };
        console.warn(`PERFORMANCE ALERT [${type}]:`, alert);
        // In production, send to monitoring service
        // await this.sendToMonitoring(alert);
        // await this.sendSlackNotification(alert);
        // await this.sendEmail(alert);
    }

    /**
     * Get alert severity level
     */
    getAlertSeverity(type) {
        switch (type) {
            case 'SLOW_RESPONSE': return 'medium';
            case 'HIGH_MEMORY': return 'high';
            case 'HIGH_ERROR_RATE': return 'critical';
            default: return 'low';
        }
    }

    /**
     * Generate performance statistics
     */
    getStats() {
        const now = Date.now();
        const oneMinuteAgo = now - 60000;
        const recentMetrics = this.metrics.filter(m => m.timestamp >= oneMinuteAgo);
        // Calculate percentiles
        const sortedTimes = [...this.responseTimes].sort((a, b) => a - b);
        const p95Index = Math.floor(sortedTimes.length * 0.95);
        const p99Index = Math.floor(sortedTimes.length * 0.99);
        // Calculate slowest endpoints
        const slowestEndpoints = Array.from(this.endpointStats.entries())
            .map(([path, stats]) => ({
            path,
            averageTime: stats.times.reduce((a, b) => a + b, 0) / stats.times.length,
            requestCount: stats.times.length
        }))
            .sort((a, b) => b.averageTime - a.averageTime)
            .slice(0, 10);
        // Memory trend (last 10 metrics)
        const memoryTrend = this.metrics
            .slice(-10)
            .map(m => ({
            timestamp: m.timestamp,
            heapUsed: m.memoryUsage.heapUsed,
            heapTotal: m.memoryUsage.heapTotal
        }));
        return {
            totalRequests: this.metrics.length,
            averageResponseTime: this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length || 0,
            p95ResponseTime: sortedTimes[p95Index] || 0,
            p99ResponseTime: sortedTimes[p99Index] || 0,
            requestsPerMinute: recentMetrics.length,
            errorRate: recentMetrics.length > 0
                ? recentMetrics.filter(m => m.statusCode >= 400).length / recentMetrics.length
                : 0,
            slowestEndpoints,
            memoryTrend
        };
    }

    /**
     * Generate and log performance report
     */
    generateReport() {
        const stats = this.getStats();
        if (stats.totalRequests === 0)
            return;
        console.log('📊 Performance Report:', {
            requests: stats.totalRequests,
            avgResponse: `${Math.round(stats.averageResponseTime)}ms`,
            p95: `${Math.round(stats.p95ResponseTime)}ms`,
            p99: `${Math.round(stats.p99ResponseTime)}ms`,
            rpm: stats.requestsPerMinute,
            errorRate: `${(stats.errorRate * 100).toFixed(2)}%`,
            memory: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`
        });
        // Log slowest endpoints if any are notably slow
        const slowEndpoints = stats.slowestEndpoints.filter(e => e.averageTime > 500);
        if (slowEndpoints.length > 0) {
            console.warn('🐌 Slowest Endpoints:', slowEndpoints.slice(0, 3));
        }
    }

    /**
     * Cleanup old metrics to prevent memory leaks
     */
    cleanupMetrics() {
        const oneHourAgo = Date.now() - 3600000; // 1 hour
        const initialLength = this.metrics.length;
        this.metrics = this.metrics.filter(m => m.timestamp >= oneHourAgo);
        const removedCount = initialLength - this.metrics.length;
        if (removedCount > 0) {
            console.log(`🧹 Cleaned up ${removedCount} old performance metrics`);
        }
        // Clean up endpoint stats
        for (const [key, stats] of this.endpointStats.entries()) {
            if (stats.times.length === 0) {
                this.endpointStats.delete(key);
            }
        }
    }

    /**
     * Get real-time system metrics
     */
    getSystemMetrics() {
        const memUsage = process.memoryUsage();
        const cpuUsage = process.cpuUsage();
        const loadAvg = os.loadavg();
        return {
            memory: {
                heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
                heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
                external: Math.round(memUsage.external / 1024 / 1024),
                rss: Math.round(memUsage.rss / 1024 / 1024),
                usage: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100) // %
            },
            cpu: {
                user: Math.round(cpuUsage.user / 1000),
                system: Math.round(cpuUsage.system / 1000),
                cores: os.cpus().length
            },
            system: {
                loadAvg: loadAvg.map(avg => Math.round(avg * 100) / 100),
                uptime: Math.round(process.uptime()),
                platform: os.platform(),
                arch: os.arch()
            }
        };
    }

    /**
     * Normalize path for grouping (remove IDs, etc.)
     */
    normalizePath(path) {
        return path
            .replace(/\/\d+/g, '/:id')
            .replace(/\/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/g, '/:uuid')
            .replace(/\/[a-zA-Z0-9_-]{20,}/g, '/:token');
    }

    /**
     * Generate unique request ID
     */
    generateRequestId() {
        return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    }

    /**
     * Export metrics for external monitoring
     */
    exportMetrics() {
        return [...this.metrics];
    }

    /**
     * Clear all metrics
     */
    clearMetrics() {
        this.metrics = [];
        this.responseTimes = [];
        this.endpointStats.clear();
        console.log('🧹 Performance metrics cleared');
    }
}

// Export singleton instance
const performanceMonitor = new PerformanceMonitor();

// Export class and instance
module.exports = {
    PerformanceMonitor,
    performanceMonitor,
    default: performanceMonitor.middleware()
};