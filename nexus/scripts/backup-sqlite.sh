#!/bin/bash

# SQLite WAL Backup Script
# Goal: Create a safe snapshot of the database while running in WAL mode.

DB_PATH="./backend/prisma/dev.db"
BACKUP_DIR="./backups"
TIMESTAMP=$(date +"%Y%m%d%H%M%S")
BACKUP_PATH="$BACKUP_DIR/erp_backup_$TIMESTAMP.db"

mkdir -p $BACKUP_DIR

# Use sqlite3 .backup command for safe snapshot
sqlite3 $DB_PATH ".backup $BACKUP_PATH"

# Compress
gzip $BACKUP_PATH

# Retention: Keep last 7 days
find $BACKUP_DIR -name "erp_backup_*.db.gz" -mtime +7 -delete

echo "Backup successful: $BACKUP_PATH.gz"
