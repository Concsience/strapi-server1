-- Database setup script for CI/CD environment  
-- Creates the configured Strapi database user with appropriate permissions
-- Reference: https://docs.strapi.io/dev-docs/database/installation

\echo 'Starting database setup for Strapi CI/CD...'

-- Drop existing strapi user if exists to ensure clean setup
DROP USER IF EXISTS strapi;
\echo 'Cleaned existing strapi user if any'

-- Create strapi user with password
CREATE USER strapi WITH PASSWORD 'strapi123';
\echo 'Created strapi user with password'

-- Grant connection and database creation privileges
ALTER USER strapi CREATEDB;
ALTER USER strapi WITH LOGIN;
\echo 'Granted basic privileges to strapi user'

-- Grant all necessary database privileges
GRANT ALL PRIVILEGES ON DATABASE strapi_test TO strapi;
\echo 'Granted database privileges to strapi user'

-- Grant schema permissions  
GRANT ALL PRIVILEGES ON SCHEMA public TO strapi;
GRANT USAGE ON SCHEMA public TO strapi;
\echo 'Granted schema privileges to strapi user'

-- Grant table and sequence permissions for existing objects
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO strapi;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO strapi;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO strapi;
\echo 'Granted object privileges to strapi user'

-- Set default privileges for future objects created by any user
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO strapi;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO strapi;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO strapi;
\echo 'Set default privileges for future objects'

-- Additional permissions that Strapi might need
GRANT CREATE ON SCHEMA public TO strapi;
\echo 'Granted CREATE privileges on public schema'

\echo 'Database setup completed successfully - strapi user configured for Strapi 5'
\echo 'Note: Performance indexes will be created by Strapi during table creation'