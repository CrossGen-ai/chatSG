#!/bin/bash
cd "$(dirname "$0")"
source ../.env
python3 -m uvicorn src.main:app --host 0.0.0.0 --port 8001