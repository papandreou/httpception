const expect = require('unexpected').clone()
    .use(require('unexpected-http'));
const httpception = require('../lib/httpception');

httpception.expect.output.preferredWidth = 140;

describe('httpception', function () {
    describe('when invoked without a promise factory', function () {
        it('should mock out a single request and succeed when it is performed', function () {
            httpception({
                request: 'GET http://example.com/',
                response: 200
            });

            return expect('GET http://example.com/', 'to yield response', 200);
        });

        it('should mock out two requests given in separate httpception calls and succeed when they are performed', function () {
            httpception({
                request: 'GET http://example.com/',
                response: 200
            });

            httpception({
                request: 'POST http://example.com/',
                response: 200
            });

            return expect('GET http://example.com/', 'to yield response', 200)
                .then(() => expect('POST http://example.com/', 'to yield response', 200));
        });

        it('should mock out two requests given as an array and succeed when they are performed', function () {
            httpception([
                {
                    request: 'GET http://example.com/',
                    response: 200
                },
                {
                    request: 'POST http://example.com/',
                    response: 200
                }
            ]);

            return expect('GET http://example.com/', 'to yield response', 200)
                .then(() => expect('POST http://example.com/', 'to yield response', 200));
        });
    });

    describe('invoked in "promise factory" mode', function () {
        it('should succeed', function () {
            return httpception({
                request: 'GET http://example.com/',
                response: 200
            }, () => expect('GET http://example.com/', 'to yield response', 200));
        });

        it('should not return a mitm error if the http conversation was ok', function () {
            return expect(
                httpception([], () => Promise.reject(new Error('foo'))),
                'to be rejected with',
                new Error('foo')
            );
        });

        it('should succeed when a single function is passed and it does not perform any HTTP requests', function () {
            return httpception(() => Promise.resolve());
        });

        it('should fail when no HTTP requests are made and there is a one mocked out', function () {
            return expect(
                httpception({
                    request: 'GET http://example.com/',
                    response: 200
                }, () => Promise.resolve()),
                'to be rejected with',
                    'expected () => Promise.resolve() to perform HTTP traffic [ { request: \'GET http://example.com/\', response: 200 } ]\n' +
                    '\n' +
                    '// missing:\n' +
                    '// GET /\n' +
                    '// Host: example.com\n' +
                    '//\n' +
                    '// HTTP/1.1 200 OK'
            );
        });

        it('should fail when no HTTP requests are made and there is a one mocked out (given as an array)', function () {
            return expect(
                httpception([
                    {
                        request: 'GET http://example.com/',
                        response: 200
                    }
                ], () => Promise.resolve()),
                'to be rejected with',
                    'expected () => Promise.resolve() to perform HTTP traffic [ { request: \'GET http://example.com/\', response: 200 } ]\n' +
                    '\n' +
                    '// missing:\n' +
                    '// GET /\n' +
                    '// Host: example.com\n' +
                    '//\n' +
                    '// HTTP/1.1 200 OK'
            );
        });

        describe('when queueing up mock traffic before the promise factory is invoked', function () {
            it('should succeed', function () {
                httpception({
                    request: 'GET http://example.com/',
                    response: 200
                });

                return httpception([], () => expect('GET http://example.com/', 'to yield response', 200));
            });

            it('should succeed when queueing up twice', function () {
                httpception({
                    request: 'GET http://example.com/',
                    response: 200
                });

                httpception({
                    request: 'POST http://example.com/',
                    response: 200
                });

                return httpception(
                    [],
                    () => expect('GET http://example.com/', 'to yield response', 200)
                        .then(() => expect('POST http://example.com/', 'to yield response', 200))
                );
            });

            it('should succeed when additional traffic is passed to the httpception call that launches the promise factory', function () {
                httpception({
                    request: 'GET http://example.com/',
                    response: 200
                });

                return httpception({
                    request: 'POST http://example.com/',
                    response: 200
                }, () => expect('GET http://example.com/', 'to yield response', 200)
                    .then(() => expect('POST http://example.com/', 'to yield response', 200))
                );
            });

            it('should fail with a diff', function () {
                httpception({
                    request: 'POST http://example.com/',
                    response: 200
                });
                return expect(
                    httpception([], () => expect('GET http://example.com/', 'to yield response', 200)),
                    'to be rejected with',
                    'expected () => expect(\'GET http://example.com/\', \'to yield response\', 200)\n' +
                        'to perform HTTP traffic [ { request: \'POST http://example.com/\', response: 200 } ]\n' +
                        '\n' +
                        'GET / HTTP/1.1 // should be POST /\n' +
                        '               //\n' +
                        '               // -GET / HTTP/1.1\n' +
                        '               // +POST / HTTP/1.1\n' +
                        'Host: example.com\n' +
                        '\n' +
                        'HTTP/1.1 200 OK'
                );
            });
        });

        it('should throw if an unsupported property is passed as part of a response property', function () {
            return expect(
                httpception({
                    request: 'GET http://example.com/',
                    response: {
                        statusCode: 200,
                        foobarquux: 123
                    }
                }, function () {}),
                'to be rejected with',
                'messy.Message: Unsupported property name: foobarquux'
            );
        });
    });
});
