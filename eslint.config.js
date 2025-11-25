import globals from "globals";
import pluginJs from "@eslint/js";
import pluginReact from "eslint-plugin-react"; // Importa o plugin diretamente
import pluginReactHooks from "eslint-plugin-react-hooks";
import pluginReactRefresh from "eslint-plugin-react-refresh";

export default [
  // Configuração Global (ignora pastas)
  {
    ignores: ["dist", "node_modules", "functions/node_modules", "functions/.eslintrc.js"]
  },

  // Configuração para o Frontend (pasta src/)
  {
    files: ["src/**/*.{js,mjs,jsx,ts,tsx}"],
    plugins: {
      react: pluginReact, // Define o plugin com o nome "react"
      "react-hooks": pluginReactHooks,
      "react-refresh": pluginReactRefresh,
    },
    languageOptions: { 
      parserOptions: { 
        ecmaFeatures: { jsx: true } 
      },
      globals: {
        ...globals.browser,
        ...globals.es2020
      }
    },
    rules: {
      ...pluginJs.configs.recommended.rules,
      ...pluginReact.configs.recommended.rules, // Usa as regras do plugin importado
      ...pluginReactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      "no-unused-vars": ["warn", { "args": "none" }],
    },
    settings: {
      react: {
        version: "detect"
      }
    }
  },

  // Configuração para o Backend (pasta functions/)
  {
    files: ["functions/**/*.js"],
    languageOptions: { 
        globals: {
            ...globals.node,
            ...globals.es2020
        }
    },
    rules: {
      ...pluginJs.configs.recommended.rules,
      "no-undef": "error"
    }
  }
];