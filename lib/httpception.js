var UnexpectedMitmMocker = require('unexpected-mitm/lib/UnexpectedMitmMocker');

var resolveFromAfterEach;
var mocker;
var promise;
var mockDefinitionForTheCurrentTest;

var afterEachRegistered = false;
function ensureAfterEachIsRegistered() {
    if (typeof afterEach === 'function' && !afterEachRegistered) {
        afterEachRegistered = true;
        afterEach(function () {
            mockDefinitionForTheCurrentTest = undefined;
            var promiseForThisTest = promise;
            promise = undefined;
            if (resolveFromAfterEach) {
                resolveFromAfterEach();
                resolveFromAfterEach = undefined;
                return promiseForThisTest;
            }
        });
    }
}

var expect = require('unexpected').clone();

expect.use(require('unexpected-mitm'));

var originalChildMethod = expect.child;
expect.child = function () { // ...
    var child = originalChildMethod.apply(expect, arguments);
    child.notifyPendingPromise = function () {};
    return child;
};

expect.addAssertion('<function> to perform HTTP traffic <array|object>', function (expect, promiseFactory, mockDefinition) {
    expect.errorMode = 'default';
    return expect(mocker, 'to be complete')
      .catch(function (err) {
          var e = err;
          var seenMessySubject = false;
          while (e.parent) {
              e = e.parent;
              if (e && e.expect && e.expect.subject && (e.expect.subject.isMessyHttpConversation || e.expect.subject.isMessyHttpExchange)) {
                  seenMessySubject = true;
                  break;
              }
          }
          if (seenMessySubject) {
              err.parent = err.parent.parent;
              err.parent.errorMode = 'diff';
          } else if (err.originalError) {
              err = err.originalError;
          }
          throw err;
      });
});

// When running in jasmine/node.js, afterEach is available immediately,
// but doesn't work within the it block. Register the hook immediately:
ensureAfterEachIsRegistered();

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

    mocker = mocker || new UnexpectedMitmMocker({
        descriptions: mockDefinitionForTheCurrentTest
    });

    if (promiseFactory) {
        resolveFromAfterEach = false;

        return mocker.mock(promiseFactory).then(function () {
            return expect(promiseFactory, 'to perform HTTP traffic', mocker.descriptions);
        }).then(function () {
            mocker = undefined;
        }).catch(function (e) {
            mocker = undefined;
            throw e;
        });
    } else if (!promise) {
        var resolvePromise = expect.promise(function (resolve, reject) {
            resolveFromAfterEach = resolve;
        });
        promise = expect.promise(function () {
            return mocker.mock(function () {
                return resolvePromise;
            });
        }).then(function () {
            return expect(function afterEach() {}, 'to perform HTTP traffic', mocker.descriptions);
        }).then(function () {
            mocker = undefined;
        }).catch(function (e) {
            mocker = undefined;
            throw e;
        });
    }
};

module.exports.expect = expect;
