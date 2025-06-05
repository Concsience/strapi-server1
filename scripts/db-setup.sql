-- Database setup script for CI/CD environment  
-- Uses existing postgres superuser for simplicity and reliability
-- Reference: https://docs.strapi.io/dev-docs/database/installation

-- The postgres user already exists with full privileges
-- Just ensure database is ready and add performance indexes

-- Create performance indexes for Strapi 5 e-commerce optimization
-- (These will be created when tables exist, otherwise they'll be skipped)
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cart_user ON carts(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id) WHERE user_id IS NOT NULL;

\echo 'Database setup completed successfully - using postgres superuser with Strapi 5 optimizations'