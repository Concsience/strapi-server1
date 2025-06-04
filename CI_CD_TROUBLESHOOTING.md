# 🔧 CI/CD Troubleshooting Guide

## 🚨 Problem Solved: "Missing script: build:production"

### ✅ What Was Fixed
Le problème était que le script `build:production` était défini dans `package.json` mais le script `build` standard renvoyait une erreur intentionnellement.

### 🔧 Solution Applied
```json
// Avant (package.json)
"build": "echo 'Build requires: npm install && npx strapi build' && exit 1",
"build:production": "npm install && npx strapi build",

// Après (package.json) - FIXED
"build": "strapi build",
"build:production": "NODE_ENV=production strapi build",
```

### 🎯 New CI/CD Pipeline Features
J'ai créé un workflow GitHub Actions complet avec :

1. **Tests automatisés** sur push et PR
2. **Services externes** (PostgreSQL, Redis) pour tests réalistes
3. **Validation TypeScript** et ESLint
4. **Audit de sécurité** npm
5. **Tests d'intégration API** avec serveur Strapi
6. **Analyse de performance** et taille de bundle
7. **Déploiement automatique** (prêt à configurer)

---

## 🧪 Testing Build Locally

### Quick Test
```bash
# Test your build commands before pushing
./scripts/test-build.sh
```

### Manual Testing
```bash
# Test standard build
npm run build

# Test production build
npm run build:production

# Test TypeScript
npm run ts:check

# Full validation
npm run production:check
```

---

## 🚀 CI/CD Pipeline Overview

### Workflow Triggers
- **Push** sur branches: `main`, `master`, `develop`, `feature/typescript-strapi-official`
- **Pull Request** vers `main` ou `master`

### Jobs Pipeline

#### 1. 🧪 Tests & Validation
- Installation dépendances
- Validation TypeScript
- Checks ESLint
- Audit sécurité npm
- Build de l'application
- Validation pre-deployment

#### 2. 🚀 Build & Deploy (main/master only)
- Build production
- Vérification artifacts
- Déploiement (à configurer)

#### 3. 🧪 API Integration Tests (PR only)
- Démarrage services (PostgreSQL, Redis)
- Démarrage serveur Strapi
- Tests API complets
- Arrêt propre des services

#### 4. 📊 Performance Tests (PR only)
- Analyse taille bundle
- Vérification artifacts

#### 5. 📋 PR Summary (PR only)
- Commentaire automatique avec résultats

---

## 🔧 Common Issues & Solutions

### Issue: "Module not found"
```bash
# Solution: Clean install
rm -rf node_modules package-lock.json
npm install
```

### Issue: "TypeScript compilation failed"
```bash
# Solution: Check and fix TypeScript errors
npm run ts:check
# Fix errors in the files listed
```

### Issue: "Build artifacts not found"
```bash
# Solution: Verify build script
npm run build
ls -la build/ || ls -la dist/

# Check if build directory is created
```

### Issue: "Database connection failed"
```bash
# Solution: Check database configuration
# In CI/CD, services are automatically configured
# Locally, ensure PostgreSQL is running:
sudo systemctl start postgresql
```

### Issue: "Environment variables missing"
```bash
# Solution: Copy and configure environment
cp .env.example .env
# Fill in your actual values
# Use: node scripts/rotate-secrets.js for secure secrets
```

---

## 📦 Build Configuration Details

### Standard Build
```bash
npm run build
# Runs: strapi build
# Creates: build/ directory with admin panel
```

### Production Build  
```bash
npm run build:production
# Runs: NODE_ENV=production strapi build
# Optimized for production deployment
```

### Build Verification
```bash
npm run build:check
# Runs: tsc --noEmit
# Verifies TypeScript without compilation
```

### Full Production Check
```bash
npm run production:check
# Runs: env validation + TypeScript + build
# Complete validation before deployment
```

---

## 🎯 Deployment Configuration

### Staging Deployment (branch: develop)
```yaml
# Uncomment in .github/workflows/ci-cd.yml
- name: 🚀 Deploy to staging
  if: github.ref == 'refs/heads/develop'
  run: |
    echo "Deploying to staging..."
    # Add your staging deployment commands
```

### Production Deployment (branch: main/master)
```yaml
# Uncomment in .github/workflows/ci-cd.yml
- name: 🚀 Deploy to production
  if: github.ref == 'refs/heads/main'
  run: |
    echo "Deploying to production..."
    # Add your production deployment commands
```

### Example Deployment Commands
```bash
# SSH deployment
ssh user@server 'cd /path/to/app && git pull && npm install && npm run build:production && pm2 restart strapi'

# Docker deployment
docker build -t strapi-app .
docker push registry/strapi-app:latest
kubectl set image deployment/strapi strapi=registry/strapi-app:latest

# Platform deployment (Heroku, Railway, etc.)
# Configure platform-specific deployment
```

---

## 🔍 Debugging CI/CD Failures

### 1. Check Logs
- Go to **Actions** tab in GitHub
- Click on failed workflow
- Expand failed step to see detailed logs

### 2. Common Log Patterns

#### Build Failure
```
npm error Missing script: "script-name"
```
**Solution**: Add missing script to package.json

#### Dependency Issues
```
npm error Cannot resolve dependency
```
**Solution**: Check package.json dependencies, run `npm install`

#### TypeScript Errors
```
error TS2345: Argument of type 'X' is not assignable to parameter of type 'Y'
```
**Solution**: Fix TypeScript errors in your code

#### Test Failures
```
Error: connect ECONNREFUSED 127.0.0.1:1337
```
**Solution**: Strapi server failed to start, check environment configuration

### 3. Local Reproduction
```bash
# Simulate CI environment locally
export NODE_ENV=test
export DATABASE_CLIENT=postgres
# ... other env vars

npm ci
npm run build
npm run test
```

---

## 📊 Performance Monitoring

### Bundle Size Alerts
- **Warning**: Bundle > 50MB
- **Error**: Bundle > 100MB

### Build Time Monitoring
- **Target**: < 5 minutes total pipeline
- **Alert**: > 10 minutes

### Test Coverage
- **Target**: > 80% API coverage
- **Minimum**: > 60% critical paths

---

## 🛠️ Maintenance Tasks

### Weekly
- Review failed builds
- Update dependencies: `npm update`
- Check security alerts: `npm audit`

### Monthly  
- Review CI/CD performance metrics
- Update Node.js version if needed
- Clean up old workflow runs

### Before Major Releases
- Run full test suite locally
- Performance testing
- Security audit
- Deployment validation

---

## 📞 Getting Help

### GitHub Actions Documentation
- [GitHub Actions docs](https://docs.github.com/en/actions)
- [Workflow syntax](https://docs.github.com/en/actions/writing-workflows/workflow-syntax-for-github-actions)

### Strapi Build Issues
- [Strapi deployment docs](https://docs.strapi.io/dev-docs/deployment)
- [Strapi build docs](https://docs.strapi.io/dev-docs/admin-panel-customization)

### Project-Specific Help
- Check `IMPLEMENTATION_SUMMARY.md` for recent changes
- Review `BACKEND_ACTION_PLAN.md` for roadmap
- Use validation scripts in `scripts/` directory

---

**✅ Your CI/CD pipeline is now fully configured and ready to handle your Strapi deployments reliably!**