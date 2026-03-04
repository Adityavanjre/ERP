#!/bin/bash
# automated-backup.sh
# Requires: postgresql-client, aws-cli

set -e

# Configuration
# These should be set in environment variables
# DATABASE_URL
# AWS_ACCESS_KEY_ID
# AWS_SECRET_ACCESS_KEY
# S3_BUCKET_NAME (e.g., s3://nexus-erp-backups)

TIMESTAMP=$(date +%Y-%m-%d_%H-%M-%S)
BACKUP_NAME="nexus_backup_$TIMESTAMP.sql.gz"
TEMP_FILE="/tmp/$BACKUP_NAME"

echo "Starting backup: $BACKUP_NAME"

# Perform pg_dump
pg_dump "$DATABASE_URL" | gzip > "$TEMP_FILE"

echo "Uploading to S3..."
aws s3 cp "$TEMP_FILE" "$S3_BUCKET_NAME/daily/$BACKUP_NAME"

# Cleanup
rm "$TEMP_FILE"

echo "Backup complete and uploaded to S3."

# Prune old backups (older than 30 days)
aws s3 ls "$S3_BUCKET_NAME/daily/" | while read -r line;
do
  createDate=`echo $line|awk {'print $1" "$2'}`
  createDate=`date -d"$createDate" +%s`
  olderThan=`date -d"-30 days" +%s`
  if [ $createDate -lt $olderThan ];
  then
    fileName=`echo $line|awk {'print $4'}`
    if [ $fileName != "" ]
    then
      aws s3 rm "$S3_BUCKET_NAME/daily/$fileName"
    fi
  fi
done
