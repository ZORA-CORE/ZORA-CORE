import { defineType, defineField } from "sanity";

export default defineType({
  name: "navigation",
  title: "Navigation",
  type: "document",
  fields: [
    defineField({ name: "market", type: "string" }),
    defineField({
      name: "links",
      type: "array",
      of: [
        defineField({
          name: "link",
          type: "object",
          fields: [
            defineField({ name: "label", type: "string" }),
            defineField({ name: "href", type: "url" })
          ]
        })
      ]
    })
  ]
});
