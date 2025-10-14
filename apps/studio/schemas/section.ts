import { defineType, defineField } from "sanity";

export default defineType({
  name: "section",
  title: "Section",
  type: "object",
  fields: [
    defineField({ name: "heading", type: "string" }),
    defineField({ name: "body", type: "array", of: [{ type: "block" }] }),
    defineField({ name: "component", type: "string", description: "Optional React component mapping" })
  ]
});
