#!/bin/sh
echo "[wait-for-fastapi] waiting for FastAPI on port 8000..."
until curl -s --output /dev/null --connect-timeout 1 http://127.0.0.1:8000/; do
  sleep 1
done
echo "[wait-for-fastapi] FastAPI ready, starting NestJS."
exec npm start
