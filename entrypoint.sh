#!/bin/sh

finish() {
  echo "killing service..."
  kill -SIGTERM "$pid" 2>/dev/null;
}

trap finish SIGINT SIGQUIT SIGTERM

dbUser=$PG_COMPONENT_PSQL_USER
dbPassword=$PG_COMPONENT_PSQL_PASSWORD
dbHost=$PG_COMPONENT_PSQL_HOST
dbPort=$PG_COMPONENT_PSQL_PORT
dbDatabaseName=$PG_COMPONENT_PSQL_DATABASE

# Build the CONNECTION_STRING
CONNECTION_STRING ="postgres://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${dbDatabaseName}"

echo "running migrations"
./node_modules/.bin/node-pg-migrate -m lib/migrations -d CONNECTION_STRING up

echo "starting service..."
/usr/local/bin/node --trace-warnings --abort-on-uncaught-exception --unhandled-rejections=strict dist/index.js &

pid=$!
echo "runnig on $pid"
wait "$pid"