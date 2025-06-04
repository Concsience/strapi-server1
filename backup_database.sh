#!/bin/bash
# Database backup script for Strapi 5 migration

export PGPASSWORD='strapi123'
BACKUP_FILE="database_backup_$(date +%Y%m%d_%H%M%S).sql"

echo "Creating database backup: $BACKUP_FILE"
pg_dump -U strapi -h localhost strapi_conscience > $BACKUP_FILE

if [ $? -eq 0 ]; then
    echo "✅ Database backup completed: $BACKUP_FILE"
    ls -lh $BACKUP_FILE
else
    echo "❌ Database backup failed"
    exit 1
fi