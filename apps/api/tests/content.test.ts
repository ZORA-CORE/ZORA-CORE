import { describe, expect, it } from "vitest";
import { contentService } from "../src/services/content";

describe("contentService", () => {
  it("returns pages for a known tenant", () => {
    const result = contentService.listCollections({ tenant: "dk" });
    expect(result.market).toBe("dk");
    expect(result.pages.length).toBeGreaterThan(0);
  });
});
