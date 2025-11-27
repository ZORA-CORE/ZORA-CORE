import { defineType, defineField } from "sanity";

export default defineType({
  name: "announcementBar",
  title: "Announcement Bar",
  type: "document",
  fields: [
    defineField({ name: "market", type: "string" }),
    defineField({ name: "message", type: "string" }),
    defineField({ name: "active", type: "boolean" })
  ]
});
