#!/usr/bin/env bash

set -eufv -o pipefail

export HINDSIGHT_API_LLM_PROVIDER=openai
export HINDSIGHT_API_LLM_BASE_URL=https://api-chat.helbling.ch/vllm/qwen3-coder-next/v1
export HINDSIGHT_API_LLM_API_KEY=asdf
export HINDSIGHT_API_LLM_MODEL=qwen3-coder-next

hindsight-api
