Modus
=====

*Modus* is under heavy development. Feel free to download it and screw around, but be aware that
unstable is an understatement at the moment.

How about some code?
--------------------

```javascript
Modus.module('app.foo', function (foo) {
   
    foo.imports('.baritize').from('app.baz');
    foo.imports('Bin', {'Baz':'BazAlias'}).from('my.library.ban');

    // You can use imports right away inside the module callback.
    var bar = foo.baritize('bar');

    // Exporting something is as simple as this:
    foo.foo = 'foo';

    // Functions too.
    foo.saysFoo = function (foo) {
        return function () {
            return 'says ' + foo.foo;
        }
    };

});
```

Only Modules
------------
Modus is focused JUST on loading javascript modules. No support is provided
for, say, loading text files. However, you can tell a module to wait for
some async function (like, say, an AJAX call) by simply adding a callback
to the module factory (typically called 'done'). This should be familiar if
you've used a testing framework like Mocha.

```javascript
Modus.module('app.bar', function (bar, done) {
    bar.imports('$').from('app.libs');

    // Let's grab some JSON data with jquery.
    $.getJSON('some/json/file.json', function (data) {
        bar.data = data;
        // All done with async stuff!
        done();
    });
});
```

If you need to catch an error, simply pass an error or a message to the `done` callback.

```javascript
Modus.module('app.bar', function (bar, done) {
    bar imports('thing').from('app.things');
    try {
        thing();
        done();
    } catch (e) {
        done('Something went wrong!');
    } 
});
```

Shims
-----
In the above example, we imported '$' from a module called 'app.libs', which
provides shims for non-modus scripts. Here's how you might write a simple shim:

```javascript
Modus.module('app.libs', function (libs, done) {
    // Modus.load can be used to load any scripts
    Modus.load([
        'bower_components/jquery/dist/jquery.min.js',
        'bower_components/underscore/underscore.js'
    ], function () {
        // The above scripts are now available in the global scope, as always.
        // However, we can also make them available as exports from this module:
        libs._ = _;
        libs.$ = jQuery;
        done();
    }, done); // Note how 'done' is used to catch errors.
});
```

(Coming soon: compiling)