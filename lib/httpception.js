var resolveFromAfterEach;
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
        resolveFromAfterEach = false;
        return expect(promiseFactory, 'to perform HTTP traffic', mockDefinitionForTheCurrentTest);
    } else {
        promise = promise || expect.promise(function (outerResolve, outerReject) {
            // unexpected-mitm will eagerly fail an assertion when it finds a
            // mismatch in a request and passes an error back instead of the
            // result. This means that we need to anticipate two different error
            // scenarios.
            //   We cannot just return the promise from mitm, as it might cause
            // an unhandled rejection if our afterEach handler haven't been
            // called yet when it is rejected.
            //   Through the use of an outer promise wrap we can artificially
            // delay the resolution of the promise until we know that the
            // afterEach hook code is listening in the other end.

            var deferredError;

            const mitmAssertion = expectWithoutFootgunProtection(
                function () {
                    const innerPromise = expect.promise(function (resolve, reject) {
                        // This promise will be resolved once afterEach calls us.
                        resolveFromAfterEach = resolve;
                    }).then(() => {
                        // At this point we know that afterEach is ready for us
                        // to handle the response, but the mitmAssertion might
                        // already have rejected the promise. If `deferredError`
                        // is NOT undefined, we need to reject the outer
                        // promise.
                        //   If mitmAssertion rejected early, we had no where to
                        // pass the rejection to, which is why we need this
                        // nested promise trickery.
                        if (deferredError) {
                            outerReject(deferredError);
                        }
                    });

                    return innerPromise;
                },
                'with http mocked out allowing modification',
                mockDefinitionForTheCurrentTest,
                'not to error'
            );

            mitmAssertion.then(() => {
                // mitmAssertion will only resolve if there's no errors in the
                // mocked out traffic, which means that at this point we know
                // that the innerPromise have run, which will only happen after
                // afterEach has run, so we can safely resolve the promise, as
                // we know afterEach will be waiting for it.
                outerResolve();
            }, err => {
                if (!resolveFromAfterEach) {
                    // If resolveFromAfterEach has been unset, we know that
                    // afterEach is waiting for the response already. Rejecting
                    // the outer promise immediately and not setting the err to
                    // avoid the innerPromise trying to reject again.
                    return outerReject(err);
                }
                // Defer rejection until innerPromise has been resolved.
                deferredError = err;
            });
        });
    }
};

module.exports.expect = expect;
