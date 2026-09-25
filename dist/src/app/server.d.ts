export declare function createApp(): Promise<{
    app: import("express-serve-static-core").Express;
    pool: import("mysql2/promise").Pool;
}>;
