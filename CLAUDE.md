# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🧠 PERFECT STRAPI KNOWLEDGE

**IMPORTANT**: À chaque nouvelle session Claude Code, SUIVRE CET ORDRE OBLIGATOIRE :

### ÉTAPE 1: Lire la base de connaissances Strapi
```bash
# OBLIGATOIRE - Lire immédiatement avant tout travail
cat STRAPI_EXPERT_KNOWLEDGE.md
```

### ÉTAPE 2: Accéder à la mémoire du projet  
```bash
# Récupérer le contexte complet du projet
mcp__memory-backend__read_graph
```

### ÉTAPE 3: Confirmer la connaissance
Après lecture, tu auras la connaissance parfaite de :
- ✅ Architecture Strapi complète (Content-Type Builder, Content Manager, Backend)
- ✅ API layers (REST/GraphQL → Document Service → Query Engine)  
- ✅ Backend customization (Controllers, Services, Routes, Middlewares)
- ✅ E-commerce best practices (relations, field types, performance)
- ✅ Configuration système et optimisations
- ✅ 77 entités de connaissance sur ce projet spécifique

**GARANTIE**: Cette méthode te donnera 95% de la connaissance Strapi experte nécessaire pour travailler efficacement sur ce backend e-commerce.

# CONSCIENCEAPP - BACKEND STRAPI E-COMMERCE API

## Configuration Actuelle

### Environnement
- **Local**: localhost:1337 avec PostgreSQL locale
- **Staging**: staging-strapi.artedusa.com
- **Database**: PostgreSQL strapi_conscience (user: strapi, pass: strapi123)
- **Upload**: OVH S3 bucket image-artedusa
- **Paiement**: Stripe test mode avec webhook configuré
- **CORS**: Frontend localhost:3000

### Stack Technique
- **Strapi**: 4.25.11
- **Database**: PostgreSQL (configuré mais driver manquant)
- **Upload**: OVH S3 pour images produits
- **Paiement**: Stripe API test mode
- **Auth**: JWT avec secrets configurés

## Collections E-commerce

### Produits & Catalogue
- `artists-work` - Œuvres d'art principales
- `artist` - Artistes et leurs informations
- `paper-type` - Types de papier pour impressions
- `productsheet1` - Fiches produits détaillées

### Commerce
- `cart` / `cart-item` - Panier utilisateur (relations à optimiser)
- `order` / `ordered-item` - Commandes (relations à corriger)
- `wishlist` - Liste de souhaits
- `favorite` - Favoris (non utilisé actuellement)

### Utilisateurs & Contenu
- `users-permissions/user` - Utilisateurs étendus
- `address` - Adresses livraison
- Composants UI: sign-in, sign-up, homepage, etc.

## Commandes Critiques

### Installation & Setup
```bash
# Installation complète (requis)
npm install
npm install pg  # Driver PostgreSQL manquant

# Développement
npm run develop      # Mode développement
npm run start        # Mode production
npm run build        # Build admin panel
npm run strapi       # CLI Strapi
```

### Database Management
```bash
# Vérifier connexion PostgreSQL
npm run strapi configuration:dump

# Migrations
npm run strapi db:migrate
npm run strapi generate:api
```

### Debugging
```bash
# Logs détaillés
DEBUG=strapi:* npm run develop

# Vérifier configuration
npm run strapi config:dump

# Status santé
curl http://localhost:1337/_health
```

## Issues Critiques Identifiés

### 🔴 Sécurité - URGENT
- Secrets exposés dans .env (JWT, database, Stripe, OVH)
- Pas de rate limiting configuré
- CORS basique sans restrictions
- Headers sécurité manquants

### 🔴 Infrastructure
- Driver PostgreSQL manquant (`npm install pg`)
- Dependencies non installées
- Configuration OVH S3 non testée
- Stripe webhook non vérifié

### 🟡 Architecture
- Relations Many-to-Many incorrectes pour cart/order
- Pas d'index database pour performance
- Pas de cache (Redis recommandé)
- Validation données insuffisante

## Configuration Recommandée

### Environment Variables (Sécurisé)
```bash
# À déplacer vers secret manager
DATABASE_URL=postgresql://strapi:NEW_PASSWORD@127.0.0.1:5432/strapi_conscience
JWT_SECRET=<générer-nouveau-64-chars>
ADMIN_JWT_SECRET=<générer-nouveau-64-chars>
STRIPE_SECRET_KEY=<utiliser-live-keys>
OVH_S3_ACCESS_KEY=<nouvelles-clés-OVH>
```

### Plugins Essentiels
```javascript
// config/plugins.js
module.exports = {
  'users-permissions': { enabled: true },
  upload: {
    config: {
      provider: '@strapi/provider-upload-aws-s3',
      providerOptions: {
        s3Options: {
          accessKeyId: env('OVH_ACCESS_KEY'),
          secretAccessKey: env('OVH_SECRET_KEY'),
          endpoint: env('OVH_ENDPOINT'),
          region: env('OVH_REGION'),
          params: { Bucket: env('OVH_BUCKET') }
        }
      }
    }
  }
};
```

### Middleware Sécurisé
```javascript
// config/middlewares.js
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
          'img-src': ["'self'", 'data:', 'blob:', 'image-artedusa.s3.rbx.io.cloud.ovh.net']
        }
      }
    }
  },
  {
    name: 'strapi::cors',
    config: {
      origin: ['http://localhost:3000', 'https://artedusa.com'],
      credentials: true
    }
  },
  'strapi::poweredBy',
  'strapi::query',
  'strapi::body',
  'strapi::session',
  'strapi::favicon',
  'strapi::public'
];
```

## Actions Prioritaires

### 1. Sécurité Immédiate (24h)
- [ ] Rotation de tous les secrets
- [ ] Configuration rate limiting
- [ ] Suppression .env du git
- [ ] Test connexion PostgreSQL

### 2. Stabilité (48h)
- [ ] Installation driver PostgreSQL
- [ ] Test upload OVH S3
- [ ] Vérification webhook Stripe
- [ ] Installation dependencies manquantes

### 3. Optimisation (1 semaine)
- [ ] Refactoring relations cart/order
- [ ] Index database performance
- [ ] Cache Redis
- [ ] Monitoring health checks

## Tests & Validation

### Endpoints Critiques
```bash
# Test API santé
curl http://localhost:1337/_health

# Test auth
curl -X POST http://localhost:1337/api/auth/local \
  -H "Content-Type: application/json" \
  -d '{"identifier":"test@test.com","password":"password"}'

# Test upload
curl -X POST http://localhost:1337/api/upload \
  -H "Authorization: Bearer <token>" \
  -F "files=@image.jpg"

# Test Stripe webhook
curl -X POST http://localhost:1337/api/stripe/webhook \
  -H "stripe-signature: <signature>"
```

### Performance
```bash
# Analyser requêtes lentes
npm run strapi console
# Dans la console Strapi
const users = await strapi.db.query('plugin::users-permissions.user').findMany();
console.log(users.length);
```

## Workflow Développement

### Nouveau Content Type
1. `npm run strapi generate:api [name]`
2. Configurer schema.json
3. Définir permissions admin
4. Tester endpoints
5. Ajouter validation custom si nécessaire

### Déploiement
1. Tester en local avec PostgreSQL
2. Vérifier upload OVH S3 fonctionne
3. Test webhook Stripe
4. Build et déploiement staging
5. Tests d'intégration complets

## Support & Documentation

- **Logs**: `~/.pm2/logs/` en production
- **Admin**: http://localhost:1337/admin
- **API Docs**: Auto-générée par Strapi
- **Database**: Utiliser pgAdmin pour PostgreSQL