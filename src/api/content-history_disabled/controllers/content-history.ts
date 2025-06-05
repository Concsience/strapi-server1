/**
 * Content History API Controller
 * Provides endpoints for accessing and managing content version history
 */

import { Context } from 'koa';
// import { contentHistory } from '../../../extensions/content-history/service'; // DISABLED - extensions disabled for debugging

export default {
  /**
   * Get version history for a specific document
   * GET /api/content-history/:contentType/:documentId
   */
  async getHistory(ctx: Context) {
    ctx.throw(503, 'Content history service is disabled for debugging - extensions disabled');
  },

  async getVersion(ctx: Context) {
    ctx.throw(503, 'Content history service is disabled for debugging - extensions disabled');
  },

  async compareVersions(ctx: Context) {
    ctx.throw(503, 'Content history service is disabled for debugging - extensions disabled');
  },

  async restoreVersion(ctx: Context) {
    ctx.throw(503, 'Content history service is disabled for debugging - extensions disabled');
  },

  async searchVersions(ctx: Context) {
    ctx.throw(503, 'Content history service is disabled for debugging - extensions disabled');
  },

  async getStats(ctx: Context) {
    ctx.throw(503, 'Content history service is disabled for debugging - extensions disabled');
  },

  async getTimeline(ctx: Context) {
    ctx.throw(503, 'Content history service is disabled for debugging - extensions disabled');
  },

  async exportHistory(ctx: Context) {
    ctx.throw(503, 'Content history service is disabled for debugging - extensions disabled');
  }
};