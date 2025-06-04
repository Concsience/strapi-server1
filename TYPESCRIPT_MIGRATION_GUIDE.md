# 📘 Guide Complet de Migration TypeScript pour Strapi 5

## 📋 Table des Matières
1. [Vue d'ensemble](#vue-densemble)
2. [Phase 1: Configuration](#phase-1-configuration)
3. [Phase 2: Types Strapi 5](#phase-2-types-strapi-5)
4. [Phase 3: Migration API par API](#phase-3-migration-api-par-api)
5. [Phase 4: Tests et Validation](#phase-4-tests-et-validation)
6. [Patterns et Best Practices](#patterns-et-best-practices)

## 🎯 Vue d'ensemble

### État Actuel
- **Fichiers JS**: ~60% du codebase
- **Fichiers TS**: ~40% du codebase
- **TypeScript**: Non strict (`strict: false`)
- **Types Strapi**: Partiellement configurés

### Objectif Final
- **100% TypeScript** avec mode strict
- **Types Strapi 5** complets
- **IntelliSense** optimal
- **Détection d'erreurs** au build

## 📦 Phase 1: Configuration

### 1.1 Configuration TypeScript Progressive

```typescript
// tsconfig.json - Configuration progressive
{
  "compilerOptions": {
    // Phase 1 (Immédiat)
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "allowJs": true,              // Permet JS pendant migration
    "checkJs": true,              // Vérifie JS aussi
    "outDir": "./dist",
    "rootDir": "./",
    
    // Phase 2 (Après 50% migration)
    "noImplicitAny": true,        // Forcer types explicites
    "strictNullChecks": true,     // Null safety
    
    // Phase 3 (Après 80% migration)
    "strict": true,               // Mode strict complet
    "noUnusedLocals": true,       // Pas de variables inutilisées
    "noUnusedParameters": true,   // Pas de params inutilisés
    
    // Toujours actifs
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node",
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  },
  "include": [
    "./src/**/*",
    "./config/**/*",
    "./database/**/*"
  ],
  "exclude": [
    "node_modules",
    "build",
    "dist",
    ".cache",
    ".tmp",
    "public",
    "**/*.test.ts"
  ]
}
```

### 1.2 Installation des Types

```bash
# Types essentiels pour Strapi 5
npm install --save-dev \
  @types/node@^20.0.0 \
  @types/koa@^2.13.0 \
  @types/koa-bodyparser@^4.3.0 \
  @strapi/typescript-utils@^5.0.0 \
  typescript@^5.3.0
```

## 🏗️ Phase 2: Types Strapi 5

### 2.1 Types de Base Strapi 5

```typescript
// src/types/strapi.d.ts
import { Strapi } from '@strapi/strapi';

declare global {
  interface StrapiContext {
    strapi: Strapi;
    state: {
      user?: {
        id: string;
        email: string;
        role: {
          name: string;
          type: string;
        };
      };
    };
    request: {
      body: any;
      query: any;
      params: any;
    };
  }
}

// Types pour Document Service
declare module '@strapi/strapi' {
  export interface DocumentService<T = any> {
    findOne(params: {
      documentId: string;
      populate?: string | object;
      status?: 'draft' | 'published';
    }): Promise<T | null>;
    
    findMany(params?: {
      filters?: object;
      populate?: string | object;
      sort?: object;
      pagination?: {
        page?: number;
        pageSize?: number;
      };
      status?: 'draft' | 'published';
    }): Promise<T[]>;
    
    create(params: {
      data: Partial<T>;
      status?: 'draft' | 'published';
    }): Promise<T>;
    
    update(params: {
      documentId: string;
      data: Partial<T>;
    }): Promise<T>;
    
    delete(params: {
      documentId: string;
    }): Promise<T>;
    
    publish(params: {
      documentId: string;
    }): Promise<T>;
    
    unpublish(params: {
      documentId: string;
    }): Promise<T>;
  }
}
```

### 2.2 Types pour les Content-Types

```typescript
// src/types/content-types.d.ts
import { Attribute, Common, Utils } from '@strapi/strapi';

// Types générés pour vos content-types
export interface Cart extends Common.Document {
  user?: string;
  cart_items?: CartItem[];
  total_price?: number;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export interface CartItem extends Common.Document {
  cart?: string;
  art?: ArtistsWork;
  quantity: number;
  price: number;
  paper_type?: PaperType;
}

export interface ArtistsWork extends Common.Document {
  name: string;
  artist?: Artist;
  original_width: number;
  original_height: number;
  base_price_per_cm_square: number;
  images?: Media[];
  description?: string;
  categories?: Category[];
}

export interface Order extends Common.Document {
  user?: string;
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  ordered_items?: OrderedItem[];
  total_price: number;
  shipping_cost?: number;
  stripe_payment_id?: string;
  stripe_invoice_id?: string;
}

// Type helpers
export type DocumentId = string;
export type ApiResponse<T> = {
  data: T;
  meta?: {
    pagination?: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
};
```

## 🔄 Phase 3: Migration API par API

### 3.1 Migration d'un Controller (Exemple: Cart)

#### Avant (JavaScript)
```javascript
// src/api/cart/controllers/cart.js
const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::cart.cart', ({ strapi }) => ({
  async findUserCart(ctx) {
    const userId = ctx.state.user.id;
    
    const cart = await strapi.entityService.findMany('api::cart.cart', {
      filters: { user: userId },
      populate: ['cart_items', 'cart_items.art']
    });
    
    ctx.body = cart[0] || null;
  }
}));
```

#### Après (TypeScript)
```typescript
// src/api/cart/controllers/cart.ts
import { factories } from '@strapi/strapi';
import { Cart, ApiResponse } from '../../../types/content-types';

interface CartController {
  findUserCart(ctx: any): Promise<void>;
  addToCart(ctx: any): Promise<void>;
  updateCartItem(ctx: any): Promise<void>;
  clearCart(ctx: any): Promise<void>;
}

export default factories.createCoreController<'api::cart.cart', CartController>(
  'api::cart.cart',
  ({ strapi }) => ({
    async findUserCart(ctx) {
      if (!ctx.state.user) {
        return ctx.unauthorized('User not authenticated');
      }

      const userId = ctx.state.user.id;
      
      try {
        // Utiliser Document Service (Strapi 5)
        const carts = await strapi.documents<Cart>('api::cart.cart').findMany({
          filters: { 
            user: { 
              documentId: userId 
            } 
          },
          populate: {
            cart_items: {
              populate: ['art', 'paper_type']
            }
          },
          status: 'published'
        });
        
        const response: ApiResponse<Cart | null> = {
          data: carts[0] || null
        };
        
        ctx.body = response;
      } catch (error) {
        strapi.log.error('Error fetching user cart:', error);
        ctx.badRequest('Failed to fetch cart');
      }
    },

    async addToCart(ctx) {
      const { artId, quantity = 1, paperTypeId } = ctx.request.body;
      
      if (!artId || quantity < 1) {
        return ctx.badRequest('Invalid request data');
      }

      const userId = ctx.state.user?.id;
      if (!userId) {
        return ctx.unauthorized('User not authenticated');
      }

      try {
        // Récupérer ou créer le panier
        let cart = await this.findOrCreateCart(userId);
        
        // Vérifier si l'article existe déjà
        const existingItem = cart.cart_items?.find(
          item => item.art?.documentId === artId && 
                  item.paper_type?.documentId === paperTypeId
        );

        if (existingItem) {
          // Mettre à jour la quantité
          await strapi.documents('api::cart-item.cart-item').update({
            documentId: existingItem.documentId,
            data: {
              quantity: existingItem.quantity + quantity
            }
          });
        } else {
          // Ajouter nouvel item
          await strapi.documents('api::cart-item.cart-item').create({
            data: {
              cart: { connect: [cart.documentId] },
              art: { connect: [artId] },
              paper_type: paperTypeId ? { connect: [paperTypeId] } : undefined,
              quantity,
              price: await this.calculateItemPrice(artId, paperTypeId)
            }
          });
        }

        // Recalculer le total
        await this.updateCartTotal(cart.documentId);
        
        // Retourner le panier mis à jour
        const updatedCart = await strapi.documents<Cart>('api::cart.cart').findOne({
          documentId: cart.documentId,
          populate: {
            cart_items: {
              populate: ['art', 'paper_type']
            }
          }
        });

        ctx.body = { data: updatedCart };
      } catch (error) {
        strapi.log.error('Error adding to cart:', error);
        ctx.badRequest('Failed to add item to cart');
      }
    },

    // Méthodes helper privées
    async findOrCreateCart(userId: string): Promise<Cart> {
      const carts = await strapi.documents<Cart>('api::cart.cart').findMany({
        filters: { user: { documentId: userId } }
      });

      if (carts.length > 0) {
        return carts[0];
      }

      return await strapi.documents<Cart>('api::cart.cart').create({
        data: {
          user: { connect: [userId] },
          total_price: 0
        }
      });
    },

    async calculateItemPrice(artId: string, paperTypeId?: string): Promise<number> {
      const art = await strapi.documents('api::artists-work.artists-work').findOne({
        documentId: artId
      });

      if (!art) {
        throw new Error('Artwork not found');
      }

      let basePrice = art.original_width * art.original_height * art.base_price_per_cm_square;

      if (paperTypeId) {
        const paperType = await strapi.documents('api::paper-type.paper-type').findOne({
          documentId: paperTypeId
        });
        
        if (paperType?.price_multiplier) {
          basePrice *= paperType.price_multiplier;
        }
      }

      return Math.round(basePrice * 100) / 100; // Arrondir à 2 décimales
    },

    async updateCartTotal(cartId: string): Promise<void> {
      const cart = await strapi.documents<Cart>('api::cart.cart').findOne({
        documentId: cartId,
        populate: ['cart_items']
      });

      if (!cart) return;

      const total = cart.cart_items?.reduce((sum, item) => {
        return sum + (item.price * item.quantity);
      }, 0) || 0;

      await strapi.documents('api::cart.cart').update({
        documentId: cartId,
        data: { total_price: total }
      });
    }
  })
);
```

### 3.2 Migration d'un Service

```typescript
// src/api/cart/services/cart.ts
import { factories } from '@strapi/strapi';
import { Cart, CartItem } from '../../../types/content-types';

interface CartService {
  calculateShipping(cart: Cart): Promise<number>;
  validateStock(items: CartItem[]): Promise<boolean>;
  convertToOrder(cartId: string): Promise<any>;
}

export default factories.createCoreService<'api::cart.cart', CartService>(
  'api::cart.cart',
  ({ strapi }) => ({
    async calculateShipping(cart: Cart): Promise<number> {
      // Logique de calcul des frais de port
      const weight = cart.cart_items?.reduce((total, item) => {
        return total + (item.quantity * 0.1); // 100g par item
      }, 0) || 0;

      if (weight < 1) return 5.99;  // < 1kg
      if (weight < 5) return 9.99;  // < 5kg
      return 14.99; // >= 5kg
    },

    async validateStock(items: CartItem[]): Promise<boolean> {
      // Vérifier le stock pour chaque item
      for (const item of items) {
        if (!item.art) continue;
        
        const artwork = await strapi.documents('api::artists-work.artists-work').findOne({
          documentId: item.art.documentId
        });

        if (!artwork || artwork.stock < item.quantity) {
          return false;
        }
      }
      
      return true;
    },

    async convertToOrder(cartId: string): Promise<any> {
      const cart = await strapi.documents<Cart>('api::cart.cart').findOne({
        documentId: cartId,
        populate: {
          cart_items: {
            populate: ['art', 'paper_type']
          },
          user: true
        }
      });

      if (!cart || !cart.cart_items || cart.cart_items.length === 0) {
        throw new Error('Cart is empty or not found');
      }

      // Créer la commande
      const order = await strapi.documents('api::order.order').create({
        data: {
          user: cart.user ? { connect: [cart.user] } : undefined,
          status: 'pending',
          total_price: cart.total_price,
          shipping_cost: await this.calculateShipping(cart),
          ordered_items: {
            create: cart.cart_items.map(item => ({
              art: item.art ? { connect: [item.art.documentId] } : undefined,
              quantity: item.quantity,
              price: item.price,
              paper_type: item.paper_type ? { connect: [item.paper_type.documentId] } : undefined
            }))
          }
        }
      });

      // Vider le panier
      await strapi.documents('api::cart.cart').delete({
        documentId: cartId
      });

      return order;
    }
  })
);
```

### 3.3 Migration des Routes

```typescript
// src/api/cart/routes/cart.ts
export default {
  routes: [
    {
      method: 'GET',
      path: '/carts/me',
      handler: 'cart.findUserCart',
      config: {
        policies: [],
        middlewares: ['plugin::users-permissions.isAuthenticated']
      }
    },
    {
      method: 'POST',
      path: '/carts/add',
      handler: 'cart.addToCart',
      config: {
        policies: [],
        middlewares: ['plugin::users-permissions.isAuthenticated']
      }
    },
    {
      method: 'PUT',
      path: '/carts/items/:itemId',
      handler: 'cart.updateCartItem',
      config: {
        policies: [],
        middlewares: ['plugin::users-permissions.isAuthenticated']
      }
    },
    {
      method: 'DELETE',
      path: '/carts/clear',
      handler: 'cart.clearCart',
      config: {
        policies: [],
        middlewares: ['plugin::users-permissions.isAuthenticated']
      }
    }
  ]
};
```

## 🧪 Phase 4: Tests et Validation

### 4.1 Script de Validation TypeScript

```typescript
// scripts/validate-typescript.ts
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';

const execAsync = promisify(exec);

interface ValidationResult {
  success: boolean;
  errors: string[];
  warnings: string[];
  stats: {
    totalFiles: number;
    jsFiles: number;
    tsFiles: number;
    migrationProgress: number;
  };
}

async function validateTypeScript(): Promise<ValidationResult> {
  const result: ValidationResult = {
    success: true,
    errors: [],
    warnings: [],
    stats: {
      totalFiles: 0,
      jsFiles: 0,
      tsFiles: 0,
      migrationProgress: 0
    }
  };

  try {
    // 1. Compiler TypeScript
    console.log('🔍 Checking TypeScript compilation...');
    const { stdout, stderr } = await execAsync('npx tsc --noEmit');
    
    if (stderr) {
      result.errors.push(`TypeScript compilation errors: ${stderr}`);
      result.success = false;
    }

    // 2. Analyser les fichiers
    const srcPath = path.join(process.cwd(), 'src');
    const files = await getFiles(srcPath);
    
    for (const file of files) {
      if (file.endsWith('.js')) result.stats.jsFiles++;
      if (file.endsWith('.ts')) result.stats.tsFiles++;
      result.stats.totalFiles++;
    }

    result.stats.migrationProgress = Math.round(
      (result.stats.tsFiles / result.stats.totalFiles) * 100
    );

    // 3. Vérifier les imports
    console.log('🔍 Checking imports...');
    for (const file of files.filter(f => f.endsWith('.ts'))) {
      const content = await fs.readFile(file, 'utf-8');
      
      // Vérifier les imports de fichiers JS
      const jsImports = content.match(/from ['"]\..*\.js['"]/g);
      if (jsImports) {
        result.warnings.push(
          `${file}: Contains JS imports that should be migrated: ${jsImports.join(', ')}`
        );
      }

      // Vérifier l'usage d'any
      const anyUsage = content.match(/:\s*any/g);
      if (anyUsage && anyUsage.length > 5) {
        result.warnings.push(
          `${file}: High usage of 'any' type (${anyUsage.length} occurrences)`
        );
      }
    }

    // 4. Rapport
    console.log('\n📊 TypeScript Migration Report:');
    console.log(`Total files: ${result.stats.totalFiles}`);
    console.log(`TypeScript files: ${result.stats.tsFiles} (${result.stats.migrationProgress}%)`);
    console.log(`JavaScript files: ${result.stats.jsFiles}`);
    console.log(`Errors: ${result.errors.length}`);
    console.log(`Warnings: ${result.warnings.length}`);

    if (result.errors.length > 0) {
      console.log('\n❌ Errors:');
      result.errors.forEach(error => console.log(`  - ${error}`));
    }

    if (result.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      result.warnings.forEach(warning => console.log(`  - ${warning}`));
    }

  } catch (error) {
    result.success = false;
    result.errors.push(`Validation failed: ${error.message}`);
  }

  return result;
}

async function getFiles(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(entry => {
      const path = `${dir}/${entry.name}`;
      return entry.isDirectory() ? getFiles(path) : path;
    })
  );
  return files.flat();
}

// Exécution
if (require.main === module) {
  validateTypeScript().then(result => {
    process.exit(result.success ? 0 : 1);
  });
}
```

## 🎯 Patterns et Best Practices

### 1. Types Utilitaires

```typescript
// src/types/utils.d.ts

// Type pour les réponses API
export type ApiResponse<T> = {
  data: T;
  meta?: {
    pagination?: Pagination;
  };
  error?: ApiError;
};

// Type pour la pagination
export interface Pagination {
  page: number;
  pageSize: number;
  pageCount: number;
  total: number;
}

// Type pour les erreurs
export interface ApiError {
  status: number;
  name: string;
  message: string;
  details?: any;
}

// Type guards
export function isApiError(error: any): error is ApiError {
  return error && typeof error.status === 'number' && typeof error.message === 'string';
}

// Types pour les filtres
export type FilterOperator = 
  | '$eq' | '$ne' | '$lt' | '$lte' | '$gt' | '$gte' 
  | '$in' | '$notIn' | '$contains' | '$notContains' 
  | '$startsWith' | '$endsWith' | '$null' | '$notNull';

export type Filter<T> = {
  [K in keyof T]?: T[K] | {
    [op in FilterOperator]?: any;
  };
};
```

### 2. Middleware Typé

```typescript
// src/middlewares/typed-middleware.ts
import { Context, Next } from 'koa';

export interface TypedContext extends Context {
  state: {
    user?: {
      id: string;
      email: string;
      role: {
        name: string;
        type: string;
      };
    };
    isAuthenticated: boolean;
  };
  request: Context['request'] & {
    body: any;
  };
}

export type TypedMiddleware = (ctx: TypedContext, next: Next) => Promise<void>;

// Exemple d'utilisation
export const requireAuth: TypedMiddleware = async (ctx, next) => {
  if (!ctx.state.user) {
    ctx.throw(401, 'Authentication required');
  }
  await next();
};
```

### 3. Service Factory Typé

```typescript
// src/utils/service-factory.ts
import { Strapi } from '@strapi/strapi';

export function createTypedService<T extends Record<string, any>>(
  uid: string,
  implementation: (strapi: Strapi) => T
) {
  return ({ strapi }: { strapi: Strapi }): T => {
    const service = implementation(strapi);
    
    // Ajouter logging automatique
    return new Proxy(service, {
      get(target, prop) {
        const value = target[prop as keyof T];
        if (typeof value === 'function') {
          return async (...args: any[]) => {
            const start = Date.now();
            try {
              const result = await value.apply(target, args);
              strapi.log.debug(`${uid}.${String(prop)} executed in ${Date.now() - start}ms`);
              return result;
            } catch (error) {
              strapi.log.error(`${uid}.${String(prop)} failed:`, error);
              throw error;
            }
          };
        }
        return value;
      }
    });
  };
}
```

## 📝 Checklist de Migration

### Par Fichier
- [ ] Renommer `.js` → `.ts`
- [ ] Ajouter types aux paramètres
- [ ] Ajouter types de retour
- [ ] Remplacer `require` → `import`
- [ ] Remplacer `module.exports` → `export`
- [ ] Utiliser Document Service au lieu d'Entity Service
- [ ] Ajouter gestion d'erreurs typée
- [ ] Documenter avec JSDoc si nécessaire

### Par Module
- [ ] Migrer controller
- [ ] Migrer service
- [ ] Migrer routes
- [ ] Créer types pour le module
- [ ] Ajouter tests unitaires
- [ ] Valider avec `tsc --noEmit`

### Global
- [ ] Activer `noImplicitAny`
- [ ] Activer `strictNullChecks`
- [ ] Activer mode `strict` complet
- [ ] Supprimer tous les `any` non nécessaires
- [ ] Documenter les types complexes
- [ ] Former l'équipe aux nouvelles pratiques

## 🚀 Scripts Utiles

```json
// package.json
{
  "scripts": {
    "ts:check": "tsc --noEmit",
    "ts:watch": "tsc --noEmit --watch",
    "ts:migrate": "node scripts/migrate-to-typescript.js",
    "ts:validate": "ts-node scripts/validate-typescript.ts",
    "ts:coverage": "node scripts/typescript-coverage.js",
    "lint:ts": "eslint src --ext .ts",
    "build:types": "tsc --declaration --emitDeclarationOnly"
  }
}
```

---

Ce guide vous accompagnera tout au long de votre migration TypeScript. Adaptez-le selon vos besoins spécifiques et n'hésitez pas à l'enrichir avec vos propres patterns et découvertes.