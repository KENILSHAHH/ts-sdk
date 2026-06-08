try {
  process.loadEnvFile?.('../../.env');
} catch {
  // Examples can run without a repo-level .env when variables are set elsewhere.
}

try {
  process.loadEnvFile?.();
} catch {
  // Examples can run without a local .env when variables are set elsewhere.
}

export function requireEnv(name: string): string {
  const value = process.env[name];

  if (value === undefined || value.trim() === '') {
    throw new Error(`${name} is required`);
  }

  return value;
}
