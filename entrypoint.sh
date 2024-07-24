#!/bin/sh

finish() {
  echo "killing service..."
  kill -SIGTERM "$pid" 2>/dev/null;
}

trap finish SIGINT SIGQUIT SIGTERM

temp_migration_dir="./temp_migrations"
mkdir -p "$temp_migration_dir"

# Copy only .js migration files to the temporary directory
cp ./dist/migrations/*.js "$temp_migration_dir"

dbUser=$PG_COMPONENT_PSQL_USER
dbPassword=$PG_COMPONENT_PSQL_PASSWORD
dbHost=$PG_COMPONENT_PSQL_HOST
dbPort=$PG_COMPONENT_PSQL_PORT
dbDatabaseName=$PG_COMPONENT_PSQL_DATABASE

# Build the CONNECTION_STRING
export CONNECTION_STRING="postgres://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${dbDatabaseName}"

echo "running migrations"
./node_modules/.bin/node-pg-migrate -m "$temp_migration_dir" -d "$CONNECTION_STRING" up

rm -r "$temp_migration_dir"

echo "starting service..."
/usr/local/bin/node --trace-warnings --abort-on-uncaught-exception --unhandled-rejections=strict dist/index.js &

pid=$!
echo "runnig on $pid"
wait "$pid"