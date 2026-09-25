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
export declare function loadConfig(): AppConfig;
export declare const config: AppConfig;
export declare function validateConfigAtStartup(): void;
