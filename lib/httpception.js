var resolveNext;
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
            if (resolveNext) {
                resolveNext();
                resolveNext = undefined;
                return promiseForThisTest;
            }
        });
    }
}

var expect = require('unexpected').clone();

var originalChildMethod = expect.child;
expect.child = function () { // ...
    var child = originalChildMethod.apply(expect, arguments);
    child.notifyPendingPromise = function () {};
    return child;
};

expect.use(require('unexpected-mitm'));

var expectWithoutFootgunProtection = expect.clone();
// Disable the footgun protection of our Unexpected clone and its children:
expectWithoutFootgunProtection.notifyPendingPromise = function () {};

expect.addAssertion('<function> to perform HTTP traffic <array|object>', function (expect, promiseFactory, mockDefinition) {
    expect.errorMode = 'nested';
    return expect(promiseFactory, 'with http mocked out', mockDefinition, 'not to error')
      .then(undefined, function (err) {
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
    if (promiseFactory) {
        resolveNext = false;
        return expect(promiseFactory, 'to perform HTTP traffic', mockDefinitionForTheCurrentTest);
    } else {
        promise = promise || expect.promise(function (outerResolve, outerReject) {
            // unexpected mitm will under some circumstances exit before the
            // actual assertion body has ran to completion. It does this in an
            // attempt to cancel any remaining work in the code that is being
            // run within the mitm context, that might fail for other reasons.
            //   In our case though, as we actually start the promise when
            // httpception is called (typically in the start of the it block)
            // but only resolve it once the afterEach callback is called, it
            // means that the mitm assertion will be rejected without the error
            // having any way to propagate out to a jasmine handler.
            //   By adding the outer promise wrap, we will catch the rejection
            // and only propagate it once the inner promise is resolved by the
            // afterEach hook.

            var err;

            // TODO: Consider removing footgun protection.
            const expectPromise = expectWithoutFootgunProtection(function () {
                return expect.promise(function (resolve, reject) {
                    // this promise will be resolved once afterEach calls us.
                    resolveNext = resolve;
                }).then(() => {
                    // now we know that afterEach is ready for us to deliver the
                    // error, that might have been the rejection reason of
                    // expectPromise.

                    if (err) {
                        return outerReject(err);
                    }
                });
            }, 'with http mocked out allowing modification', mockDefinitionForTheCurrentTest, 'not to error')

            expectPromise.then(() => {
                outerResolve();
            }, expectErr => {
                err = expectErr;
                if (!resolveNext) {
                    // if resolveNext is undefined afterEach is waiting for the result.
                    outerReject(err);
                }
            });
        });
    }
};

module.exports.expect = expect;
