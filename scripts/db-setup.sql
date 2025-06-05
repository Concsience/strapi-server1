-- Database setup script for CI/CD environment  
-- Creates the configured Strapi database user with appropriate permissions
-- Reference: https://docs.strapi.io/dev-docs/database/installation

-- Create the configured database user if it doesn't exist
-- Note: This script uses environment variables from CI/CD workflow
DO $$
BEGIN
    -- Create strapi user (default for most deployments)
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'strapi') THEN
        CREATE ROLE strapi WITH LOGIN PASSWORD 'strapi123';
        RAISE NOTICE 'Created role: strapi';
    ELSE
        RAISE NOTICE 'Role strapi already exists';
    END IF;
END
$$;

-- Grant all necessary privileges to strapi user
GRANT ALL PRIVILEGES ON DATABASE strapi_test TO strapi;

-- Grant schema permissions  
GRANT ALL PRIVILEGES ON SCHEMA public TO strapi;

-- Grant table and sequence permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO strapi;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO strapi;

-- Allow database creation (needed for Strapi migrations)
ALTER USER strapi CREATEDB;

-- Set default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO strapi;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO strapi;

-- Create indexes for performance (Strapi 5 e-commerce optimization)
CREATE INDEX IF NOT EXISTS idx_strapi_database_schema_index ON information_schema.tables(table_name);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cart_user ON carts(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id) WHERE user_id IS NOT NULL;

\echo 'Database setup completed successfully - strapi user configured with Strapi 5 optimizations'