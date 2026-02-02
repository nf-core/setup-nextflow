import eslint from "@eslint/js"
import ava from "eslint-plugin-ava"
import github from "eslint-plugin-github"
import simpleImportSort from "eslint-plugin-simple-import-sort"
import tseslint from "typescript-eslint"
import globals from "globals"

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  github.getFlatConfigs().recommended,
  ava.configs["flat/recommended"],
  {
    files: ["**/*.ts"],
    plugins: {
      "simple-import-sort": simpleImportSort
    },
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname
      },
      globals: globals.node
    },
    rules: {
      // Disable conflicting rules from plugins
      "i18n-text/no-en": "off",
      "eslint-comments/no-use": "off",
      "import/no-namespace": "off",
      camelcase: "off",
      semi: "off",
      "sort-imports": "off",

      // Custom overrides
      "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/no-non-null-assertion": "warn",
      "@typescript-eslint/prefer-for-of": "warn",
      "@typescript-eslint/prefer-function-type": "warn",
      "@typescript-eslint/explicit-function-return-type": [
        "error",
        { allowExpressions: true }
      ],

      // Import sorting
      "simple-import-sort/imports": "error",
      "simple-import-sort/exports": "error"
    }
  }
)
