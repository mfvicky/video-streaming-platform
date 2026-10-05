const getEnvVar = (key: keyof ImportMetaEnv): string => {
  const value = import.meta.env[key];
  if (!value) {
    throw new Error(`Missing environment variable: ${key}`);
  }
  return value;
};

export const env = {
  API_URL: getEnvVar('VITE_API_URL'),
  APP_NAME: getEnvVar('VITE_APP_NAME'),
  MINIO_ENDPOINT: getEnvVar('VITE_MINIO_ENDPOINT'),
  MINIO_BUCKET_VIDEOS: getEnvVar('VITE_MINIO_BUCKET_VIDEOS'),
  MINIO_BUCKET_THUMBNAILS: getEnvVar('VITE_MINIO_BUCKET_THUMBNAILS'),
  RSA_PUBLIC_KEY: getEnvVar('VITE_RSA_PUBLIC_KEY'),
} as const;