-- Database setup script for CI/CD environment
-- Creates both strapi and root roles as needed by CI workflow
-- Reference: https://docs.strapi.io/dev-docs/database/installation

-- Create strapi role if it doesn't exist (official Strapi v5 approach)
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

-- Create root role if it doesn't exist (needed by CI workflow)
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'root') THEN
        CREATE ROLE root WITH SUPERUSER LOGIN PASSWORD 'postgres';
        RAISE NOTICE 'Created role: root';
    ELSE
        RAISE NOTICE 'Role root already exists';
    END IF;
END
$$;

-- Grant all necessary privileges to both strapi and root users
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

\echo 'Database setup completed successfully - strapi and root users configured'