import config from "@zoracore/config/eslint";

export default {
  ...config,
  root: true,
  extends: ["next/core-web-vitals", ...config.extends],
  ignorePatterns: [".next", "dist"]
};
