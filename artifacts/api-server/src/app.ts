import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { clerkMiddleware } from "@clerk/express";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { clerkProxyMiddleware, CLERK_PROXY_PATH } from "./middlewares/clerkProxyMiddleware";

const app: Express = express();
const sessionSecret = process.env.SESSION_SECRET;
const clerkSecretKey = process.env.CLERK_SECRET_KEY;
const clerkPublishableKey = process.env.CLERK_PUBLISHABLE_KEY;
if (!sessionSecret) throw new Error("SESSION_SECRET is required to protect quote-request cookies.");
if (!clerkSecretKey || !clerkPublishableKey) {
  throw new Error("Clerk must be configured before the API server can start.");
}

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser(sessionSecret));
app.use(clerkMiddleware({ secretKey: clerkSecretKey, publishableKey: clerkPublishableKey }));

app.use("/api", router);

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error(
    { errorName: error instanceof Error ? error.name : "UnknownError" },
    "API request failed",
  );
  if (!res.headersSent) res.status(500).json({ message: "The service could not complete this request. Please try again." });
});

export default app;
