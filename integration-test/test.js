const expect = require('unexpected');
const pathModule = require('path');
const childProcess = require('child_process');

describe('in afterEach mode', function () {
    const fs = expect.promise.promisifyAll(require('fs'));
    const tmpDir = pathModule.resolve(__dirname, 'tmp');

    before(() => fs.mkdirAsync(tmpDir).catch(() => {}));
    after(() => fs.rmdirAsync(tmpDir).catch(() => {}));

    const preamble =
        "var httpception = require('../../');\n" +
        "var expect = require('unexpected').use(require('unexpected-http'));\n";

    expect.addAssertion('<function> when run through (mocha|jest) <assertion>', (expect, subject) => {
        expect.errorMode = 'nested';
        const isMocha = expect.alternations[0] === 'mocha';

        if (process.env.JEST === 'false' && expect.alternations[0] === 'jest') {
            // Allow to disable jest assertions when running integration tests for coverage.
            return expect(true, 'to be ok');
        }

        const code = subject.toString().replace(/^[^{]+\{|\}\s*$/g, '');
        expect.subjectOutput = function (output) {
            output.code(code, 'javascript');
        };
        const tmpFileName = pathModule.resolve(tmpDir, 'httpception' + Math.round(10000000 * Math.random()) + '.js');
        var testCommand;
        if (isMocha) {
            testCommand = process.argv[0] + ' ' + pathModule.resolve(__dirname, '..', 'node_modules', '.bin', 'mocha') + ' ' + tmpFileName;
        } else {
            // jest
            testCommand =
                process.argv[0] + ' ' +
                pathModule.resolve(__dirname, '..', 'node_modules', '.bin', 'jest') +
                ' --config ' + pathModule.resolve(__dirname, 'jest.config.js') +
                ' ' + tmpFileName;
        }

        return fs.writeFileAsync(tmpFileName, preamble + code, 'utf-8')
        .then(() => expect.promise.fromNode(cb => childProcess.exec(testCommand, cb.bind(null, null))))
        .then((output) => expect.shift({ stdout: output[1], stderr: output[2] }))
        .finally(() => fs.unlinkAsync(tmpFileName));
    });

    it('should succeed when the correct HTTP request is made', function () {
        return expect(() => {
            /* eslint-disable */
            it('should foo', function () {
                httpception({ request: 'GET /', response: 200 });
                return expect('GET /', 'to yield response', 200);
            });
            /* eslint-enable */
        }, 'when run through mocha to satisfy', {
            stdout: expect.it('to contain', '✓ should foo').and('to contain', '1 passing')
        }).and('when run through jest to satisfy', {
            stderr: expect.it('to contain', '✓ should foo').and('to contain', '1 passed, 1 total')
        });
    });

    it('should fail with a diff when too few requests are made', function () {
        return expect(() => {
            /* eslint-disable */
            it('should foo', function () {
                httpception({ request: 'GET /', response: 200 });
            });
            /* eslint-enable */
        }, 'when run through mocha to satisfy', {
            stdout: /"after each" hook for "should foo"[\s\S]*\/\/ missing:\n\/\/ GET \/\n/
        }).and('when run through jest to satisfy', {
            stderr: expect.it('to contain', '✕ should foo').and('to contain', '1 failed, 1 total')
        });
    });

    it('should fail with a diff when a request does not match the mocked out traffic', function () {
        return expect(() => {
            /* eslint-disable */
            it('should foo', function () {
                httpception({ request: 'GET /foo', response: 200 });
                return expect('/bar', 'to yield response', 200);
            });
            /* eslint-enable */
        }, 'when run through mocha to satisfy', {
            stdout: expect.it(
                'to contain',
                'GET /bar HTTP/1.1 // should be GET /foo\n' +
                '                  //\n' +
                '                  // -GET /bar HTTP/1.1\n' +
                '                  // +GET /foo HTTP/1.1\n' +
                'Host: localhost\n' +
                '\n' +
                'HTTP/1.1 200 OK\n'
            )
        }).and('when run through jest to satisfy', {
            stderr: expect.it(
                'to contain',
                '    GET /bar HTTP/1.1 // should be GET /foo\n' +
                '                      //\n' +
                '                      // -GET /bar HTTP/1.1\n' +
                '                      // +GET /foo HTTP/1.1\n' +
                '    Host: localhost\n' +
                '    \n' +
                '    HTTP/1.1 200 OK\n'
            ).and('to contain', '1 failed, 1 total')
        });
    });

    it('should fail with a diff the first test out of two fails', function () {
        return expect(() => {
            /* eslint-disable */
            it('should foo', function () {
                httpception({ request: 'GET /foo', response: 200 });
                return expect('/bar', 'to yield response', 200);
            });

            it('should bar', function () {
                httpception({ request: 'GET /foo', response: 200 });
                return expect('GET /bar', 'to yield response', 200);;
            });
            /* eslint-enable */
        }, 'when run through mocha to satisfy', {
            stdout: expect.it(
                'to contain',
                'GET /bar HTTP/1.1 // should be GET /foo\n' +
                '                  //\n' +
                '                  // -GET /bar HTTP/1.1\n' +
                '                  // +GET /foo HTTP/1.1\n' +
                'Host: localhost\n' +
                '\n' +
                'HTTP/1.1 200 OK\n'
            )
        }).and('when run through jest to satisfy', {
            stderr: expect.it(
                'to contain',
                '    GET /bar HTTP/1.1 // should be GET /foo\n' +
                '                      //\n' +
                '                      // -GET /bar HTTP/1.1\n' +
                '                      // +GET /foo HTTP/1.1\n' +
                '    Host: localhost\n' +
                '    \n' +
                '    HTTP/1.1 200 OK\n'
            ).and('to contain', '1 failed, 1 total')
        });
    });

    it('should fail with a diff the second test out of two fails', function () {
        return expect(() => {
            /* eslint-disable */
            it('should bar', function () {
                httpception({ request: 'GET /foo', response: 200 });
                return expect('GET /bar', 'to yield response', 200);;
            });

            it('should foo', function () {
                httpception({ request: 'GET /foo', response: 200 });
                return expect('/bar', 'to yield response', 200);
            });
            /* eslint-enable */
        }, 'when run through mocha to satisfy', {
            stdout: expect.it(
                'to contain',
                'GET /bar HTTP/1.1 // should be GET /foo\n' +
                '                  //\n' +
                '                  // -GET /bar HTTP/1.1\n' +
                '                  // +GET /foo HTTP/1.1\n' +
                'Host: localhost\n' +
                '\n' +
                'HTTP/1.1 200 OK\n'
            )
        }).and('when run through jest to satisfy', {
            stderr: expect.it(
                'to contain',
                '    GET /bar HTTP/1.1 // should be GET /foo\n' +
                '                      //\n' +
                '                      // -GET /bar HTTP/1.1\n' +
                '                      // +GET /foo HTTP/1.1\n' +
                '    Host: localhost\n' +
                '    \n' +
                '    HTTP/1.1 200 OK\n'
            ).and('to contain', '1 failed, 1 total')
        });
    });

    it('should error with more than one req', function () {
        return expect(() => {
            /* eslint-disable */
            it('should foo', function () {
                httpception([
                    { request: 'GET /foo', response: 200 },
                    { request: 'GET /bar', response: 200 },
                    { request: 'GET /baz', response: 200 }
                ]);

                return expect('/foo', 'to yield response', 200).then(
                    () => expect('/foo', 'to yield response', 200)
                );
            });
            /* eslint-enable */
        }, 'when run through mocha to satisfy', {
            stdout: expect.it(
                'to contain',
                'GET /foo HTTP/1.1 // should be GET /bar\n' +
                '                  //\n' +
                '                  // -GET /foo HTTP/1.1\n' +
                '                  // +GET /bar HTTP/1.1'
            )
        }).and('when run through jest to satisfy', {
            stderr: expect.it(
                'to contain',
                '    GET /foo HTTP/1.1 // should be GET /bar\n' +
                '                      //\n' +
                '                      // -GET /foo HTTP/1.1\n' +
                '                      // +GET /bar HTTP/1.1'
            ).and('to contain', '1 failed, 1 total')
        });
    });

    it('should error from both afterEach and the it block', function () {
        return expect(() => {
            /* eslint-disable */
            it('should foo', function () {
                httpception([
                    { request: 'GET /foo', response: 200 },
                    { request: 'GET /bar', response: 200 },
                    { request: 'GET /baz', response: 200 }
                ]);

                return expect('/foo', 'to yield response', 200).then(
                    () => expect('/foo', 'to yield response', 200)
                ).catch(
                    (err) => new Promise((resolve, reject) => {
                        const actualError = new Error('Actual Error');
                        setTimeout(() => reject(actualError), 500)
                    })
                );
            });
            /* eslint-enable */
        }, 'when run through mocha to satisfy', {
            stdout:
                expect.it('to contain', '1) should foo')
                    .and('to contain', '2) "after each" hook for "should foo"')
        }).and('when run through jest to satisfy', {
            stderr:
                expect
                    .it('to contain', '● should foo\n\n    Actual Error')
                    .and('to contain', '● should foo\n\n    \n    expected')
                    .and(
                        'to contain',
                        '    GET /foo HTTP/1.1 // should be GET /bar\n' +
                        '                      //\n' +
                        '                      // -GET /foo HTTP/1.1\n' +
                        '                      // +GET /bar HTTP/1.1'
                    ).
                    and('to contain', '1 failed, 1 total')
        });
    });
});
