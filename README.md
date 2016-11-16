httpception
===========

Mock out HTTP traffic during a test, experimentally extracted from
[unexpected-mitm](https://github.com/unexpectedjs/unexpected-mitm/):

```js
var httpception = require('httpception');
var got = require('got');
var assert = require('assert');

it('should perform the right HTTP request', function () {
    httpception({
        request: 'GET http://example.com/foobar',
        response: {
            headers: {
                'Content-Type': 'text/plain'
            },
            body: 'the text'
        }
    });

    return got('example.com/foobar')
        .then(response => {
            assert.equal(response.body, 'the text');
        });
});
```

When the test is done, the http module with automatically be restored,
and the test will fail if there are unexercised mocks.
