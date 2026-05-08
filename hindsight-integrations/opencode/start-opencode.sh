#!/usr/bin/env bash

set -eufv -o pipefail

export HINDSIGHT_API_URL="http://localhost:8888"
export HINDSIGHT_BANK_ID="hindsight-opencode-multibank"

opencode
