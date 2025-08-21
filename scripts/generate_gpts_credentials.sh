#!/bin/bash

# Usage: ./generate_gpts_credentials.sh path/to/auth.json path/to/gpts.json

AUTH_FILE="$1"
GPTS_FILE="$2"

if [[ ! -f "$AUTH_FILE" || ! -f "$GPTS_FILE" ]]; then
  echo "Usage: $0 path/to/auth.json path/to/gpts.json"
  exit 1
fi

EXISTING_USERS=$(jq -r '.users[]' "$AUTH_FILE" | cut -d':' -f1)
GPT_IDS=$(jq -r 'keys[]' "$GPTS_FILE")

TMP_UPDATED_AUTH=$(mktemp)
cp "$AUTH_FILE" "$TMP_UPDATED_AUTH"

echo -e "GPT ID\t\t\tPassword\t\tBase64 Auth"
echo "---------------------------------------------"

for gpt_id in $GPT_IDS; do
  if echo "$EXISTING_USERS" | grep -qx "$gpt_id"; then
    continue
  fi

  password=$(openssl rand -base64 20 | tr -dc 'a-zA-Z0-9' | head -c15)
  base64_auth=$(echo -n "$gpt_id:$password" | base64)

  echo -e "$gpt_id\t$base64_auth"

  # Append new entry to the JSON array
  jq --arg entry "$gpt_id:$password" '.users += [$entry]' "$TMP_UPDATED_AUTH" > "$TMP_UPDATED_AUTH.new" && mv "$TMP_UPDATED_AUTH.new" "$TMP_UPDATED_AUTH"
done

mv "$TMP_UPDATED_AUTH" "$AUTH_FILE"
echo "✅ Updated $AUTH_FILE with new users."
