/**
 * Webhooks Management Controller
 * API endpoints for managing webhook configurations and monitoring deliveries
 */

import { Context } from 'koa';
import { webhookSystem, WebhookConfig } from '../../../utils/webhook-system';

export default {
  /**
   * List all registered webhooks
   * GET /api/webhooks
   */
  async list(ctx: Context) {
    try {
      const webhooks = Array.from((webhookSystem as any).webhooks.entries()).map(([id, config]: [string, WebhookConfig]) => ({
        id,
        url: config.url,
        events: config.events,
        active: config.active,
        createdAt: new Date().toISOString() // In real implementation, this would come from database
      }));

      ctx.body = {
        data: webhooks,
        meta: {
          total: webhooks.length,
          active: webhooks.filter(w => w.active).length
        }
      };
    } catch (error) {
      ctx.throw(500, 'Failed to retrieve webhooks');
    }
  },

  /**
   * Create new webhook
   * POST /api/webhooks
   */
  async create(ctx: Context) {
    try {
      const { url, secret, events, active = true, headers } = ctx.request.body;

      // Validation
      if (!url || !secret || !events || !Array.isArray(events)) {
        ctx.throw(400, 'Missing required fields: url, secret, events');
      }

      if (!this.isValidUrl(url)) {
        ctx.throw(400, 'Invalid URL format');
      }

      if (events.length === 0) {
        ctx.throw(400, 'At least one event must be specified');
      }

      // Generate webhook ID
      const webhookId = `wh_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      const config: WebhookConfig = {
        url,
        secret,
        events,
        active,
        headers: headers || {},
        retryCount: 5,
        timeout: 30000
      };

      // Register webhook
      webhookSystem.registerWebhook(webhookId, config);

      const webhook = {
        id: webhookId,
        ...config,
        secret: '***', // Hide secret in response
        createdAt: new Date().toISOString(),
        createdBy: ctx.state.user?.id || 'system'
      };

      // In production, save to database
      console.log('Webhook created:', webhookId);

      ctx.status = 201;
      ctx.body = { data: webhook };
    } catch (error) {
      if (error.status) throw error;
      ctx.throw(500, 'Failed to create webhook');
    }
  },

  /**
   * Update webhook configuration
   * PUT /api/webhooks/:id
   */
  async update(ctx: Context) {
    try {
      const { id } = ctx.params;
      const { url, secret, events, active, headers } = ctx.request.body;

      // Check if webhook exists
      const existingWebhook = (webhookSystem as any).webhooks.get(id);
      if (!existingWebhook) {
        ctx.throw(404, 'Webhook not found');
      }

      // Validate updates
      if (url && !this.isValidUrl(url)) {
        ctx.throw(400, 'Invalid URL format');
      }

      if (events && (!Array.isArray(events) || events.length === 0)) {
        ctx.throw(400, 'Events must be a non-empty array');
      }

      // Update configuration
      const updatedConfig: WebhookConfig = {
        ...existingWebhook,
        ...(url && { url }),
        ...(secret && { secret }),
        ...(events && { events }),
        ...(typeof active === 'boolean' && { active }),
        ...(headers && { headers })
      };

      webhookSystem.registerWebhook(id, updatedConfig);

      const webhook = {
        id,
        ...updatedConfig,
        secret: '***', // Hide secret
        updatedAt: new Date().toISOString(),
        updatedBy: ctx.state.user?.id || 'system'
      };

      ctx.body = { data: webhook };
    } catch (error) {
      if (error.status) throw error;
      ctx.throw(500, 'Failed to update webhook');
    }
  },

  /**
   * Delete webhook
   * DELETE /api/webhooks/:id
   */
  async delete(ctx: Context) {
    try {
      const { id } = ctx.params;

      const success = webhookSystem.unregisterWebhook(id);
      
      if (!success) {
        ctx.throw(404, 'Webhook not found');
      }

      ctx.status = 204;
    } catch (error) {
      if (error.status) throw error;
      ctx.throw(500, 'Failed to delete webhook');
    }
  },

  /**
   * Get webhook statistics
   * GET /api/webhooks/stats
   */
  async getStats(ctx: Context) {
    try {
      const stats = webhookSystem.getStats();
      
      ctx.body = {
        data: {
          ...stats,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      ctx.throw(500, 'Failed to retrieve webhook statistics');
    }
  },

  /**
   * Get delivery history for a webhook
   * GET /api/webhooks/:id/deliveries
   */
  async getDeliveries(ctx: Context) {
    try {
      const { id } = ctx.params;
      const { limit = 50, status, event } = ctx.query;

      let deliveries = webhookSystem.getDeliveryHistory(id, parseInt(limit as string));

      // Filter by status if provided
      if (status) {
        deliveries = deliveries.filter(d => d.status === status);
      }

      // Filter by event if provided
      if (event) {
        deliveries = deliveries.filter(d => d.event === event);
      }

      // Calculate stats for this webhook
      const stats = {
        total: deliveries.length,
        successful: deliveries.filter(d => d.status === 'success').length,
        failed: deliveries.filter(d => d.status === 'failed').length,
        pending: deliveries.filter(d => d.status === 'pending').length,
        retrying: deliveries.filter(d => d.status === 'retrying').length
      };

      ctx.body = {
        data: deliveries,
        meta: {
          stats,
          pagination: {
            limit: parseInt(limit as string),
            total: deliveries.length
          }
        }
      };
    } catch (error) {
      ctx.throw(500, 'Failed to retrieve webhook deliveries');
    }
  },

  /**
   * Retry failed delivery
   * POST /api/webhooks/deliveries/:deliveryId/retry
   */
  async retryDelivery(ctx: Context) {
    try {
      const { deliveryId } = ctx.params;

      // Get delivery
      const delivery = (webhookSystem as any).deliveries.get(deliveryId);
      if (!delivery) {
        ctx.throw(404, 'Delivery not found');
      }

      if (delivery.status === 'success') {
        ctx.throw(400, 'Cannot retry successful delivery');
      }

      // Reset delivery for retry
      delivery.status = 'retrying';
      delivery.nextRetryAt = Date.now();

      // Add to retry queue if not already there
      const retryQueue = (webhookSystem as any).retryQueue;
      if (!retryQueue.includes(deliveryId)) {
        retryQueue.push(deliveryId);
      }

      ctx.body = {
        data: {
          deliveryId,
          status: 'scheduled_for_retry',
          scheduledAt: new Date().toISOString()
        }
      };
    } catch (error) {
      if (error.status) throw error;
      ctx.throw(500, 'Failed to retry delivery');
    }
  },

  /**
   * Test webhook endpoint
   * POST /api/webhooks/:id/test
   */
  async testWebhook(ctx: Context) {
    try {
      const { id } = ctx.params;
      const { event = 'webhook.test' } = ctx.request.body;

      // Check if webhook exists
      const webhook = (webhookSystem as any).webhooks.get(id);
      if (!webhook) {
        ctx.throw(404, 'Webhook not found');
      }

      if (!webhook.active) {
        ctx.throw(400, 'Webhook is not active');
      }

      // Send test event
      const testData = {
        test: true,
        timestamp: new Date().toISOString(),
        message: 'This is a test webhook delivery',
        webhookId: id
      };

      await webhookSystem.sendEvent(event, testData, {
        userId: ctx.state.user?.id,
        source: 'webhook_test'
      });

      ctx.body = {
        data: {
          status: 'sent',
          event,
          webhookId: id,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      if (error.status) throw error;
      ctx.throw(500, 'Failed to test webhook');
    }
  },

  /**
   * Get recent deliveries across all webhooks
   * GET /api/webhooks/recent-deliveries
   */
  async getRecentDeliveries(ctx: Context) {
    try {
      const { limit = 100 } = ctx.query;

      const deliveries = webhookSystem.getRecentDeliveries(parseInt(limit as string));

      // Group by status for quick overview
      const statusCounts = deliveries.reduce((acc, delivery) => {
        acc[delivery.status] = (acc[delivery.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      ctx.body = {
        data: deliveries,
        meta: {
          total: deliveries.length,
          statusCounts,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      ctx.throw(500, 'Failed to retrieve recent deliveries');
    }
  },

  /**
   * Get available webhook events
   * GET /api/webhooks/events
   */
  async getAvailableEvents(ctx: Context) {
    try {
      const { WebhookEvents } = await import('../../../utils/webhook-system');
      
      const events = Object.entries(WebhookEvents).map(([key, value]) => ({
        key,
        value,
        description: this.getEventDescription(value),
        category: this.getEventCategory(value)
      }));

      // Group by category
      const categorized = events.reduce((acc, event) => {
        if (!acc[event.category]) {
          acc[event.category] = [];
        }
        acc[event.category].push(event);
        return acc;
      }, {} as Record<string, any[]>);

      ctx.body = {
        data: {
          events,
          categorized,
          total: events.length
        }
      };
    } catch (error) {
      ctx.throw(500, 'Failed to retrieve webhook events');
    }
  },

  /**
   * Helper methods
   */
  isValidUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  },

  getEventDescription(event: string): string {
    const descriptions: Record<string, string> = {
      'order.created': 'Triggered when a new order is created',
      'order.updated': 'Triggered when an order is updated',
      'order.completed': 'Triggered when an order is completed',
      'order.cancelled': 'Triggered when an order is cancelled',
      'payment.succeeded': 'Triggered when a payment is successful',
      'payment.failed': 'Triggered when a payment fails',
      'payment.refunded': 'Triggered when a payment is refunded',
      'inventory.stock_low': 'Triggered when inventory is running low',
      'inventory.stock_out': 'Triggered when inventory is out of stock',
      'inventory.updated': 'Triggered when inventory is updated',
      'user.registered': 'Triggered when a new user registers',
      'user.updated': 'Triggered when user profile is updated',
      'product.created': 'Triggered when a new product is created',
      'product.updated': 'Triggered when a product is updated',
      'product.deleted': 'Triggered when a product is deleted'
    };

    return descriptions[event] || 'Custom webhook event';
  },

  getEventCategory(event: string): string {
    if (event.startsWith('order.')) return 'orders';
    if (event.startsWith('payment.')) return 'payments';
    if (event.startsWith('inventory.')) return 'inventory';
    if (event.startsWith('user.')) return 'users';
    if (event.startsWith('product.')) return 'products';
    return 'other';
  }
};