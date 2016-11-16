var resolveNext;
var promise;
// Hack: Register afterEach before Unexpected's footgun protection
// so we get the chance to resolve the promise returned by expect
// before it complains :)
afterEach(function () {
    if (resolveNext) {
        resolveNext();
        resolveNext = undefined;
        return promise;
    }
});

var expect = require('unexpected').clone().use(require('unexpected-mitm'));
var afterEachRegistered = false;

module.exports = function httpception(mockDefinition) {
    promise = expect(function () {
        return expect.promise(function (resolve, reject) {
            resolveNext = resolve;
        });
    }, 'with http mocked out', mockDefinition, 'not to error');
};
