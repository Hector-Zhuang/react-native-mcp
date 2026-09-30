module.exports = {
  root: true,
  ignorePatterns: ['node_modules/', 'lib/', 'dist/', 'build/', 'coverage/'],
  overrides: [
    {
      files: ['packages/*/src/**/*.{ts,tsx}'],
      excludedFiles: ['packages/gateway/**', 'examples/**'],
      extends: ['@react-native', 'prettier'],
    },
    {
      files: ['packages/gateway/src/**/*.ts', 'examples/**/*.ts'],
      env: { node: true, es2022: true },
      parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
      extends: ['prettier'],
    },
  ],
};
