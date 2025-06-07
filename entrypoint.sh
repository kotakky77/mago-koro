#!/bin/bash
set -e

# Remove a potentially pre-existing server.pid for Rails.
rm -f /app/tmp/pids/server.pid

# Install bundle dependencies
echo "Installing dependencies..."
bundle install

# Setup the database if it doesn't exist
echo "Setting up the database..."
# Try to set up the database, with retry logic for connection issues
max_attempts=5
attempt=1

while [ $attempt -le $max_attempts ]; do
    echo "Attempt $attempt of $max_attempts to set up the database..."
    
    # Check if MySQL is ready by trying to connect
    if MYSQL_PWD=password mysql -h db -u root -e "SELECT 1" &> /dev/null; then
        echo "MySQL is available, proceeding with database setup..."
        bundle exec rails db:prepare || bundle exec rails db:setup
        
        echo "Database setup completed successfully."
        break
    else
        echo "MySQL is not yet available, waiting..."
        sleep 5
        attempt=$((attempt + 1))
    fi
done

if [ $attempt -gt $max_attempts ]; then
    echo "Failed to connect to the database after $max_attempts attempts. Exiting."
    exit 1
fi

# Then exec the container's main process (what's set as CMD in the Dockerfile).
exec "$@"
