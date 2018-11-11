httpception
===========

[![NPM version](https://badge.fury.io/js/httpception.svg)](http://badge.fury.io/js/httpception)
[![Build Status](https://travis-ci.org/papandreou/httpception.svg?branch=master)](https://travis-ci.org/papandreou/httpception)
[![Coverage Status](https://coveralls.io/repos/papandreou/httpception/badge.svg)](https://coveralls.io/r/papandreou/httpception)
[![Dependency Status](https://david-dm.org/papandreou/httpception.svg)](https://david-dm.org/papandreou/httpception)

Mock out HTTP traffic during a test, experimentally extracted from
[unexpected-mitm](https://github.com/unexpectedjs/unexpected-mitm/):

```js
var httpception = require('httpception');
var fetch = require('node-fetch');
var assert = require('assert');

it('should perform the right HTTP request', () => {
    httpception({
        request: 'GET http://example.com/foobar',
        response: {
            headers: {
                'Content-Type': 'text/plain'
            },
            body: 'the text'
        }
    });

    return fetch('example.com/foobar')
        .then(res => res.text())
        .then(body => {
            assert.equal(body, 'the text');
        });
});
```

The http module will automatically be restored when the test ends. That
is detected by registering an `afterEach` block and failing from that if
you have unexercised mocks.

If you think that involves too much magic, you can also pass a function as
the last parameter. It will be invoked by httpception when the mocks
are in place, and the mocks will be removed after it has exited. If the
function returns a promise, the mocks will be kept until the promise has
resolved:

```js
it('should perform the right HTTP request', () => httpception({
    request: 'GET /foobar',
    response: {
        statusCode: 200,
        body: 'the text'
    }
}, () => {
    return got('example.com/foobar')
        .then(response => {
            assert.equal(response.body, 'the text');
        });
}));
```

When the test is done, the http module will automatically be restored,
and the test will fail if there are unexercised mocks.
