import globals from "globals";
import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";

export default [
  {
    ignores: ["dist/**", "functions/**", "node_modules/**", ".idx/**"],
  },
  
  js.configs.recommended,
  
  reactHooks.configs.flat.recommended,
  
  {
    files: ["src/**/*.{js,jsx}"],
    
    languageOptions: {
      globals: {
        ...globals.browser,
      },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    
    plugins: {
      "react-refresh": reactRefresh,
    },
    
    rules: {
      "react-refresh/only-export-components": "warn",
      "no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }],
      "react/prop-types": "off",
      "react/react-in-jsx-scope": "off"
    },
  },
];
