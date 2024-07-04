#!/bin/sh
# ./node_modules/.bin/node-pg-migrate -m lib/migrations -d CONNECTION_STRING up && NODE_ENV=production node lib/server.js

#!/bin/sh

finish() {
  echo "killing service..."
  kill -SIGTERM "$pid" 2>/dev/null;
}

trap finish SIGINT SIGQUIT SIGTERM

echo "running migrations"
./node_modules/.bin/node-pg-migrate -m lib/migrations -d CONNECTION_STRING up

echo "starting service..."
/usr/local/bin/node --trace-warnings --abort-on-uncaught-exception --unhandled-rejections=strict dist/index.js &

pid=$!
echo "runnig on $pid"
wait "$pid"