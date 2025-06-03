# 🚀 PLAN D'OPTIMISATION API STRAPI E-COMMERCE

## 📊 RÉSUMÉ EXÉCUTIF

Audit complet révélant des **vulnérabilités critiques de sécurité**, des **problèmes de performance** et des **défauts d'architecture** nécessitant une action immédiate.

### État actuel : 🔴 CRITIQUE
- **Sécurité** : Secrets exposés, pas de protection API
- **Performance** : Pas de base PostgreSQL, relations inefficaces
- **Architecture** : Modèles mal conçus pour e-commerce
- **Infrastructure** : Configuration de développement en production

---

## 🚨 PRIORITÉ 1 : SÉCURITÉ CRITIQUE (24-48h)

### 1.1 Rotation des secrets exposés
```bash
# IMMÉDIAT : Générer nouveaux secrets
node -e "console.log(require('crypto').randomBytes(16).toString('base64'))"
```

**Actions :**
- [ ] Changer TOUS les mots de passe database
- [ ] Régénérer JWT_SECRET et ADMIN_JWT_SECRET
- [ ] Révoquer clés API Stripe actuelles
- [ ] Changer credentials OVH S3
- [ ] Configurer variables environnement sécurisées
- [ ] Ajouter .env à .gitignore

### 1.2 Sécuriser l'API
```javascript
// config/middlewares.js - Configuration sécurisée
module.exports = [
  'strapi::logger',
  'strapi::errors',
  {
    name: 'strapi::security',
    config: {
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          'connect-src': ["'self'", 'https:'],
          'img-src': ["'self'", 'data:', 'blob:', 'storage.ovh.com'],
        },
      },
      hsts: {
        enabled: true,
        maxAge: 31536000,
        includeSubDomains: true,
      }
    },
  },
  {
    name: 'strapi::cors',
    config: {
      origin: process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',') : '*',
      credentials: true
    }
  },
  'strapi::poweredBy',
  'strapi::query',
  {
    name: 'strapi::body',
    config: {
      jsonLimit: '2mb',
      formLimit: '5mb',
    }
  },
  'strapi::session',
  'strapi::favicon',
  'strapi::public',
];
```

### 1.3 Installer protection rate limiting
```bash
npm install koa2-ratelimit
```

```javascript
// config/middlewares.js - Ajouter après security
{
  resolve: './src/middlewares/rateLimit',
  config: {
    interval: { min: 1 },
    max: 100,
    prefixKey: 'strapi:ratelimit',
  }
}
```

---

## 🔥 PRIORITÉ 2 : STABILITÉ SYSTÈME (48-72h)

### 2.1 Migration vers PostgreSQL
```bash
# Installer driver PostgreSQL
npm install pg

# Backup data actuelle
npm run strapi export
```

```javascript
// config/database.js - Configuration production
module.exports = ({ env }) => ({
  connection: {
    client: 'postgres',
    connection: {
      host: env('DATABASE_HOST'),
      port: env.int('DATABASE_PORT'),
      database: env('DATABASE_NAME'),
      user: env('DATABASE_USERNAME'),
      password: env('DATABASE_PASSWORD'),
      ssl: env.bool('DATABASE_SSL', false) && {
        rejectUnauthorized: env.bool('DATABASE_SSL_REJECT_UNAUTHORIZED', true),
      },
    },
    pool: {
      min: env.int('DATABASE_POOL_MIN', 2),
      max: env.int('DATABASE_POOL_MAX', 10),
      acquireTimeoutMillis: env.int('DATABASE_POOL_ACQUIRE', 60000),
      createTimeoutMillis: env.int('DATABASE_POOL_CREATE', 30000),
      idleTimeoutMillis: env.int('DATABASE_POOL_IDLE', 30000),
    },
  },
});
```

### 2.2 Installer dépendances manquantes
```bash
# Installation complète des dépendances
npm install

# Plugins essentiels
npm install @strapi/plugin-sentry
npm install strapi-plugin-redis
npm install @strapi/provider-upload-ovh
```

### 2.3 Configuration monitoring
```javascript
// config/plugins.js
module.exports = ({ env }) => ({
  sentry: {
    enabled: true,
    config: {
      dsn: env('SENTRY_DSN'),
      environment: env('NODE_ENV'),
    },
  },
  redis: {
    config: {
      connections: {
        default: {
          connection: {
            host: env('REDIS_HOST', 'localhost'),
            port: env.int('REDIS_PORT', 6379),
            password: env('REDIS_PASSWORD'),
          },
        },
      },
    },
  },
  upload: {
    config: {
      provider: '@strapi/provider-upload-ovh',
      providerOptions: {
        username: env('OVH_USERNAME'),
        password: env('OVH_PASSWORD'),
        authUrl: env('OVH_AUTH_URL'),
        tenantId: env('OVH_TENANT_ID'),
        region: env('OVH_REGION'),
        containerName: env('OVH_CONTAINER_NAME'),
      },
    },
  },
});
```

---

## ⚡ PRIORITÉ 3 : PERFORMANCE & ARCHITECTURE (1 semaine)

### 3.1 Refactoring modèles e-commerce

#### Cart Item correct
```json
{
  "collectionName": "cart_items",
  "info": {
    "singularName": "cart-item",
    "pluralName": "cart-items",
    "displayName": "Cart Item"
  },
  "attributes": {
    "quantity": {
      "type": "integer",
      "required": true,
      "min": 1,
      "default": 1
    },
    "cart": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "api::cart.cart",
      "inversedBy": "cart_items"
    },
    "artists_work": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "api::artists-work.artists-work"
    },
    "paper_type": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "api::paper-type.paper-type"
    },
    "price": {
      "type": "decimal",
      "required": true
    }
  }
}
```

### 3.2 Optimisation base de données

```sql
-- Index pour requêtes fréquentes
CREATE INDEX idx_cart_items_cart_id ON cart_items(cart_id);
CREATE INDEX idx_ordered_items_order_id ON ordered_items(order_id);
CREATE INDEX idx_artists_works_artist_id ON artists_works(artist_id);
CREATE INDEX idx_orders_user_status ON orders(user_id, status);
CREATE INDEX idx_carts_user_id ON carts(user_id);
```

### 3.3 Middleware de cache

```javascript
// src/middlewares/cache.js
module.exports = (config, { strapi }) => {
  return async (ctx, next) => {
    if (ctx.method !== 'GET') return next();
    
    const key = `cache:${ctx.url}`;
    const cached = await strapi.redis.get(key);
    
    if (cached) {
      ctx.body = JSON.parse(cached);
      return;
    }
    
    await next();
    
    if (ctx.status === 200) {
      await strapi.redis.setex(key, 300, JSON.stringify(ctx.body));
    }
  };
};
```

---

## 🛠️ PRIORITÉ 4 : FONCTIONNALITÉS BUSINESS (2 semaines)

### 4.1 Système de commandes complet

```javascript
// api/order/services/order.js
module.exports = createCoreService('api::order.order', ({ strapi }) => ({
  async create(data) {
    // Validation du stock
    for (const item of data.items) {
      const work = await strapi.entityService.findOne(
        'api::artists-work.artists-work',
        item.artists_work
      );
      if (!work || work.stock < item.quantity) {
        throw new ApplicationError('Stock insuffisant');
      }
    }
    
    // Calcul du total
    const total = await this.calculateTotal(data);
    
    // Création commande
    const order = await super.create({
      data: {
        ...data,
        total,
        status: 'pending',
        order_number: await this.generateOrderNumber(),
      },
    });
    
    // Décrémentation du stock
    for (const item of data.items) {
      await strapi.entityService.update(
        'api::artists-work.artists-work',
        item.artists_work,
        {
          data: {
            stock: { $dec: item.quantity }
          }
        }
      );
    }
    
    // Email de confirmation
    await strapi.plugins.email.services.email.send({
      to: order.user.email,
      subject: 'Confirmation de commande',
      html: await this.generateOrderEmail(order),
    });
    
    return order;
  },
}));
```

### 4.2 Intégration paiement Stripe

```javascript
// api/payment/controllers/payment.js
module.exports = {
  async createPaymentIntent(ctx) {
    const { orderId } = ctx.request.body;
    
    const order = await strapi.entityService.findOne(
      'api::order.order',
      orderId,
      { populate: ['user', 'items'] }
    );
    
    if (!order || order.user.id !== ctx.state.user.id) {
      return ctx.forbidden();
    }
    
    const paymentIntent = await strapi.service('api::payment.payment')
      .createPaymentIntent(order);
    
    return { client_secret: paymentIntent.client_secret };
  },
};
```

---

## 📈 PRIORITÉ 5 : MONITORING & SCALABILITÉ (1 mois)

### 5.1 Health checks
```javascript
// api/health/controllers/health.js
module.exports = {
  async check(ctx) {
    const checks = {
      database: await this.checkDatabase(),
      redis: await this.checkRedis(),
      storage: await this.checkStorage(),
    };
    
    const healthy = Object.values(checks).every(c => c.status === 'ok');
    
    ctx.status = healthy ? 200 : 503;
    ctx.body = { status: healthy ? 'healthy' : 'unhealthy', checks };
  },
};
```

### 5.2 Métriques performance
```javascript
// src/middlewares/metrics.js
module.exports = () => {
  return async (ctx, next) => {
    const start = Date.now();
    
    await next();
    
    const duration = Date.now() - start;
    
    // Log métriques
    strapi.log.info({
      method: ctx.method,
      url: ctx.url,
      status: ctx.status,
      duration,
      user: ctx.state.user?.id,
    });
    
    // Header de performance
    ctx.set('X-Response-Time', `${duration}ms`);
  };
};
```

---

## 📋 CHECKLIST DE DÉPLOIEMENT

### Avant production
- [ ] Tous les secrets rotés et sécurisés
- [ ] PostgreSQL configuré et migré
- [ ] Rate limiting activé
- [ ] CORS configuré pour domaine production
- [ ] SSL/TLS configuré
- [ ] Monitoring Sentry actif
- [ ] Backup database automatisé
- [ ] Tests de charge effectués
- [ ] Documentation API à jour
- [ ] Processus CI/CD configuré

### Configuration production
```env
# .env.production
NODE_ENV=production
DATABASE_CLIENT=postgres
DATABASE_HOST=your-db-host
DATABASE_PORT=5432
DATABASE_NAME=strapi_production
DATABASE_USERNAME=strapi_user
DATABASE_PASSWORD=<strong-password>
DATABASE_SSL=true

JWT_SECRET=<generate-with-crypto>
ADMIN_JWT_SECRET=<generate-with-crypto>
APP_KEYS=<generate-multiple>
API_TOKEN_SALT=<generate-with-crypto>
TRANSFER_TOKEN_SALT=<generate-with-crypto>

FRONTEND_URL=https://your-frontend.com
STRAPI_ADMIN_URL=https://api.your-domain.com/admin

REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=<redis-password>

SENTRY_DSN=your-sentry-dsn

STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

OVH_USERNAME=your-ovh-username
OVH_PASSWORD=your-ovh-password
OVH_TENANT_ID=your-tenant-id
OVH_REGION=your-region
OVH_CONTAINER_NAME=your-container
```

---

## 🎯 RÉSULTATS ATTENDUS

Après implémentation complète :
- **Sécurité** : Score A+ sur SSL Labs, 0 vulnérabilité critique
- **Performance** : Temps de réponse < 200ms (P95)
- **Disponibilité** : 99.9% uptime
- **Scalabilité** : Support 10,000 requêtes/minute
- **Monitoring** : Visibilité complète sur erreurs et performance

## 💡 RECOMMANDATIONS FINALES

1. **Former l'équipe** sur les bonnes pratiques de sécurité
2. **Documenter** toutes les configurations et processus
3. **Automatiser** tests et déploiements
4. **Réviser** régulièrement la sécurité
5. **Planifier** la scalabilité future

**⚠️ URGENT : Commencer par la rotation des secrets et la sécurisation de l'API dans les 24h.**