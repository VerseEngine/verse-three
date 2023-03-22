#!/bin/bash
set -euxo pipefail
cd `/usr/bin/dirname $0`

# _OPTS="--dryrun"
_OPTS=""

aws --profile metaverse-dev-deploy s3 sync ${_OPTS} \
      --region ap-northeast-1 \
      --delete \
      --exclude "*.DS_Store" \
      --exclude "temp/*" \
      --exclude "*.clean" \
      --cache-control "max-age=60"\
      ./dist s3://static.verseengine.cloud/examples/verse-three/dist

aws --profile metaverse-dev-deploy s3 sync ${_OPTS} \
      --region ap-northeast-1 \
      --delete \
      --exclude "*.DS_Store" \
      --exclude "asset/*" \
      --exclude "*.clean" \
      --cache-control "max-age=60"\
      ./example s3://static.verseengine.cloud/examples/verse-three/example

aws --profile metaverse-dev-deploy s3 sync ${_OPTS} \
      --region ap-northeast-1 \
      --delete \
      --exclude "*.DS_Store" \
      --exclude "*.clean" \
      --cache-control "max-age=31536000" \
      ./example/asset s3://static.verseengine.cloud/examples/verse-three/example/asset

aws --profile metaverse-dev-deploy s3 sync ${_OPTS} \
      --region ap-northeast-1 \
      --delete \
      --exclude "*.DS_Store" \
      --exclude "asset/*" \
      --exclude "*.clean" \
      --cache-control "max-age=60"\
      ./demo s3://static.verseengine.cloud/examples/verse-three/demo

aws --profile metaverse-dev-deploy s3 sync ${_OPTS} \
      --region ap-northeast-1 \
      --delete \
      --exclude "*.DS_Store" \
      --exclude "*.clean" \
      --cache-control "max-age=31536000" \
      ./demo/asset s3://static.verseengine.cloud/examples/verse-three/demo/asset
