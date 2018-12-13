#!/bin/bash

NAME=$(node -p "require('./package.json').name");
VERSION=$(node -p "require('./package.json').version");

# secure canister login
echo $DOCKER_PASSWORD | docker login -u $DOCKER_USERNAME --password-stdin

docker build -t "$DOCKER_USERNAME/$NAME:$VERSION" -t "$DOCKER_USERNAME/$NAME:latest" .
docker push "$DOCKER_USERNAME/$NAME:$VERSION"
docker push "$DOCKER_USERNAME/$NAME:latest"

curl -X POST $DOCKER_WEBHOOK
