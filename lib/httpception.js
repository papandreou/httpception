var resolveNext;
var promise;
var mockDefinitionForTheCurrentTest;

var afterEachRegistered = false;
function ensureAfterEachIsRegistered() {
    if (!afterEachRegistered) {
        afterEachRegistered = true;
        afterEach(function () {
            mockDefinitionForTheCurrentTest = undefined;
            if (resolveNext) {
                resolveNext();
                resolveNext = undefined;
                return promise;
            }
        });
    }
}

var expect = require('unexpected').clone().use(require('unexpected-mitm'));

var expectWithoutFootgunProtection = expect.clone();
// Disable the footgun protection of our Unexpected clone:
expectWithoutFootgunProtection.notifyPendingPromise = function () {};

expect.addAssertion('<function> to perform HTTP traffic <array|object>', function (expect, promiseFactory, mockDefinition) {
    expect.errorMode = 'diff';
    return expect(promiseFactory, 'with http mocked out', mockDefinition, 'not to error');
});

module.exports = function httpception(mockDefinition, promiseFactory) {
    ensureAfterEachIsRegistered();
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
        mockDefinitionForTheCurrentTest = mockDefinition;
    }
    if (promiseFactory) {
        resolveNext = false;
        return expect(promiseFactory, 'to perform HTTP traffic', mockDefinitionForTheCurrentTest);
    } else {
        promise = expectWithoutFootgunProtection(function () {
            return expect.promise(function (resolve, reject) {
                resolveNext = resolve;
            });
        }, 'with http mocked out allowing modification', mockDefinitionForTheCurrentTest, 'not to error');
    }
};
