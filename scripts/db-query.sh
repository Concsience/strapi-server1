#!/bin/bash
# PostgreSQL query helper script for Strapi database

DB_HOST="localhost"
DB_PORT="5432"
DB_NAME="strapi_conscience"
DB_USER="strapi"
DB_PASS="strapi123"

# Function to execute SQL query
query() {
    PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "$1"
}

# Function to execute SQL and return results as JSON
query_json() {
    PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -A -c "$1" --csv | jq -R -s -c 'split("\n")[:-1] | map(split(",")) | .[1:] | map({(.[0]): .[1:] | map(tonumber? // .)}) | add'
}

# Main execution
if [ $# -eq 0 ]; then
    echo "Usage: $0 \"SQL QUERY\""
    echo "Example: $0 \"SELECT * FROM users-permissions_user LIMIT 5;\""
    exit 1
fi

query "$1"