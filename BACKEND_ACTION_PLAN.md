# 🎯 PLAN D'ACTION BACKEND STRAPI - ARTEDUSA

## 📊 État Actuel du Projet

### ✅ Points Positifs
- **Strapi 5.14.0** : Dernière version stable installée
- **PostgreSQL** : Base de données configurée avec optimisations de pool
- **Middlewares de Performance** : Redis cache, compression, rate limiting
- **Structure E-commerce** : Relations cart/order correctement modélisées
- **TypeScript** : Partiellement intégré avec configuration de base
- **Sécurité de Base** : Headers CSP, CORS, protection XSS configurés

### ⚠️ Points d'Attention
- **Migration TypeScript Incomplète** : Mélange de fichiers JS/TS
- **Secrets Exposés** : .env dans le repository avec credentials sensibles
- **Documentation Strapi 5** : Manque de documentation sur nouvelles features
- **Optimisations Manquantes** : Indexes DB non appliqués, monitoring absent

## 🚨 ACTIONS PRIORITAIRES (24-48h)

### 1. 🔐 Sécurité Critique - URGENT
```bash
# Rotation immédiate des secrets
npm run env:generate  # Générer nouveaux secrets

# À faire manuellement :
- Changer mot de passe DB PostgreSQL (strapi123 → fort)
- Régénérer clés Stripe (obtenir nouvelles clés test)
- Nouvelles credentials OVH S3
- Supprimer .env du git et ajouter au .gitignore
```

### 2. 🗄️ Optimisation Base de Données
```bash
# Appliquer les indexes e-commerce
npm run db:indexes

# Vérifier la santé de la DB
npm run strapi console
> await strapi.db.connection.raw('SELECT * FROM pg_stat_user_indexes')
```

### 3. 🔍 Monitoring et Santé
```bash
# Tester l'endpoint de santé
curl http://localhost:1337/api/health

# Vérifier les logs d'erreur
pm2 logs strapi-server --lines 100 --err
```

## 📋 PLAN DE MIGRATION TYPESCRIPT (1 semaine)

### Phase 1 : Configuration Stricte
```typescript
// tsconfig.json - Activer progressivement
{
  "compilerOptions": {
    "strict": true,              // Activer après migration
    "noImplicitAny": true,       // Phase 1
    "strictNullChecks": true,    // Phase 2
    "strictFunctionTypes": true, // Phase 3
  }
}
```

### Phase 2 : Migration par Module
1. **API Core** (Priorité haute)
   - `/api/cart` → TypeScript complet
   - `/api/order` → TypeScript complet
   - `/api/stripe` → TypeScript avec types Stripe

2. **Services Métier** (Priorité moyenne)
   - `/api/artists-work` → Types pour calculs prix
   - `/api/artist` → Types pour relations
   
3. **Utilitaires** (Priorité basse)
   - Middlewares custom → Types Strapi 5
   - Scripts de migration → Types Node.js

### Phase 3 : Types Strapi 5
```typescript
// src/types/strapi-documents.d.ts
import { UID, Data } from '@strapi/strapi';

// Types pour Document Service
type CartDocument = Data.ContentType<'api::cart.cart'>;
type OrderDocument = Data.ContentType<'api::order.order'>;

// Services typés
interface CartService {
  addToCart(userId: string, productId: string, quantity: number): Promise<CartDocument>;
  calculateTotal(cartId: string): Promise<number>;
}
```

## 🚀 OPTIMISATIONS PERFORMANCE (2 semaines)

### 1. Caching Avancé
```javascript
// config/middlewares.js - Améliorer le cache Redis
{
  name: 'global::apiCache',
  config: {
    enabled: true,
    redis: {
      // Utiliser Redis cluster en production
      cluster: process.env.REDIS_CLUSTER_NODES?.split(','),
      password: process.env.REDIS_PASSWORD,
    },
    strategies: {
      'api::artists-work': {
        ttl: 3600,
        tags: ['artwork', 'catalog'],
        invalidateOn: ['create', 'update', 'delete']
      }
    }
  }
}
```

### 2. Database Queries
```sql
-- Créer vues matérialisées pour queries complexes
CREATE MATERIALIZED VIEW artist_stats AS
SELECT 
  a.id,
  a.name,
  COUNT(aw.id) as total_works,
  AVG(aw.base_price_per_cm_square) as avg_price
FROM artists a
LEFT JOIN artists_works aw ON a.id = aw.artist_id
GROUP BY a.id, a.name;

-- Refresh périodique
CREATE INDEX idx_artist_stats_name ON artist_stats(name);
```

### 3. Image Optimization
```javascript
// Middleware pour optimisation images OVH
module.exports = {
  async uploadOptimized(file) {
    // Redimensionner avec Sharp
    const optimized = await sharp(file.buffer)
      .resize(2000, 2000, { 
        fit: 'inside',
        withoutEnlargement: true 
      })
      .jpeg({ quality: 85, progressive: true })
      .toBuffer();
    
    // Upload vers OVH avec metadata
    return await s3.upload({
      Bucket: process.env.OVH_BUCKET,
      Key: `optimized/${file.name}`,
      Body: optimized,
      ContentType: 'image/jpeg',
      CacheControl: 'public, max-age=31536000'
    });
  }
};
```

## 🔧 INTÉGRATION STRAPI 5 FEATURES

### 1. Content History
```javascript
// Activer l'historique pour les contenus critiques
// config/plugins.js
module.exports = {
  'content-history': {
    enabled: true,
    config: {
      contentTypes: [
        'api::order.order',
        'api::artists-work.artists-work'
      ],
      retentionDays: 90
    }
  }
};
```

### 2. Preview Feature
```javascript
// API pour preview frontend
module.exports = {
  async preview(ctx) {
    const { documentId } = ctx.params;
    
    // Récupérer le draft
    const draft = await strapi.documents('api::artists-work.artists-work').findOne({
      documentId,
      status: 'draft',
      populate: '*'
    });
    
    // Générer URL de preview
    const previewUrl = `${process.env.FRONTEND_URL}/preview?secret=${process.env.PREVIEW_SECRET}&id=${documentId}`;
    
    ctx.body = { previewUrl, draft };
  }
};
```

### 3. Document Service Migration
```javascript
// Migrer de Entity Service vers Document Service
// ❌ Ancien
const cart = await strapi.entityService.findOne('api::cart.cart', cartId);

// ✅ Nouveau
const cart = await strapi.documents('api::cart.cart').findOne({
  documentId: cartId,
  populate: ['cart_items', 'user']
});
```

## 📊 MONITORING ET MÉTRIQUES

### 1. Health Checks Avancés
```javascript
// src/api/health/controllers/health.js
module.exports = {
  async detailed(ctx) {
    const checks = {
      database: await checkDatabase(),
      redis: await checkRedis(),
      s3: await checkS3(),
      stripe: await checkStripe(),
      memory: process.memoryUsage(),
      uptime: process.uptime()
    };
    
    const healthy = Object.values(checks).every(c => c.status === 'ok');
    ctx.status = healthy ? 200 : 503;
    ctx.body = { status: healthy ? 'healthy' : 'degraded', checks };
  }
};
```

### 2. Performance Monitoring
```javascript
// Intégrer APM (Application Performance Monitoring)
// config/plugins.js
module.exports = {
  sentry: {
    enabled: true,
    config: {
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV,
      integrations: [
        new Sentry.Integrations.Http({ tracing: true }),
        new ProfilingIntegration()
      ],
      tracesSampleRate: 0.1,
      profilesSampleRate: 0.1
    }
  }
};
```

## 🔄 WORKFLOW DE DÉPLOIEMENT

### 1. Pre-Production Checklist
```bash
# Validation complète avant déploiement
npm run production:check

# Tests automatisés
npm run test:api
npm run test:integration

# Analyse de sécurité
npm audit --production
```

### 2. Déploiement Progressif
```yaml
# .github/workflows/deploy.yml
stages:
  - build: npm run build:production
  - test: npm run test:ci
  - security: npm audit
  - deploy-staging: pm2 deploy staging
  - smoke-tests: npm run test:staging
  - deploy-production: pm2 deploy production
```

## 📅 TIMELINE RÉCAPITULATIF

### Semaine 1
- ✅ Sécuriser tous les secrets
- ✅ Appliquer indexes DB
- ✅ Commencer migration TypeScript (controllers prioritaires)
- ✅ Configurer monitoring de base

### Semaine 2
- 🔄 Finir migration TypeScript
- 🔄 Implémenter Content History
- 🔄 Optimiser queries avec vues matérialisées
- 🔄 Tests de charge

### Semaine 3
- 🎯 Intégrer Preview feature
- 🎯 Migration complète vers Document Service
- 🎯 Documentation API complète
- 🎯 Déploiement staging

### Semaine 4
- 🚀 Tests de performance finaux
- 🚀 Formation équipe sur nouvelles features
- 🚀 Go-live production
- 🚀 Monitoring post-déploiement

## 🛡️ MAINTENANCE CONTINUE

1. **Sécurité** : Audit mensuel des dépendances
2. **Performance** : Review hebdomadaire des métriques
3. **Updates** : Strapi patch updates mensuels
4. **Backups** : Automatisés quotidiens (DB + uploads)

---

**Note** : Ce plan est évolutif et doit être adapté selon les retours d'expérience et les priorités business. Chaque phase doit être validée avant de passer à la suivante.