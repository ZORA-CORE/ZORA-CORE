import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default {
  root: true,
  env: {
    browser: true,
    es2022: true,
    node: true
  },
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: path.join(__dirname, "../../tsconfig/base.json"),
    tsconfigRootDir: path.join(__dirname, "../../..")
  },
  plugins: ["@typescript-eslint", "jsx-a11y", "security"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:jsx-a11y/recommended",
    "plugin:security/recommended",
    "plugin:prettier/recommended"
  ],
  rules: {
    "@typescript-eslint/consistent-type-imports": "warn",
    "security/detect-object-injection": "off"
  }
};
