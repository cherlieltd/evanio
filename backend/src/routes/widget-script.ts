import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Hono } from "hono";
import { cors } from "hono/cors";

export const widgetScriptRoutes = new Hono();

const scriptPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../public/widget.js",
);

let cached: string | null = null;

widgetScriptRoutes.use(
  "*",
  cors({
    origin: "*",
    allowMethods: ["GET", "OPTIONS"],
  }),
);

widgetScriptRoutes.get("/widget.js", async (c) => {
  try {
    if (!cached || process.env.NODE_ENV !== "production") {
      cached = await readFile(scriptPath, "utf8");
    }
    c.header("Content-Type", "application/javascript; charset=utf-8");
    c.header("Cache-Control", "public, max-age=300");
    return c.body(cached);
  } catch (error) {
    console.error("Failed to serve widget.js", error);
    return c.text("// widget unavailable", 500);
  }
});
