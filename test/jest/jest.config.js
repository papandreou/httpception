module.exports = {
    rootDir: require('path').resolve(__dirname, '../..'),
    testEnvironment: 'node',
    collectCoverageFrom: ['**/*.js', '!(test|coverage|node_modules)/**']
};
