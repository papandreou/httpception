module.exports = {
  rootDir: require('path').resolve(__dirname, '../..'),
  testEnvironment: 'node',
  testPathIgnorePatterns: ['/node_modules/', '/integration-test/'],
  collectCoverageFrom: ['**/*.js', '!(test|coverage|node_modules)/**'],
};
