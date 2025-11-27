import { defineType, defineField } from "sanity";

export default defineType({
  name: "footer",
  title: "Footer",
  type: "document",
  fields: [
    defineField({ name: "market", type: "string" }),
    defineField({ name: "legalLinks", type: "array", of: [{ type: "string" }] }),
    defineField({ name: "social", type: "array", of: [{ type: "string" }] })
  ]
});
