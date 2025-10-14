import { defineType, defineField } from "sanity";

export default defineType({
  name: "page",
  title: "Page",
  type: "document",
  fields: [
    defineField({ name: "title", type: "string" }),
    defineField({ name: "slug", type: "slug", options: { source: "title", maxLength: 96 } }),
    defineField({ name: "market", type: "string", options: { list: ["dk", "se", "pl", "ee", "gl", "is", "no", "fi", "ai", "app"] } }),
    defineField({ name: "sections", type: "array", of: [{ type: "section" }] }),
    defineField({ name: "culturalNotes", type: "text", description: "Guidance for local copywriters" })
  ]
});
