# 🚀 Strapi 5 - Guide des Nouvelles Fonctionnalités

## 📋 Table des Matières
1. [Content History](#content-history)
2. [Preview Feature](#preview-feature)
3. [Document Service API](#document-service-api)
4. [Draft & Publish Rework](#draft--publish-rework)
5. [TypeScript Support](#typescript-support)
6. [Performance Improvements](#performance-improvements)
7. [Plugin SDK](#plugin-sdk)
8. [Security Enhancements](#security-enhancements)

## 📚 Content History

### Vue d'ensemble
La fonctionnalité **Content History** permet de visualiser et restaurer les versions précédentes du contenu directement depuis l'admin panel.

### Configuration
```javascript
// config/plugins.js
module.exports = {
  'content-history': {
    enabled: true,
    config: {
      // Content types à surveiller
      contentTypes: [
        'api::order.order',
        'api::artists-work.artists-work',
        'api::cart.cart'
      ],
      // Durée de rétention (jours)
      retentionDays: 90,
      // Exclure certains champs
      excludeFields: ['password', 'token'],
      // Activer pour les utilisateurs
      includeUserChanges: true
    }
  }
};
```

### Utilisation Pratique pour E-commerce
```javascript
// Service pour récupérer l'historique d'une commande
module.exports = {
  async getOrderHistory(orderId) {
    // Récupérer l'historique via l'API Strapi
    const history = await strapi.documents('api::order.order').findHistory({
      documentId: orderId,
      limit: 20
    });
    
    return history.map(version => ({
      version: version.version,
      timestamp: version.createdAt,
      changes: version.changes,
      author: version.createdBy,
      status: version.data.status
    }));
  },

  async restoreOrderVersion(orderId, versionId) {
    return await strapi.documents('api::order.order').restoreVersion({
      documentId: orderId,
      versionId: versionId
    });
  }
};
```

### Interface Admin
- **Timeline visuelle** des modifications
- **Diff viewer** pour comparer les versions
- **Restauration en un clic**
- **Filtrage par auteur/date**

## 👁️ Preview Feature

### Configuration
```javascript
// config/plugins.js
module.exports = {
  preview: {
    enabled: true,
    config: {
      // URL de votre frontend
      frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
      // Secret pour sécuriser les previews
      secret: process.env.PREVIEW_SECRET,
      // Content types avec preview
      contentTypes: {
        'api::artists-work.artists-work': {
          path: '/artwork/[documentId]',
          draftPath: '/preview/artwork/[documentId]'
        },
        'api::artist.artist': {
          path: '/artist/[slug]',
          draftPath: '/preview/artist/[slug]'
        }
      }
    }
  }
};
```

### Implémentation Frontend (Next.js)
```typescript
// pages/api/preview.ts
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { secret, documentId, contentType } = req.query;

  // Vérifier le secret
  if (secret !== process.env.PREVIEW_SECRET) {
    return res.status(401).json({ message: 'Invalid token' });
  }

  // Récupérer le contenu draft depuis Strapi
  const response = await fetch(`${process.env.STRAPI_URL}/api/${contentType}/${documentId}?status=draft`, {
    headers: {
      'Authorization': `Bearer ${process.env.STRAPI_TOKEN}`,
      'Strapi-Response-Format': 'v5'
    }
  });

  if (!response.ok) {
    return res.status(404).json({ message: 'Content not found' });
  }

  // Activer le mode preview
  res.setPreviewData({
    documentId,
    contentType
  });

  // Rediriger vers la page de preview
  const redirectPath = contentType === 'artists-work' 
    ? `/preview/artwork/${documentId}`
    : `/preview/${contentType}/${documentId}`;

  res.redirect(redirectPath);
}
```

### Controller Preview Personnalisé
```typescript
// src/api/artists-work/controllers/preview.ts
export default {
  async generatePreview(ctx) {
    const { documentId } = ctx.params;
    
    // Récupérer le draft
    const artwork = await strapi.documents('api::artists-work.artists-work').findOne({
      documentId,
      status: 'draft',
      populate: ['artist', 'images', 'categories']
    });

    if (!artwork) {
      return ctx.notFound('Artwork draft not found');
    }

    // Générer l'URL de preview sécurisée
    const previewUrl = `${process.env.FRONTEND_URL}/api/preview?` +
      `secret=${process.env.PREVIEW_SECRET}&` +
      `documentId=${documentId}&` +
      `contentType=artists-work`;

    ctx.body = {
      previewUrl,
      artwork: {
        ...artwork,
        isPreview: true
      }
    };
  }
};
```

## 📄 Document Service API Avancé

### Patterns de Population Optimisés
```typescript
// Population sélective pour performance
const artworks = await strapi.documents('api::artists-work.artists-work').findMany({
  populate: {
    artist: {
      fields: ['name', 'slug', 'bio'],
      populate: {
        avatar: {
          fields: ['url', 'alternativeText']
        }
      }
    },
    images: {
      fields: ['url', 'width', 'height', 'alternativeText'],
      filters: {
        // Seulement les images approuvées
        status: 'approved'
      }
    },
    categories: {
      fields: ['name', 'slug']
    }
  },
  filters: {
    // Filtres complexes
    $and: [
      {
        publishedAt: { $notNull: true }
      },
      {
        $or: [
          { featured: true },
          { 
            artist: {
              tier: { $in: ['premium', 'gold'] }
            }
          }
        ]
      }
    ]
  },
  sort: [
    { featured: 'desc' },
    { publishedAt: 'desc' }
  ]
});
```

### Transactions avec Document Service
```typescript
// Transaction sécurisée pour commande
async function processOrder(orderData) {
  const transaction = await strapi.db.transaction(async (trx) => {
    // 1. Créer la commande
    const order = await strapi.documents('api::order.order').create({
      data: orderData,
      status: 'draft'
    }, { transaction: trx });

    // 2. Créer les items de commande
    for (const item of orderData.items) {
      await strapi.documents('api::ordered-item.ordered-item').create({
        data: {
          order: { connect: [order.documentId] },
          art: { connect: [item.artId] },
          quantity: item.quantity,
          price: item.price
        }
      }, { transaction: trx });
      
      // 3. Décrémenter le stock
      const artwork = await strapi.documents('api::artists-work.artists-work').findOne({
        documentId: item.artId
      });
      
      if (artwork.stock < item.quantity) {
        throw new Error(`Insufficient stock for ${artwork.name}`);
      }
      
      await strapi.documents('api::artists-work.artists-work').update({
        documentId: item.artId,
        data: {
          stock: artwork.stock - item.quantity
        }
      }, { transaction: trx });
    }

    return order;
  });

  return transaction;
}
```

## 📝 Draft & Publish Rework

### Workflow Amélioré
```typescript
// Service de publication avec workflow
module.exports = {
  async publishWithValidation(documentId, contentType) {
    // 1. Récupérer le draft
    const draft = await strapi.documents(contentType).findOne({
      documentId,
      status: 'draft'
    });

    // 2. Validation métier
    const validation = await this.validateForPublication(draft, contentType);
    if (!validation.isValid) {
      throw new Error(`Cannot publish: ${validation.errors.join(', ')}`);
    }

    // 3. Publication
    const published = await strapi.documents(contentType).publish({
      documentId
    });

    // 4. Notifier les services externes
    await this.notifyPublication(published, contentType);

    return published;
  },

  async validateForPublication(content, contentType) {
    const validation = { isValid: true, errors: [] };

    switch (contentType) {
      case 'api::artists-work.artists-work':
        if (!content.name) validation.errors.push('Name is required');
        if (!content.artist) validation.errors.push('Artist is required');
        if (!content.images?.length) validation.errors.push('At least one image is required');
        if (content.base_price_per_cm_square <= 0) validation.errors.push('Price must be positive');
        break;
        
      case 'api::order.order':
        if (!content.user) validation.errors.push('User is required');
        if (!content.ordered_items?.length) validation.errors.push('Order must have items');
        if (content.total_price <= 0) validation.errors.push('Total must be positive');
        break;
    }

    validation.isValid = validation.errors.length === 0;
    return validation;
  }
};
```

### Interface Admin Personnalisée
```javascript
// admin/src/pages/CustomPublish/index.js
import React, { useState } from 'react';
import { Button, Flex, Typography } from '@strapi/design-system';

const CustomPublishPage = () => {
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(false);

  const publishBulk = async (documentIds) => {
    setLoading(true);
    try {
      const promises = documentIds.map(id => 
        fetch(`/api/custom-publish/${id}`, { method: 'POST' })
      );
      await Promise.all(promises);
      // Refresh list
      fetchDrafts();
    } catch (error) {
      console.error('Bulk publish failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Flex direction="column" gap={4}>
      <Typography variant="alpha">Publish Management</Typography>
      
      {drafts.map(draft => (
        <DraftItem 
          key={draft.documentId}
          draft={draft}
          onPublish={publishBulk}
        />
      ))}
      
      <Button 
        onClick={() => publishBulk(drafts.map(d => d.documentId))}
        loading={loading}
      >
        Publish All
      </Button>
    </Flex>
  );
};
```

## 🔧 TypeScript Support Avancé

### Types Générés Automatiquement
```typescript
// Types auto-générés par Strapi 5
import type { Common, Schema } from '@strapi/strapi';

// Type pour le content-type artists-work
export interface ArtistsWork extends Common.Document {
  name: string;
  artist?: Artist;
  original_width: number;
  original_height: number;
  base_price_per_cm_square: number;
  images?: Media[];
  description?: string;
  categories?: Category[];
  stock: number;
  featured: boolean;
}

// Service typé
interface ArtistsWorkService {
  calculatePrice(width: number, height: number): number;
  checkStock(documentId: string, quantity: number): Promise<boolean>;
  updateStock(documentId: string, quantity: number): Promise<ArtistsWork>;
}

export default factories.createCoreService<'api::artists-work.artists-work', ArtistsWorkService>(
  'api::artists-work.artists-work',
  ({ strapi }) => ({
    async calculatePrice(width: number, height: number): number {
      const basePrice = width * height * 0.05; // 5 centimes par cm²
      return Math.round(basePrice * 100) / 100;
    },

    async checkStock(documentId: string, quantity: number): Promise<boolean> {
      const artwork = await strapi.documents<ArtistsWork>('api::artists-work.artists-work').findOne({
        documentId
      });
      
      return artwork ? artwork.stock >= quantity : false;
    }
  })
);
```

### Middleware Typé
```typescript
// src/middlewares/typed-auth.ts
import { Context } from 'koa';

interface AuthenticatedUser {
  id: string;
  email: string;
  username?: string;
  role: {
    id: string;
    name: string;
    type: string;
  };
}

interface TypedContext extends Context {
  state: Context['state'] & {
    user?: AuthenticatedUser;
    isAuthenticated: boolean;
  };
}

export const enhancedAuth = async (ctx: TypedContext, next: () => Promise<void>) => {
  // Vérifier l'authentification
  if (ctx.state.user) {
    ctx.state.isAuthenticated = true;
    
    // Enrichir avec des infos utilisateur
    const user = await strapi.documents('plugin::users-permissions.user').findOne({
      documentId: ctx.state.user.id,
      populate: ['role', 'profile']
    });
    
    ctx.state.user = {
      ...ctx.state.user,
      ...user
    };
  } else {
    ctx.state.isAuthenticated = false;
  }

  await next();
};
```

## 🚀 Performance Improvements

### Cache Intelligent
```typescript
// Service de cache avancé
class IntelligentCache {
  private redis: any;
  private tags: Map<string, Set<string>>;

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL);
    this.tags = new Map();
  }

  async set(key: string, value: any, ttl: number = 3600, tags: string[] = []) {
    // Stocker la valeur
    await this.redis.setex(key, ttl, JSON.stringify(value));
    
    // Indexer par tags
    tags.forEach(tag => {
      if (!this.tags.has(tag)) {
        this.tags.set(tag, new Set());
      }
      this.tags.get(tag)!.add(key);
    });
  }

  async invalidateByTag(tag: string) {
    const keys = this.tags.get(tag);
    if (keys) {
      const pipeline = this.redis.pipeline();
      keys.forEach(key => pipeline.del(key));
      await pipeline.exec();
      this.tags.delete(tag);
    }
  }

  async get<T>(key: string): Promise<T | null> {
    const value = await this.redis.get(key);
    return value ? JSON.parse(value) : null;
  }
}

// Utilisation dans un service
module.exports = {
  async findArtworks(filters = {}) {
    const cacheKey = `artworks:${JSON.stringify(filters)}`;
    
    // Vérifier le cache
    let artworks = await cache.get(cacheKey);
    
    if (!artworks) {
      // Requête base de données
      artworks = await strapi.documents('api::artists-work.artists-work').findMany({
        filters,
        populate: ['artist', 'images']
      });
      
      // Mettre en cache avec tags
      await cache.set(cacheKey, artworks, 3600, ['artworks', 'artists']);
    }
    
    return artworks;
  }
};
```

### Optimisation des Requêtes
```typescript
// Service d'optimisation des requêtes
module.exports = {
  async findArtworksOptimized(params) {
    // Utiliser des vues matérialisées pour les calculs complexes
    const query = strapi.db.connection.raw(`
      SELECT 
        aw.*,
        a.name as artist_name,
        a.slug as artist_slug,
        COUNT(oi.id) as total_sales,
        AVG(oi.price) as avg_sale_price
      FROM artists_works aw
      LEFT JOIN artists a ON aw.artist_id = a.id
      LEFT JOIN ordered_items oi ON aw.id = oi.art_id
      WHERE aw.published_at IS NOT NULL
      ${params.featured ? 'AND aw.featured = true' : ''}
      GROUP BY aw.id, a.id
      ORDER BY total_sales DESC, aw.created_at DESC
      LIMIT ?
      OFFSET ?
    `, [params.limit || 20, params.offset || 0]);

    return await query;
  }
};
```

## 🛠️ Plugin SDK

### Création de Plugin
```bash
# Initialiser un nouveau plugin
npx @strapi/sdk-plugin init my-ecommerce-plugin

# Structure générée
my-ecommerce-plugin/
├── admin/                 # Interface admin
├── server/                # Logique serveur
├── package.json
├── strapi-admin.js       # Config admin
└── strapi-server.js      # Config serveur
```

### Plugin E-commerce Analytics
```typescript
// server/index.ts
export default {
  register({ strapi }) {
    // Enregistrer des services
    strapi.service('plugin::analytics.stats');
  },

  bootstrap({ strapi }) {
    // Hooks pour tracking
    strapi.db.lifecycles.subscribe({
      models: ['api::order.order'],
      async afterCreate(event) {
        await strapi.service('plugin::analytics.stats').trackSale(event.result);
      }
    });
  }
};

// server/services/stats.ts
export default ({ strapi }) => ({
  async trackSale(order) {
    // Calculer métriques
    const metrics = {
      revenue: order.total_price,
      items: order.ordered_items?.length || 0,
      customer: order.user,
      timestamp: new Date()
    };

    // Stocker dans Redis
    await strapi.redis.lpush('sales:daily', JSON.stringify(metrics));
  },

  async getDailyStats(date = new Date()) {
    const key = `stats:${date.toISOString().split('T')[0]}`;
    return await strapi.redis.get(key);
  }
});
```

### Interface Admin du Plugin
```jsx
// admin/src/pages/Analytics/index.jsx
import React, { useState, useEffect } from 'react';
import { Main, Flex, Typography } from '@strapi/design-system';
import { useFetchClient } from '@strapi/helper-plugin';

const AnalyticsPage = () => {
  const [stats, setStats] = useState(null);
  const { get } = useFetchClient();

  useEffect(() => {
    const fetchStats = async () => {
      const { data } = await get('/analytics/dashboard');
      setStats(data);
    };
    
    fetchStats();
  }, []);

  return (
    <Main>
      <Flex direction="column" gap={6}>
        <Typography variant="alpha">E-commerce Analytics</Typography>
        
        {stats && (
          <Flex gap={4}>
            <StatCard title="Revenue Today" value={`€${stats.revenueToday}`} />
            <StatCard title="Orders Today" value={stats.ordersToday} />
            <StatCard title="Conversion Rate" value={`${stats.conversionRate}%`} />
          </Flex>
        )}
      </Flex>
    </Main>
  );
};
```

## 🔒 Security Enhancements

### Rate Limiting Avancé
```typescript
// src/middlewares/advanced-rate-limit.ts
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';

const createRateLimiter = (options) => {
  const limiter = rateLimit({
    windowMs: options.window || 60000,
    max: options.max || 100,
    standardHeaders: true,
    legacyHeaders: false,
    
    // Rate limiting par user/IP
    keyGenerator: (req) => {
      if (req.state?.user?.id) {
        return `user:${req.state.user.id}`;
      }
      return `ip:${req.ip}`;
    },

    // Réponse personnalisée
    handler: (req, res) => {
      res.status(429).json({
        error: 'Too Many Requests',
        message: 'You have exceeded the rate limit',
        retryAfter: Math.round(options.window / 1000)
      });
    }
  });

  const speedLimiter = slowDown({
    windowMs: options.window || 60000,
    delayAfter: Math.floor(options.max * 0.8),
    delayMs: 100
  });

  return [speedLimiter, limiter];
};

// Configuration par endpoint
export const rateLimiters = {
  auth: createRateLimiter({ max: 5, window: 900000 }), // 5 attempts per 15min
  api: createRateLimiter({ max: 100, window: 60000 }),  // 100 requests per min
  upload: createRateLimiter({ max: 10, window: 60000 }) // 10 uploads per min
};
```

### Validation Avancée
```typescript
// src/utils/validation.ts
import Joi from 'joi';

export const schemas = {
  order: Joi.object({
    items: Joi.array().items(
      Joi.object({
        artId: Joi.string().required(),
        quantity: Joi.number().integer().min(1).max(10),
        paperType: Joi.string().optional()
      })
    ).min(1).required(),
    
    shippingAddress: Joi.object({
      street: Joi.string().required(),
      city: Joi.string().required(),
      postalCode: Joi.string().pattern(/^\d{5}$/).required(),
      country: Joi.string().length(2).required()
    }).required(),
    
    paymentMethod: Joi.string().valid('stripe', 'paypal').required()
  }),

  artwork: Joi.object({
    name: Joi.string().min(3).max(100).required(),
    description: Joi.string().max(2000).optional(),
    price: Joi.number().positive().precision(2).required(),
    dimensions: Joi.object({
      width: Joi.number().positive().required(),
      height: Joi.number().positive().required()
    }).required()
  })
};

// Middleware de validation
export const validate = (schema) => async (ctx, next) => {
  try {
    const { error, value } = schema.validate(ctx.request.body);
    
    if (error) {
      ctx.throw(400, 'Validation failed', {
        details: error.details.map(d => ({
          field: d.path.join('.'),
          message: d.message
        }))
      });
    }
    
    ctx.request.body = value;
    await next();
  } catch (err) {
    throw err;
  }
};
```

## 📊 Monitoring et Observabilité

### Metrics Personnalisées
```typescript
// src/services/metrics.ts
import { performance } from 'perf_hooks';

class MetricsCollector {
  private metrics: Map<string, any[]> = new Map();

  recordTiming(name: string, duration: number, tags: Record<string, string> = {}) {
    const metric = {
      name,
      value: duration,
      timestamp: Date.now(),
      tags
    };
    
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    
    this.metrics.get(name)!.push(metric);
  }

  recordCounter(name: string, value: number = 1, tags: Record<string, string> = {}) {
    // Implémenter compteur
  }

  async flush() {
    // Envoyer vers système de monitoring (Prometheus, DataDog, etc.)
    for (const [name, values] of this.metrics.entries()) {
      await this.sendToMonitoring(name, values);
    }
    
    this.metrics.clear();
  }
}

// Middleware de mesure
export const measurePerformance = (name: string) => {
  return async (ctx, next) => {
    const start = performance.now();
    
    try {
      await next();
      
      metrics.recordTiming(name, performance.now() - start, {
        method: ctx.method,
        route: ctx.route?.path || ctx.path,
        status: ctx.status.toString()
      });
    } catch (error) {
      metrics.recordTiming(name, performance.now() - start, {
        method: ctx.method,
        route: ctx.route?.path || ctx.path,
        status: 'error',
        error: error.name
      });
      throw error;
    }
  };
};
```

---

Cette documentation couvre les principales nouvelles fonctionnalités de Strapi 5. Chaque section peut être implémentée progressivement selon vos priorités business.