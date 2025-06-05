/**
 * Content History Routes
 */

export default {
  routes: [
    {
      method: 'GET',
      path: '/content-history/:contentType/:documentId',
      handler: 'content-history.getHistory',
      config: {
        auth: false, // Set to true in production
        policies: [],
        middlewares: [],
        description: 'Get version history for a document'
      }
    },
    {
      method: 'GET',
      path: '/content-history/:contentType/:documentId/versions/:version',
      handler: 'content-history.getVersion',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
        description: 'Get specific version of a document'
      }
    },
    {
      method: 'GET',
      path: '/content-history/:contentType/:documentId/compare/:fromVersion/:toVersion',
      handler: 'content-history.compareVersions',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
        description: 'Compare two versions of a document'
      }
    },
    {
      method: 'POST',
      path: '/content-history/:contentType/:documentId/restore/:version',
      handler: 'content-history.restoreVersion',
      config: {
        auth: false, // Set to true in production
        policies: [],
        middlewares: [],
        description: 'Restore document to specific version'
      }
    },
    {
      method: 'GET',
      path: '/content-history/:contentType/:documentId/timeline',
      handler: 'content-history.getTimeline',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
        description: 'Get activity timeline for a document'
      }
    },
    {
      method: 'GET',
      path: '/content-history/search',
      handler: 'content-history.searchVersions',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
        description: 'Search versions across all content'
      }
    },
    {
      method: 'GET',
      path: '/content-history/stats',
      handler: 'content-history.getStats',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
        description: 'Get content history statistics'
      }
    },
    {
      method: 'GET',
      path: '/content-history/export',
      handler: 'content-history.exportHistory',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
        description: 'Export content history data'
      }
    }
  ]
};