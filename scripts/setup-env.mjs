import { randomBytes, generateKeyPairSync } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const destination = resolve(root, '.env');
if (existsSync(destination)) {
  console.error(
    '.env already exists. Refusing to overwrite your local secrets.',
  );
  process.exit(1);
}
// The fallback is deliberately named without a leading dot so that setup still
// works when a copy/extraction utility accidentally omits hidden files on macOS.
const primaryTemplate = resolve(root, '.env.example');
const fallbackTemplate = resolve(root, 'scripts', 'env.example.txt');
const templatePath = existsSync(primaryTemplate)
  ? primaryTemplate
  : fallbackTemplate;
if (!existsSync(templatePath)) {
  console.error(
    'Configuration template is missing. Re-extract the complete project ZIP (including hidden files) and retry.',
  );
  process.exit(1);
}
if (templatePath === fallbackTemplate) {
  console.log(
    'Root .env.example not found; using scripts/env.example.txt instead.',
  );
}
let template = readFileSync(templatePath, 'utf8');
const { publicKey, privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { format: 'pem', type: 'spki' },
  privateKeyEncoding: { format: 'pem', type: 'pkcs1' },
});
const replacements = {
  POSTGRES_PASSWORD: randomBytes(24).toString('hex'),
  RABBITMQ_DEFAULT_PASS: randomBytes(24).toString('hex'),
  MINIO_ROOT_PASSWORD: randomBytes(24).toString('hex'),
  JWT_SECRET: randomBytes(48).toString('hex'),
  REFRESH_SECRET: randomBytes(48).toString('hex'),
  RSA_PUBLIC_KEY: publicKey.trim().replaceAll('\n', '\\n'),
  RSA_PRIVATE_KEY: privateKey.trim().replaceAll('\n', '\\n'),
};
for (const [key, value] of Object.entries(replacements)) {
  template = template.replace(
    new RegExp(`^${key}=.*$`, 'm'),
    `${key}=${value}`,
  );
}
writeFileSync(destination, template, { mode: 0o600, flag: 'wx' });
console.log(
  'Created .env with random local secrets and an RSA key pair. Do not commit this file.',
);
