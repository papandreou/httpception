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

// Please look the other way:
var originalAfterEach = afterEach;
afterEach = null;
delete require.cache[require.resolve('unexpected')];
delete require.cache[require('path').resolve(require.resolve('unexpected'), './notifyPendingPromise.js')];
delete require.cache[require('path').resolve(require.resolve('unexpected'), './Unexpected.js')];
var expect = require('unexpected').clone().use(require('unexpected-mitm'));
afterEach = originalAfterEach;

module.exports = function httpception(mockDefinition) {
    promise = expect(function () {
        return expect.promise(function (resolve, reject) {
            resolveNext = resolve;
        });
    }, 'with http mocked out', mockDefinition, 'not to error');
};
