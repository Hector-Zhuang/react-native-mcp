module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/packages'],
  testMatch: ['**/__tests__/**/*.test.(ts|tsx)'],
  moduleNameMapper: {
    '^@react-native-mcp/([^/]+)$': '<rootDir>/packages/$1/src/index.ts',
  },
  modulePathIgnorePatterns: ['/lib/', '/dist/'],
  transform: {
    '^.+\\.(ts|tsx|js|jsx)$': 'babel-jest',
  },
};
