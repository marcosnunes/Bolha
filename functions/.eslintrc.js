module.exports = {
  root: true,
  env: {
    es6: true,
    node: true, // Informa ao ESLint sobre o ambiente Node.js
  },
  extends: [
    "eslint:recommended",
    "google",
  ],
  rules: {
    "quotes": ["error", "double"],
  },
  parserOptions: {
    // Required for top-level await
    "ecmaVersion": 2020,
  },
};