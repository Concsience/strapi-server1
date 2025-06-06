/**
 * Content History API Controller
 * Provides endpoints for accessing and managing content version history
 */

// Content history service mock (was TypeScript)
const contentHistory = {
  getHistory: () => [],
  getVersion: () => null,
  compareVersions: () => null,
  restoreVersion: () => null,
  createCheckpoint: () => null
};

module.exports = {
  /**
   * Get version history for a specific document
   * GET /api/content-history/:contentType/:documentId
   */
  async getHistory(ctx) {
    try {
      const { contentType, documentId } = ctx.params;
      const { limit = 20, include_data = false } = ctx.query;

      // Validate content type format
      if (!contentType.startsWith('api::')) {
        ctx.throw(400, 'Content type must be in format: api::model.model');
      }

      const history = contentHistory.getHistory(
        contentType,
        documentId,
        parseInt(limit)
      );

      // Optionally exclude data for lighter response
      const response = history.map(version => ({
        id: version.id,
        version: version.version,
        contentType: version.contentType,
        documentId: version.documentId,
        changes: version.changes,
        metadata: version.metadata,
        createdAt: version.createdAt,
        ...(include_data === 'true' && { data: version.data })
      }));

      ctx.body = {
        data: response,
        meta: {
          total: history.length,
          contentType,
          documentId,
          hasMore: history.length === parseInt(limit)
        }
      };
    } catch (error) {
      ctx.throw(500, `Failed to retrieve content history: ${error.message}`);
    }
  },

  /**
   * Get specific version
   * GET /api/content-history/:contentType/:documentId/versions/:version
   */
  async getVersion(ctx) {
    try {
      const { contentType, documentId, version } = ctx.params;

      const versionData = contentHistory.getVersion(
        contentType,
        documentId,
        parseInt(version)
      );

      if (!versionData) {
        ctx.throw(404, `Version ${version} not found`);
      }

      ctx.body = { data: versionData };
    } catch (error) {
      if (error.status) throw error;
      ctx.throw(500, `Failed to retrieve version: ${error.message}`);
    }
  },

  /**
   * Compare two versions
   * GET /api/content-history/:contentType/:documentId/compare/:fromVersion/:toVersion
   */
  async compareVersions(ctx) {
    try {
      const { contentType, documentId, fromVersion, toVersion } = ctx.params;

      const comparison = contentHistory.compareVersions(
        contentType,
        documentId,
        parseInt(fromVersion),
        parseInt(toVersion)
      );

      const fromVersionData = contentHistory.getVersion(contentType, documentId, parseInt(fromVersion));
      const toVersionData = contentHistory.getVersion(contentType, documentId, parseInt(toVersion));

      ctx.body = {
        data: {
          comparison,
          fromVersion: {
            version: parseInt(fromVersion),
            createdAt: fromVersionData?.createdAt,
            metadata: fromVersionData?.metadata
          },
          toVersion: {
            version: parseInt(toVersion),
            createdAt: toVersionData?.createdAt,
            metadata: toVersionData?.metadata
          },
          changesCount: comparison.length
        }
      };
    } catch (error) {
      if (error.status) throw error;
      ctx.throw(500, `Failed to compare versions: ${error.message}`);
    }
  },

  /**
   * Restore document to specific version
   * POST /api/content-history/:contentType/:documentId/restore/:version
   */
  async restoreVersion(ctx) {
    try {
      const { contentType, documentId, version } = ctx.params;
      const { confirm = false } = ctx.request.body;

      // Require explicit confirmation for restoration
      if (!confirm) {
        ctx.throw(400, 'Restoration requires explicit confirmation');
      }

      // Check permissions (in production, add proper authorization)
      if (!ctx.state.user || !ctx.state.user.role) {
        ctx.throw(401, 'Authentication required for content restoration');
      }

      const context = {
        user: ctx.state.user,
        ip: ctx.ip,
        userAgent: ctx.get('User-Agent'),
        source: 'admin_restore'
      };

      const restoredData = await contentHistory.restoreVersion(
        contentType,
        documentId,
        parseInt(version),
        context
      );

      ctx.body = {
        data: {
          restored: true,
          version: parseInt(version),
          documentId,
          contentType,
          restoredAt: new Date().toISOString(),
          restoredBy: ctx.state.user.id,
          restoredData
        }
      };
    } catch (error) {
      if (error.status) throw error;
      ctx.throw(500, `Failed to restore version: ${error.message}`);
    }
  },

  /**
   * Search versions across all content
   * GET /api/content-history/search
   */
  async searchVersions(ctx) {
    try {
      const {
        contentType,
        userId,
        dateFrom,
        dateTo,
        hasChanges,
        limit = 50
      } = ctx.query;

      const criteria = {};
      
      if (contentType) criteria.contentType = contentType;
      if (userId) criteria.userId = userId;
      if (dateFrom) criteria.dateFrom = new Date(dateFrom);
      if (dateTo) criteria.dateTo = new Date(dateTo);
      if (hasChanges) criteria.hasChanges = hasChanges === 'true';

      const results = contentHistory.searchVersions(criteria);
      const limitedResults = results.slice(0, parseInt(limit));

      // Group by content type for better overview
      const groupedResults = limitedResults.reduce((acc, version) => {
        if (!acc[version.contentType]) {
          acc[version.contentType] = [];
        }
        acc[version.contentType].push({
          id: version.id,
          documentId: version.documentId,
          version: version.version,
          changes: version.changes,
          metadata: version.metadata,
          createdAt: version.createdAt
        });
        return acc;
      }, {});

      ctx.body = {
        data: limitedResults.map(v => ({
          id: v.id,
          contentType: v.contentType,
          documentId: v.documentId,
          version: v.version,
          changes: v.changes,
          metadata: v.metadata,
          createdAt: v.createdAt
        })),
        meta: {
          total: results.length,
          limit: parseInt(limit),
          hasMore: results.length > parseInt(limit),
          groupedByContentType: groupedResults,
          criteria
        }
      };
    } catch (error) {
      ctx.throw(500, `Failed to search versions: ${error.message}`);
    }
  },

  /**
   * Get content history statistics
   * GET /api/content-history/stats
   */
  async getStats(ctx) {
    try {
      const stats = contentHistory.getStats();

      ctx.body = {
        data: {
          ...stats,
          timestamp: new Date().toISOString(),
          config: {
            maxVersions: 50, // From config
            maxAge: '90 days',
            trackedContentTypes: [
              'api::order.order',
              'api::artists-work.artists-work',
              'api::artist.artist',
              'api::cart.cart'
            ]
          }
        }
      };
    } catch (error) {
      ctx.throw(500, `Failed to retrieve statistics: ${error.message}`);
    }
  },

  /**
   * Get activity timeline for a document
   * GET /api/content-history/:contentType/:documentId/timeline
   */
  async getTimeline(ctx) {
    try {
      const { contentType, documentId } = ctx.params;
      const { limit = 20 } = ctx.query;

      const history = contentHistory.getHistory(
        contentType,
        documentId,
        parseInt(limit)
      );

      // Create timeline with activity descriptions
      const timeline = history.map(version => {
        const activity = this.generateActivityDescription(version);
        
        return {
          timestamp: version.createdAt,
          version: version.version,
          activity,
          user: {
            id: version.metadata.userId,
            email: version.metadata.userEmail
          },
          changes: version.changes?.length || 0,
          changesSummary: this.summarizeChanges(version.changes || []),
          source: version.metadata.source
        };
      }).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      ctx.body = {
        data: timeline,
        meta: {
          contentType,
          documentId,
          totalVersions: timeline.length
        }
      };
    } catch (error) {
      ctx.throw(500, `Failed to retrieve timeline: ${error.message}`);
    }
  },

  /**
   * Export content history
   * GET /api/content-history/export
   */
  async exportHistory(ctx) {
    try {
      const { contentType, format = 'json', dateFrom, dateTo } = ctx.query;

      const criteria = {};
      if (contentType) criteria.contentType = contentType;
      if (dateFrom) criteria.dateFrom = new Date(dateFrom);
      if (dateTo) criteria.dateTo = new Date(dateTo);

      const versions = contentHistory.searchVersions(criteria);

      if (format === 'csv') {
        // Export as CSV
        const csvHeaders = 'contentType,documentId,version,createdAt,userId,changesCount,activity\n';
        const csvRows = versions.map(v => {
          const activity = this.generateActivityDescription(v);
          return `${v.contentType},${v.documentId},${v.version},${v.createdAt.toISOString()},${v.metadata.userId || ''},${v.changes?.length || 0},"${activity}"`;
        }).join('\n');

        ctx.set('Content-Type', 'text/csv');
        ctx.set('Content-Disposition', `attachment; filename="content-history-${Date.now()}.csv"`);
        ctx.body = csvHeaders + csvRows;
      } else {
        // Export as JSON
        const exportData = {
          exportInfo: {
            timestamp: new Date().toISOString(),
            criteria,
            totalRecords: versions.length
          },
          versions: versions.map(v => ({
            id: v.id,
            contentType: v.contentType,
            documentId: v.documentId,
            version: v.version,
            changes: v.changes,
            metadata: v.metadata,
            createdAt: v.createdAt,
            activity: this.generateActivityDescription(v)
          }))
        };

        ctx.set('Content-Type', 'application/json');
        ctx.set('Content-Disposition', `attachment; filename="content-history-${Date.now()}.json"`);
        ctx.body = exportData;
      }
    } catch (error) {
      ctx.throw(500, `Failed to export history: ${error.message}`);
    }
  },

  /**
   * Helper methods
   */
  generateActivityDescription(version) {
    if (!version.changes || version.changes.length === 0) {
      return 'Document created';
    }

    const changeTypes = version.changes.reduce((acc, change) => {
      acc[change.type] = (acc[change.type] || 0) + 1;
      return acc;
    }, {});

    const descriptions = [];
    if (changeTypes.created) descriptions.push(`${changeTypes.created} fields added`);
    if (changeTypes.updated) descriptions.push(`${changeTypes.updated} fields updated`);
    if (changeTypes.deleted) descriptions.push(`${changeTypes.deleted} fields removed`);

    return descriptions.join(', ') || 'Changes made';
  },

  summarizeChanges(changes) {
    return changes
      .filter(change => change.type === 'updated')
      .map(change => change.field)
      .slice(0, 5); // Show max 5 changed fields
  }
};