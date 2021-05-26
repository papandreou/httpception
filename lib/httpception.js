const UnexpectedMitmMocker = require('unexpected-mitm/lib/UnexpectedMitmMocker');

let resolveFromAfterEach;
let mocker;
let promise;
let promiseFactoryForCurrentTest;
let mockDefinitionForTheCurrentTest;

let afterEachRegistered = false;
function ensureAfterEachIsRegistered() {
  if (typeof afterEach === 'function' && !afterEachRegistered) {
    afterEachRegistered = true;
    afterEach(function () {
      mockDefinitionForTheCurrentTest = undefined;
      const promiseForThisTest = promise;
      promise = undefined;
      if (resolveFromAfterEach) {
        resolveFromAfterEach();
        resolveFromAfterEach = undefined;
        return promiseForThisTest;
      }
    });
  }
}

const expect = require('unexpected').clone();

expect.use(require('unexpected-mitm/lib/mockerAssertions'));

const originalChildMethod = expect.child;
expect.child = function () {
  // ...
  const child = originalChildMethod.apply(expect, arguments);
  child.notifyPendingPromise = function () {};
  return child;
};

expect.addAssertion(
  '<function> to perform HTTP traffic <array|object>',
  function (expect, promiseFactory, mockDefinition) {
    expect.errorMode = 'default';
    return expect(mocker, 'to be complete');
  }
);

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

  mocker =
    mocker ||
    new UnexpectedMitmMocker({
      requestDescriptions: mockDefinitionForTheCurrentTest,
    });

  if (promiseFactory) {
    promiseFactoryForCurrentTest = promiseFactory;

    if (resolveFromAfterEach) {
      // We were previously called to enqueue a mock. Critically, this created
      // a partially open mocker.. we MUST use that initial instance rather than
      // create a new instance. Latch the promise factory into the existing chain.
      const quietedPromise = promiseFactory().catch(() => {});
      resolveFromAfterEach(quietedPromise);
      resolveFromAfterEach = undefined;
      const promiseToReturn = promise;
      promise = undefined;
      return promiseToReturn;
    }

    return mocker
      .mock(promiseFactory)
      .then(function () {
        return expect(
          promiseFactory,
          'to perform HTTP traffic',
          mocker.requestDescriptions
        );
      })
      .then(function () {
        mocker = undefined;
      })
      .catch(function (e) {
        mocker = undefined;
        throw e;
      });
  } else if (!promise) {
    const resolvePromise = expect.promise(function (resolve, reject) {
      resolveFromAfterEach = resolve;
    });

    const mockerPromise = expect.promise(function () {
      return mocker.mock(function () {
        return resolvePromise;
      });
    });

    promise = Promise.all([resolvePromise, mockerPromise])
      .then((result) => {
        const functionToInspect =
          promiseFactoryForCurrentTest || function afterEach() {};

        promiseFactoryForCurrentTest = undefined;

        return expect(
          functionToInspect,
          'to perform HTTP traffic',
          mocker.requestDescriptions
        );
      })
      .then(function () {
        mocker = undefined;
      })
      .catch(function (e) {
        mocker = undefined;
        throw e;
      });
  }
};

module.exports.expect = expect;
