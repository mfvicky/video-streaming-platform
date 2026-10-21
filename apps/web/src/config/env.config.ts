const getEnvVar = (key: keyof ImportMetaEnv): string => {
  const value = import.meta.env[key];
  if (!value) throw new Error(`Missing environment variable: ${key}`);
  return value;
};

// Public RSA key and API URL are the only variables the browser needs.
// MinIO is intentionally private; no storage credentials or internal hostnames go to Vite.
export const env = {
  API_URL: getEnvVar('VITE_API_URL'),
  RSA_PUBLIC_KEY: getEnvVar('VITE_RSA_PUBLIC_KEY'),
} as const;
