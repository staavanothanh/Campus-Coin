export interface AppConfig {
  google: {
    clientId: string;
    clientSecret: string;
    callbackUrl: string;
  };
  database: {
    host: string;
    port: number;
    user: string;
    password?: string;
    name: string;
    ssl: boolean;
    connectionLimit: number;
  };
  session: {
    cookieName: string;
    maxAgeMs: number;
    maxAgeHours: number;
    secure: boolean;
    sameSite: 'lax' | 'strict' | 'none';
    domain?: string;
  };
  app: {
    nodeEnv: string;
    port: number;
    allowedOrigins: string[];
    logLevel: string;
  };
  jev: {
    categorySuggestionEnabled: boolean;
  };
}

let _config: AppConfig | null = null;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    throw new Error(`Environment variable ${name} is required`);
  }
  return value.trim();
}

export function loadConfig(): AppConfig {
  if (_config) {
    return _config;
  }

  const clientId = requireEnv('GOOGLE_CLIENT_ID');
  const clientSecret = requireEnv('GOOGLE_CLIENT_SECRET');
  const callbackUrl = requireEnv('GOOGLE_CALLBACK_URL');

  const dbHost = requireEnv('DB_HOST');
  const dbUser = requireEnv('DB_USER');
  const dbPassword = requireEnv('DB_PASSWORD');
  const dbName = requireEnv('DB_NAME');

  _config = {
    google: {
      clientId,
      clientSecret,
      callbackUrl,
    },
    database: {
      host: dbHost,
      port: parseInt(process.env.DB_PORT || '3306', 10),
      user: dbUser,
      password: dbPassword,
      name: dbName,
      ssl: process.env.DB_SSL === 'true',
      connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '5', 10),
    },
    session: {
      cookieName: process.env.SESSION_COOKIE_NAME || 'campus_coin_session',
      maxAgeHours: parseInt(process.env.SESSION_MAX_AGE_HOURS || '24', 10),
      maxAgeMs: parseInt(process.env.SESSION_MAX_AGE_HOURS || '24', 10) * 60 * 60 * 1000,
      secure: process.env.SESSION_SECURE ? process.env.SESSION_SECURE === 'true' : process.env.NODE_ENV === 'production',
      sameSite: (process.env.SESSION_SAME_SITE as 'lax' | 'strict' | 'none') || 'lax',
      domain: process.env.SESSION_COOKIE_DOMAIN || undefined,
    },
    app: {
      nodeEnv: process.env.NODE_ENV || 'development',
      port: parseInt(process.env.PORT || '3000', 10),
      allowedOrigins: (process.env.ALLOWED_ORIGINS || '').split(',').map((o) => o.trim()).filter(Boolean),
      logLevel: process.env.LOG_LEVEL || 'info',
    },
    jev: {
      categorySuggestionEnabled: process.env.JEV_CATEGORY_SUGGESTION_ENABLED === 'true',
    },
  };

  return _config;
}

export const config = new Proxy({} as AppConfig, {
  get: (_, prop: keyof AppConfig) => {
    return loadConfig()[prop];
  },
});

export function validateConfigAtStartup(): void {
  try {
    loadConfig();
    console.log('Configuration validated');
  } catch (err) {
    if (err instanceof Error) {
      throw new Error(`Configuration validation failed: ${err.message}`);
    }
    throw err;
  }
}
