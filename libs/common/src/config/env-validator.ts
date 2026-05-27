export function validateRequiredEnv(keys: string[], serviceName: string): void {
  const missing = keys.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(
      `[${serviceName}] Fail-fast: missing required environment variables: ${missing.join(", ")}`,
    );
  }
}
