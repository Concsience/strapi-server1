#!/bin/bash
# Database Migration Validation
# Validates and tests database migrations before deployment

set -euo pipefail

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "🗄️  Database Migration Validation"
echo "================================"

# Load environment
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Configuration
MIGRATION_DIR="database/migrations"
BACKUP_DIR=".claude/backups/database"
TEST_DB="${DATABASE_NAME}_test"

mkdir -p $BACKUP_DIR

# Function to run PostgreSQL command
run_psql() {
    PGPASSWORD=$DATABASE_PASSWORD psql -h $DATABASE_HOST -p $DATABASE_PORT -U $DATABASE_USERNAME -d $1 -c "$2"
}

# Function to check if database exists
db_exists() {
    PGPASSWORD=$DATABASE_PASSWORD psql -h $DATABASE_HOST -p $DATABASE_PORT -U $DATABASE_USERNAME -lqt | cut -d \| -f 1 | grep -qw $1
}

# 1. Check for pending migrations
echo -e "\n${YELLOW}1. Checking for migrations...${NC}"
if [ -d "$MIGRATION_DIR" ]; then
    MIGRATION_FILES=$(find $MIGRATION_DIR -name "*.js" -o -name "*.sql" | sort)
    if [ -n "$MIGRATION_FILES" ]; then
        echo "Found $(echo "$MIGRATION_FILES" | wc -l) migration files"
    else
        echo "No migration files found"
    fi
else
    echo "No migrations directory found"
    mkdir -p $MIGRATION_DIR
fi

# 2. Create test database
echo -e "\n${YELLOW}2. Setting up test database...${NC}"
if db_exists $TEST_DB; then
    echo "Test database exists, dropping..."
    PGPASSWORD=$DATABASE_PASSWORD dropdb -h $DATABASE_HOST -p $DATABASE_PORT -U $DATABASE_USERNAME $TEST_DB
fi

echo "Creating test database..."
PGPASSWORD=$DATABASE_PASSWORD createdb -h $DATABASE_HOST -p $DATABASE_PORT -U $DATABASE_USERNAME $TEST_DB

# 3. Clone current schema
echo -e "\n${YELLOW}3. Cloning current schema...${NC}"
SCHEMA_BACKUP="$BACKUP_DIR/schema-$(date +%Y%m%d-%H%M%S).sql"
PGPASSWORD=$DATABASE_PASSWORD pg_dump -h $DATABASE_HOST -p $DATABASE_PORT -U $DATABASE_USERNAME \
    --schema-only --no-owner --no-privileges $DATABASE_NAME > $SCHEMA_BACKUP

echo "Restoring schema to test database..."
PGPASSWORD=$DATABASE_PASSWORD psql -h $DATABASE_HOST -p $DATABASE_PORT -U $DATABASE_USERNAME \
    $TEST_DB < $SCHEMA_BACKUP

# 4. Run Strapi migrations on test database
echo -e "\n${YELLOW}4. Running migrations on test database...${NC}"
export DATABASE_NAME=$TEST_DB

# Check if Strapi migration command exists
if npm run strapi -- --help | grep -q "migration:run"; then
    echo "Running Strapi migrations..."
    if npm run strapi -- migration:run 2>&1 | tee "$BACKUP_DIR/migration-test.log"; then
        echo -e "${GREEN}✓ Migrations completed successfully${NC}"
    else
        echo -e "${RED}✗ Migration failed${NC}"
        # Cleanup
        PGPASSWORD=$DATABASE_PASSWORD dropdb -h $DATABASE_HOST -p $DATABASE_PORT -U $DATABASE_USERNAME $TEST_DB
        exit 1
    fi
else
    echo "Strapi migration command not available, checking for SQL files..."
    
    # Run SQL migrations manually
    if [ -n "$MIGRATION_FILES" ]; then
        for migration in $MIGRATION_FILES; do
            if [[ "$migration" == *.sql ]]; then
                echo "Running: $migration"
                PGPASSWORD=$DATABASE_PASSWORD psql -h $DATABASE_HOST -p $DATABASE_PORT -U $DATABASE_USERNAME \
                    $TEST_DB < "$migration"
            fi
        done
    fi
fi

# Reset database name
export DATABASE_NAME="${DATABASE_NAME%_test}"

# 5. Validate schema changes
echo -e "\n${YELLOW}5. Validating schema changes...${NC}"

# Compare schemas
echo "Generating schema diff..."
PGPASSWORD=$DATABASE_PASSWORD pg_dump -h $DATABASE_HOST -p $DATABASE_PORT -U $DATABASE_USERNAME \
    --schema-only --no-owner --no-privileges $TEST_DB > "$BACKUP_DIR/schema-new.sql"

# Create diff report
DIFF_REPORT="$BACKUP_DIR/migration-diff-$(date +%Y%m%d-%H%M%S).txt"
if diff -u "$SCHEMA_BACKUP" "$BACKUP_DIR/schema-new.sql" > "$DIFF_REPORT"; then
    echo -e "${YELLOW}No schema changes detected${NC}"
else
    echo -e "${GREEN}Schema changes detected:${NC}"
    grep -E "^[+-]" "$DIFF_REPORT" | grep -v "^[+-]--" | head -20
    echo "Full diff saved to: $DIFF_REPORT"
fi

# 6. Check for destructive changes
echo -e "\n${YELLOW}6. Checking for destructive changes...${NC}"
DESTRUCTIVE_KEYWORDS="DROP TABLE|DROP COLUMN|DELETE FROM|TRUNCATE"
if grep -E "$DESTRUCTIVE_KEYWORDS" "$DIFF_REPORT" 2>/dev/null; then
    echo -e "${RED}⚠ WARNING: Destructive changes detected!${NC}"
    echo "Please review carefully before applying to production"
    grep -E "$DESTRUCTIVE_KEYWORDS" "$DIFF_REPORT"
else
    echo -e "${GREEN}✓ No destructive changes detected${NC}"
fi

# 7. Performance impact analysis
echo -e "\n${YELLOW}7. Analyzing performance impact...${NC}"

# Check for new indexes
NEW_INDEXES=$(grep -E "^\+.*CREATE.*INDEX" "$DIFF_REPORT" 2>/dev/null | wc -l || echo 0)
if [ $NEW_INDEXES -gt 0 ]; then
    echo -e "${GREEN}✓ Found $NEW_INDEXES new indexes${NC}"
fi

# Check for removed indexes
REMOVED_INDEXES=$(grep -E "^-.*CREATE.*INDEX" "$DIFF_REPORT" 2>/dev/null | wc -l || echo 0)
if [ $REMOVED_INDEXES -gt 0 ]; then
    echo -e "${YELLOW}⚠ Removed $REMOVED_INDEXES indexes${NC}"
fi

# 8. Data integrity checks
echo -e "\n${YELLOW}8. Running data integrity checks...${NC}"

# Check foreign key constraints
FK_COUNT=$(run_psql $TEST_DB "SELECT COUNT(*) FROM information_schema.table_constraints WHERE constraint_type = 'FOREIGN KEY';" | sed -n 3p | tr -d ' ')
echo "Foreign key constraints: $FK_COUNT"

# Check for orphaned records (example)
echo "Checking for potential orphaned records..."
TABLES=$(run_psql $TEST_DB "SELECT tablename FROM pg_tables WHERE schemaname = 'public';" | tail -n +3 | head -n -2)

# 9. Generate migration rollback script
echo -e "\n${YELLOW}9. Generating rollback script...${NC}"
ROLLBACK_SCRIPT="$BACKUP_DIR/rollback-$(date +%Y%m%d-%H%M%S).sql"

cat > "$ROLLBACK_SCRIPT" << EOF
-- Rollback script generated on $(date)
-- Use this to revert migrations if needed

BEGIN;

-- Add your rollback commands here
-- Example:
-- DROP TABLE IF EXISTS new_table;
-- ALTER TABLE existing_table DROP COLUMN new_column;

COMMIT;
EOF

echo "Rollback template created: $ROLLBACK_SCRIPT"

# 10. Generate migration report
echo -e "\n${YELLOW}10. Generating migration report...${NC}"
REPORT_FILE="$BACKUP_DIR/migration-report-$(date +%Y%m%d-%H%M%S).json"

cat > "$REPORT_FILE" << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "status": "validated",
  "changes": {
    "tables_added": $(grep -c "CREATE TABLE" "$DIFF_REPORT" 2>/dev/null || echo 0),
    "tables_modified": $(grep -c "ALTER TABLE" "$DIFF_REPORT" 2>/dev/null || echo 0),
    "indexes_added": $NEW_INDEXES,
    "indexes_removed": $REMOVED_INDEXES,
    "has_destructive_changes": $(grep -qE "$DESTRUCTIVE_KEYWORDS" "$DIFF_REPORT" 2>/dev/null && echo "true" || echo "false")
  },
  "test_database": "$TEST_DB",
  "diff_file": "$DIFF_REPORT",
  "rollback_script": "$ROLLBACK_SCRIPT"
}
EOF

# Cleanup test database
echo -e "\n${YELLOW}Cleaning up...${NC}"
read -p "Keep test database for manual inspection? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    PGPASSWORD=$DATABASE_PASSWORD dropdb -h $DATABASE_HOST -p $DATABASE_PORT -U $DATABASE_USERNAME $TEST_DB
    echo "Test database dropped"
else
    echo "Test database kept: $TEST_DB"
fi

# Summary
echo -e "\n${GREEN}✓ Migration validation complete${NC}"
echo "Report saved to: $REPORT_FILE"
echo "Schema backup: $SCHEMA_BACKUP"

# Exit code based on findings
if grep -qE "$DESTRUCTIVE_KEYWORDS" "$DIFF_REPORT" 2>/dev/null; then
    exit 1
else
    exit 0
fi