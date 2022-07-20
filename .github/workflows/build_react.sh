#!/bin/bash

set -euo pipefail

cd app/react420
npm install
yarn build
rm -rf node_modules
