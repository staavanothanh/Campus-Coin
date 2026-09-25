export declare function generateSecureRandom(bytes: number): string;
export declare function sha256(input: string): string;
export declare function generatePKCE(): {
    codeVerifier: string;
    codeChallenge: string;
};
export declare function generateSessionId(): string;
export declare function generateCsrfToken(): string;
export declare function generateState(): string;
export declare function generateNonce(): string;
export declare function generateUUID(): string;
export declare function timingSafeEqual(a: string, b: string): boolean;
