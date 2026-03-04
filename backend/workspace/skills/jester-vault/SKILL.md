---
name: jester-vault
description: >
  Secure secret manager. Stores, retrieves, and manages API keys and secrets.
  Triggered by /vault, messages matching KEY=value format, or requests to
  store/retrieve/manage secrets, tokens, or API keys.
requires:
  env: []
  bins: ["python3"]
---

# Secret Vault — Encrypted Secret Manager

You are the **Vault** component of Machine Jester.
All secrets are stored encrypted in the workspace using AES-256-GCM.

## Vault File Location

`~/openclaw_workspace/vault.enc.json`

(Path injected by setup — use the workspace path from your config)

## Behavior

### Store a Secret

When user sends `KEY_NAME=value` or `/vault KEY_NAME=value`:

1. Run this script to encrypt and store:

```bash
python3 << 'EOF'
import os, json, base64, hashlib
from pathlib import Path
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

VAULT_KEY = os.environ.get("VAULT_KEY", "")
VAULT_FILE = Path(os.environ.get("VAULT_FILE", "vault.enc.json"))

if not VAULT_KEY:
    print("ERROR: VAULT_KEY not set in environment")
    exit(1)

name = "NAME_PLACEHOLDER"
value = "VALUE_PLACEHOLDER"

# Derive 32-byte key
key = hashlib.sha256(VAULT_KEY.encode()).digest()
nonce = os.urandom(12)
aesgcm = AESGCM(key)
ciphertext = aesgcm.encrypt(nonce, value.encode(), None)
token = base64.urlsafe_b64encode(nonce + ciphertext).decode()

# Mask for display
visible = min(3, len(value) // 4)
masked = value[:visible] + "·" * max(6, len(value) - visible * 2) + value[-visible:] if len(value) > 6 else "·" * 8

# Load or create vault
vault = json.loads(VAULT_FILE.read_text()) if VAULT_FILE.exists() else {}
from datetime import date
vault[name] = {"token": token, "masked": masked, "date": str(date.today())}
VAULT_FILE.write_text(json.dumps(vault, indent=2))

print(f"STORED:{name}:{masked}")
EOF
```

2. Replace `NAME_PLACEHOLDER` and `VALUE_PLACEHOLDER` with actual values before running.

3. Respond to user:
```
🔐 Vault — Stored

`KEY_NAME` → `sk·············xxx`

AES-256-GCM encrypted. Never leaves your server.

Usage in code:
import os
value = os.environ["KEY_NAME"]  # injected at runtime
```

### List Secrets

When user sends `/vault` with no arguments:

```bash
python3 -c "
import json, os
from pathlib import Path
f = Path(os.environ.get('VAULT_FILE', 'vault.enc.json'))
if not f.exists():
    print('EMPTY')
else:
    v = json.loads(f.read_text())
    for k, d in v.items():
        print(f\"{k}|{d['masked']}|{d['date']}\")
"
```

Format the output as:
```
🔐 Your Vault — N secrets

`KEY_NAME` → `sk·····xxx` (2024-01-15)
`STRIPE_KEY` → `pk·······xxx` (2024-01-10)

Send KEY=value to add · Send DEL:KEY to remove
```

### Delete a Secret

When user sends `DEL:KEY_NAME`:

```bash
python3 -c "
import json, os
from pathlib import Path
f = Path(os.environ.get('VAULT_FILE', 'vault.enc.json'))
v = json.loads(f.read_text()) if f.exists() else {}
name = 'KEY_NAME_PLACEHOLDER'
if name in v:
    del v[name]
    f.write_text(json.dumps(v, indent=2))
    print(f'DELETED:{name}')
else:
    print(f'NOT_FOUND:{name}')
"
```

### Retrieve for Code Injection

When generating code that uses a stored secret (detected because the skill name
matches a vault entry), tell the user:
"Your `KEY_NAME` from Vault will be injected as an environment variable when this runs."

Show the injection snippet:
```python
import os
api_key = os.environ["KEY_NAME"]  # from Machine Jester Vault
```

## Security Note

The vault file is encrypted with AES-256-GCM.
The VAULT_KEY env var is the only way to decrypt it.
Keep VAULT_KEY in your `.env` file — never share it.
