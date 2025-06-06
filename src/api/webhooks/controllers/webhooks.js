/**
 * Webhooks controller - Basic webhook management for API testing
 */
module.exports = {
  async create(ctx) {
    const webhookData = ctx.request.body;
    
    // Simple mock webhook creation
    const webhook = {
      id: Date.now(),
      url: webhookData.url,
      events: webhookData.events || [],
      active: webhookData.active || true,
      createdAt: new Date().toISOString()
    };

    ctx.body = {
      data: webhook
    };
    ctx.status = 201;
  },

  async find(ctx) {
    // Return empty list for now
    ctx.body = {
      data: []
    };
    ctx.status = 200;
  },

  async test(ctx) {
    const { id } = ctx.params;
    
    ctx.body = {
      message: `Webhook ${id} test successful`,
      timestamp: new Date().toISOString()
    };
    ctx.status = 200;
  },

  async stats(ctx) {
    ctx.body = {
      data: {
        totalWebhooks: 0,
        active: 0,
        failed: 0,
        lastWeek: 0
      }
    };
    ctx.status = 200;
  },

  async delete(ctx) {
    const { id } = ctx.params;
    
    // No response body for 204
    ctx.status = 204;
  }
};