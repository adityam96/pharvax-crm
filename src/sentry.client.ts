// sentry.client.ts
import * as Sentry from "@sentry/react";

Sentry.init({
    dsn: "https://c58144195e257688b38f20bb28fb9b22@o4510148582309888.ingest.us.sentry.io/4510148584013824",
    integrations: [
        Sentry.browserTracingIntegration(),
        Sentry.replayIntegration(),        // optional: session replay
        Sentry.captureConsoleIntegration({ // captures console.* as breadcrumbs
            levels: ["log", "info", "warn", "error"], // choose
        }),
    ],
    tracesSampleRate: 1.0,    // tune
    replaysSessionSampleRate: 0.01,
    replaysOnErrorSampleRate: 1.0,
    environment: process.env.NODE_ENV,
    release: "pharvaxcrm@1.0.0",
});