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

    expect.addAssertion('<function> when run through mocha <assertion>', (expect, subject) => {
        expect.errorMode = 'nested';
        const code = subject.toString().replace(/^[^{]+\{|\}\s*$/g, '');
        expect.subjectOutput = function (output) {
            output.code(code, 'javascript');
        };
        const tmpFileName = pathModule.resolve(tmpDir, 'httpception' + Math.round(10000000 * Math.random()) + '.js');
        const testCommand = process.argv[0] + ' ' + pathModule.resolve(__dirname, '..', 'node_modules', '.bin', 'mocha') + ' ' + tmpFileName;

        return fs.writeFileAsync(tmpFileName, preamble + code, 'utf-8')
        .then(() => expect.promise.fromNode(cb => childProcess.exec(testCommand, cb.bind(null, null))))
        .then(stdoutAndStderr => expect.shift(stdoutAndStderr[1]))
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
        }, 'when run through mocha', expect.it('to contain', '✓ should foo').and('to contain', '1 passing'));
    });

    it('should fail with a diff when too few requests are made', function () {
        return expect(() => {
            /* eslint-disable */
            it('should foo', function () {
                httpception({ request: 'GET /', response: 200 });
            });
            /* eslint-enable */
        }, 'when run through mocha to match', /"after each" hook for "should foo"[\s\S]*\/\/ missing:\n\/\/ GET \/\n/);
    });

    it('should fail with a diff when a request does not match the mocked out traffic', function () {
        return expect(() => {
            /* eslint-disable */
            it('should foo', function () {
                httpception({ request: 'GET /foo', response: 200 });
                return expect('/bar', 'to yield response', 200);
            });
            /* eslint-enable */
        }, 'when run through mocha to contain',
                'GET /bar HTTP/1.1 // should be GET /foo\n' +
                '                  //\n' +
                '                  // -GET /bar HTTP/1.1\n' +
                '                  // +GET /foo HTTP/1.1\n' +
                'Host: localhost\n' +
                '\n' +
                'HTTP/1.1 200 OK\n'
        );
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
        }, 'when run through mocha to contain',
                'GET /bar HTTP/1.1 // should be GET /foo\n' +
                '                  //\n' +
                '                  // -GET /bar HTTP/1.1\n' +
                '                  // +GET /foo HTTP/1.1\n' +
                'Host: localhost\n' +
                '\n' +
                'HTTP/1.1 200 OK\n'
        );
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
        }, 'when run through mocha to contain',
                'GET /bar HTTP/1.1 // should be GET /foo\n' +
                '                  //\n' +
                '                  // -GET /bar HTTP/1.1\n' +
                '                  // +GET /foo HTTP/1.1\n' +
                'Host: localhost\n' +
                '\n' +
                'HTTP/1.1 200 OK\n'
        );
    });
});
