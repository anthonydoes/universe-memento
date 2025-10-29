#!/bin/bash

# Test webhook with minimal payload
SECRET="gj5Ghy&x"
PAYLOAD='{"event":"ticket_purchase","tickets":[{"id":"123"}],"cost_items":[],"events":[],"listings":[]}'

# Create signature
SIGNATURE=$(echo -n "$PAYLOAD" | openssl dgst -sha1 -hmac "$SECRET" | cut -d' ' -f2)

# Send request
curl -X POST http://localhost:3001/api/webhook \
  -H "Content-Type: application/json" \
  -H "X-Universe-Signature: $SIGNATURE" \
  -d "$PAYLOAD" \
  -v