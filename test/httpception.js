const expect = require('unexpected').clone()
    .use(require('unexpected-http'));
const httpception = require('../lib/httpception');

describe('httpception', function () {
    describe('invoked in "promise factory" mode', function () {
        it('should succeed', function () {
            return httpception({
                request: 'GET http://example.com/',
                response: 200
            }, () => expect('GET http://example.com/', 'to yield response', 200));
        });

        it('should fail when no HTTP requests are made and there is a one mocked out', function () {
            return expect(
                httpception({
                    request: 'GET http://example.com/',
                    response: 200
                }, () => Promise.resolve()),
                'to be rejected with',
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
                    '// missing:\n' +
                    '// GET /\n' +
                    '// Host: example.com\n' +
                    '//\n' +
                    '// HTTP/1.1 200 OK'
            );
        });
    });
});
