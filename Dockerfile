ARG RUN

FROM node:lts-alpine as builderenv

RUN apk add --no-cache git

WORKDIR /app

# some packages require a build step
COPY package.json /app/package.json
COPY yarn.lock /app/yarn.lock
RUN yarn install --frozen-lockfile

# build the app
COPY . /app

# Make commit hash available to application
ARG COMMIT_HASH
RUN echo "COMMIT_HASH=$COMMIT_HASH" >> .env

RUN yarn build

# remove devDependencies, keep only used dependencies
RUN yarn install --prod --frozen-lockfile

########################## END OF BUILD STAGE ##########################

FROM node:lts-alpine

RUN apk update && apk upgrade
RUN apk add --no-cache tini

# NODE_ENV is used to configure some runtime options, like JSON logger
ENV NODE_ENV production

ARG COMMIT_HASH=local
ENV COMMIT_HASH=${COMMIT_HASH:-local}

ARG CURRENT_VERSION=Unknown
ENV CURRENT_VERSION=${CURRENT_VERSION:-Unknown}

WORKDIR /app
COPY --from=builderenv /app /app

# Please _DO NOT_ use a custom ENTRYPOINT because it may prevent signals
# (i.e. SIGTERM) to reach the service
# Read more here: https://aws.amazon.com/blogs/containers/graceful-shutdowns-with-ecs/
#            and: https://www.ctl.io/developers/blog/post/gracefully-stopping-docker-containers/
ENTRYPOINT ["/sbin/tini", "--", "/app/entrypoint.sh"]

RUN chmod +x /app/entrypoint.sh