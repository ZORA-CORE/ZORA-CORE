import Fastify from "fastify";
import sensible from "@fastify/sensible";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import { routes } from "./routes";

export async function buildServer() {
  const app = Fastify({
    logger: true
  });
  await app.register(sensible);
  await app.register(cors, { origin: true, credentials: true });
  await app.register(rateLimit, {
    max: 200,
    timeWindow: "1 minute"
  });

  app.decorateRequest("tenantId", null);
  app.addHook("preHandler", async (request, reply) => {
    const tenantId = request.headers["x-tenant"];
    if (!tenantId || typeof tenantId !== "string") {
      return reply.badRequest("Missing x-tenant header");
    }
    request.tenantId = tenantId;
  });

  await routes(app);

  return app;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  buildServer().then((app) => {
    const port = Number(process.env.PORT ?? 4000);
    app.listen({ port, host: "0.0.0.0" }).catch((err) => {
      app.log.error(err);
      process.exit(1);
    });
  });
}
