import { Hono } from "hono";

export const healthRoutes = new Hono();

healthRoutes.get("/health", (c) => {
  const supabaseConfigured = Boolean(
    process.env.SUPABASE_URL &&
      process.env.SUPABASE_ANON_KEY &&
      process.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  return c.json({
    status: "ok",
    service: "evanio-api",
    timestamp: new Date().toISOString(),
    checks: {
      supabaseEnv: supabaseConfigured,
      stripeEnv: Boolean(process.env.STRIPE_SECRET_KEY),
      brevoEnv: Boolean(process.env.BREVO_API_KEY),
    },
  });
});
