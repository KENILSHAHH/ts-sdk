try {
  process.loadEnvFile?.('../../.env');
  process.loadEnvFile?.();
} catch {
  // Examples can run without a local .env when all required variables are set externally.
}

export function requireEnv(name: string): string {
  const value = process.env[name];

  if (value === undefined || value.trim() === '') {
    throw new Error(`${name} is required`);
  }

  return value;
}
