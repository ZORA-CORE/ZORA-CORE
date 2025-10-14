import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { contentService } from "../services/content";
import { userService } from "../services/users";
import { paymentsService } from "../services/payments";
import { localeService } from "../services/locale";
import { searchService } from "../services/search";

const LocaleSchema = z.object({ code: z.string().min(2) });

export async function routes(app: FastifyInstance) {
  app.get("/v1/content", async (request) => {
    const tenant = request.tenantId as string;
    return contentService.listCollections({ tenant });
  });

  app.get("/v1/users", async (request) => {
    const tenant = request.tenantId as string;
    return userService.list({ tenant });
  });

  app.get("/v1/payments", async (request) => {
    const tenant = request.tenantId as string;
    return paymentsService.summary({ tenant });
  });

  app.get("/v1/locale/:code", async (request, reply) => {
    const tenant = request.tenantId as string;
    const params = LocaleSchema.safeParse(request.params);
    if (!params.success) {
      reply.badRequest("Invalid locale");
      return;
    }
    return localeService.get({ tenant, code: params.data.code });
  });

  app.get("/v1/search", async (request) => {
    const tenant = request.tenantId as string;
    const query = (request.query as { q?: string })?.q ?? "";
    return searchService.query({ tenant, term: query });
  });
}
