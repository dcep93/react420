#!/bin/bash

set -euo pipefail

cd app/danReact
npm install
yarn build
rm -rf node_modules
