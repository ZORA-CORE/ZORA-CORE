import { defineConfig } from "sanity";
import { deskTool } from "sanity/desk";
import schemas from "./schemas";

export default defineConfig({
  name: "zoracore-studio",
  title: "ZORA CORE Studio",
  projectId: "example",
  dataset: "production",
  plugins: [deskTool()],
  schema: {
    types: schemas
  }
});
