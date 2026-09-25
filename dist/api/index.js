import { createApp } from '../src/app/server.js';
let handler;
export default async function vercelHandler(req, res) {
    if (!handler) {
        const { app } = await createApp();
        handler = app;
    }
    return handler(req, res);
}
//# sourceMappingURL=index.js.map