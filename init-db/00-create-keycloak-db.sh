#!/bin/bash
# ============================================================================
# Create Keycloak Database
# This script runs first to create the database Keycloak will use
# ============================================================================

set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE DATABASE keycloak;
    GRANT ALL PRIVILEGES ON DATABASE keycloak TO $POSTGRES_USER;
EOSQL

echo "Keycloak database created successfully!"
