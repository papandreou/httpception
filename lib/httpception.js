var resolveNext;
var promise;
var mockDefinitionForTheCurrentTest;
// Hack: Register afterEach before Unexpected's footgun protection
// so we get the chance to resolve the promise returned by expect
// before it complains :)
afterEach(function () {
    mockDefinitionForTheCurrentTest = undefined;
    if (resolveNext) {
        resolveNext();
        resolveNext = undefined;
        return promise;
    }
});

var expect = require('unexpected').clone().use(require('unexpected-mitm'));

// Disable the footgun protection of our Unexpected clone:
expect.notifyPendingPromise = function () {};

module.exports = function httpception(mockDefinition) {
    if (!Array.isArray(mockDefinition)) {
        if (mockDefinition) {
            mockDefinition = [mockDefinition];
        } else {
            mockDefinition = [];
        }
    }
    if (mockDefinitionForTheCurrentTest) {
        Array.prototype.push.apply(mockDefinitionForTheCurrentTest, mockDefinition);
    } else {
        mockDefinitionForTheCurrentTest = mockDefinition;
        promise = expect(function () {
            return expect.promise(function (resolve, reject) {
                resolveNext = resolve;
            });
        }, 'with http mocked out', mockDefinitionForTheCurrentTest, 'not to error');
    }
};
