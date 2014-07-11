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
for, say, loading text files. Instead, AJAX calls should be handled by other
libraries imported into a Modus.Module. To help with the async nature of this,
you can tell a module to wait until you manually trigger 'done'. For example:

```javascript
Modus.module('app.bar', function (bar) {
    bar.imports('$').from('app.libs');

    $.json('some/json/file.json', function (data) {
        bar.data = data;
        // Mark this module as ready:
        bar.emit('done')
    });
}, {
    // Tell this module to wait until 'done' is emitted:
    wait: true
});
```

Shims
-----
In the above example, we imported '$' from a module called 'app.libs', which
provides shims for non-modus scripts. Here's how such a module could be implemented,
using the same 'wait/emit-done' pattern:

```javascript
Modus.module('app.libs', function (libs) {
    // Modus.load can be used to load any script
    Modus.load([
        'bower_components/jquery/dist/jquery.min.js',
        'bower_components/underscore/underscore.js'
    ], function () {
        // The above scripts are now available in the global scope, as always.
        // However, we can also make them available as exports from this module:
        libs._ = _;
        libs.$ = jQuery;
        // Now all we need to do is emit 'done' and all dependent modules can continue
        // enabling.
        libs.emit('done');
    }, function (err) {
        // Always a good idea to catch an error! If you don't do this,
        // your script might just hang forever without telling you why.
        libs.emit('error', err);
    });
}, {
    wait: true
});
```

v0.1.3
------
Client-side module loading works and has some tests. Server-side
module loading and compiling is being planned.