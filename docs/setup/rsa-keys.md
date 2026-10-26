# RSA Keys and Environment Setup — First Run

**Why?** The frontend encrypts passwords using the RSA public key. The API needs the matching private key to decrypt them. You also need database, RabbitMQ, object storage and JWT secrets.

## 1. First-time setup

Run these commands **from the project root**:

```bash
corepack pnpm install --frozen-lockfile
node scripts/setup-env.mjs
```

What the existing `scripts/setup-env.mjs` does:

1. Reads `.env.example` (or its fallback `scripts/env.example.txt`).
2. Generates a **2048-bit RSA public/private key pair**.
3. Generates random local secrets for PostgreSQL, RabbitMQ, SILO, JWT and refresh tokens.
4. Writes the values to a new root `.env` file.

**Important:** The script intentionally refuses to overwrite an existing `.env`. If your environment already works, **do not re-run it**. Do not replace the key pair while existing users rely on it.

## 2. Check configuration without exposing secrets

**PowerShell:**

```powershell
Test-Path .env
Select-String -Path .env -Pattern '^RSA_PUBLIC_KEY=', '^RSA_PRIVATE_KEY=' | ForEach-Object { $_.Line -replace '=.*$', '=[configured]' }
```

Expected: `True` and both key names displayed as `[configured]`. This confirms the entries are present, **not** that the keys are cryptographically valid.

## 3. Build and start

```bash
corepack pnpm run build
docker compose config --quiet
docker compose up -d --build
docker compose ps -a
```

Expected: API/Web and infrastructure are healthy, worker is running, migrations have `Exited (0)`.

## 4. Keep secrets safe

- Never commit `.env`, RSA private keys or access tokens.
- Keep `.env.example` free of real credentials.
- The browser needs only the **public** key; never expose `RSA_PRIVATE_KEY` to Vite.
- Root `.env` values are supplied to services by Docker Compose.

Next: [Local Development](local-development.md) or [Troubleshooting](../verification/troubleshooting.md).
