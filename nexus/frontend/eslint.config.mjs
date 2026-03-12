import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  // Project-level rule overrides: demote to warnings while debt is being paid down.
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "@typescript-eslint/no-empty-object-type": "error",
      "react-hooks/exhaustive-deps": "error",
      "react/no-unescaped-entities": "error",
      "@next/next/no-img-element": "error",
      "prefer-const": "error",
      "no-empty": "error",
      "react-hooks/set-state-in-effect": "error",
    },
  },
]);

export default eslintConfig;

