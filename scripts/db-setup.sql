-- Database setup script for CI/CD environment
-- Ensures proper roles and permissions for PostgreSQL testing

-- Create strapi role if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'strapi') THEN
        CREATE ROLE strapi WITH LOGIN PASSWORD 'strapi123';
        RAISE NOTICE 'Created role: strapi';
    ELSE
        RAISE NOTICE 'Role strapi already exists';
    END IF;
END
$$;

-- Create root role if it doesn't exist (required for some CI scripts)
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'root') THEN
        CREATE ROLE root WITH LOGIN PASSWORD 'strapi123';
        RAISE NOTICE 'Created role: root';
    ELSE
        RAISE NOTICE 'Role root already exists';
    END IF;
END
$$;

-- Grant necessary privileges to both roles
GRANT ALL PRIVILEGES ON DATABASE strapi_test TO strapi;
GRANT ALL PRIVILEGES ON DATABASE strapi_test TO root;

-- Grant schema permissions
GRANT ALL PRIVILEGES ON SCHEMA public TO strapi;
GRANT ALL PRIVILEGES ON SCHEMA public TO root;

-- Grant table and sequence permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO strapi;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO root;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO strapi;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO root;

-- Allow database creation (needed for Strapi migrations)
ALTER USER strapi CREATEDB;
ALTER USER root CREATEDB;

-- Set default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO strapi;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO root;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO strapi;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO root;

\echo 'Database setup completed successfully - both strapi and root roles configured'