function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(
      `[AuthConfig] La variable de entorno ${name} es obligatoria. ` +
        `Agregue un valor seguro (>= 32 bytes) en apps/api/.env. ` +
        `Ejemplo: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`,
    );
  }
  return value;
}

export const jwtConfig = {
  secret: requiredEnv('JWT_SECRET'),
  expiresIn: process.env.JWT_EXPIRES_IN || '24h',
};