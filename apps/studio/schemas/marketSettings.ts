import { defineType, defineField } from "sanity";

export default defineType({
  name: "marketSettings",
  title: "Market Settings",
  type: "document",
  fields: [
    defineField({ name: "market", type: "string", options: { list: ["dk", "se", "pl", "ee", "gl", "is", "no", "fi", "ai", "app"] } }),
    defineField({ name: "theme", type: "string" }),
    defineField({ name: "imagery", type: "string" }),
    defineField({ name: "tone", type: "text" })
  ]
});
