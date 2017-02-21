var resolveNext;
var promise;
var mockDefinitionForTheCurrentTest;

afterEach(function () {
    mockDefinitionForTheCurrentTest = undefined;
    if (resolveNext) {
        resolveNext();
        resolveNext = undefined;
        return promise;
    }
});

var expect = require('unexpected').clone().use(require('unexpected-mitm'));

var expectWithoutFootgunProtection = expect.clone();
// Disable the footgun protection of our Unexpected clone:
expectWithoutFootgunProtection.notifyPendingPromise = function () {};

module.exports = function httpception(mockDefinition, promiseFactory) {
    if (typeof mockDefinition === 'function') {
        promiseFactory = mockDefinition;
        mockDefinition = undefined;
    }
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
        if (promiseFactory) {
            return expect(function () {
                var promise = promiseFactory();
                if (!promise || typeof promise.then !== 'function') {
                    throw new Error('httpception: You must return a promise from the supplied function');
                }
                return promise;
            }, 'with http mocked out', mockDefinition, 'not to error');
        } else {
            mockDefinitionForTheCurrentTest = mockDefinition;
            promise = expectWithoutFootgunProtection(function () {
                return expect.promise(function (resolve, reject) {
                    resolveNext = resolve;
                });
            }, 'with http mocked out', mockDefinitionForTheCurrentTest, 'not to error');
        }
    }
};
