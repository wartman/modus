Modus
=====

*modus* is under heavy development. Feel free to download it and screw around, but be aware that
unstable is an understatement at the moment.

How about some code?
--------------------

```javascript
modus.module('app.foo', function (foo) {
   
    foo.imports('baritize').from('app.baz');
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
modus.module('app.bar', function (bar, done) {
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
modus.module('app.bar', function (bar, done) {
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
modus.module('app.libs', function (libs, done) {
    // modus.Loader can be used to load any scripts
    var loader = modus.Loader.getInstance();
    loader.load([
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

Building
--------
Modus comes with a compiler called `modus.Build` to crunch a project into
a single file. You can use it from the command line:

```cli
$ modus build path\to\main\module path\to\destination
```

You can add functionality to the builder by using modus' event system, either
globally or per-module.

The following will be called for every module:

```javascript
modus.events.on('build', function (raw) {
    // If we need to use modus.Build, we can call the `getInstance` function.
    var build = modus.Build.getInstance();
    // Let's say we, for whatever reason, want to add some text from a file.
    // `modus.Build` has a handy alias for node's filesystem built-in:
    var txt = build.fs.readFileSync('my/filename.txt', 'utf-8');
    // 'raw' is the current module being built, loaded as a string.
    raw += txt;
    // Any returned value will be used when `modus.Build` compiles
    // this module.
    return raw; 
});
```

We can also register a hook in a module to run it for *only* that module:

```javascript
modus.module('app.foo', function (foo) {
    foo.bar = 'bar';
}, {
    hooks: {
        build: function (raw) {
            return raw += '/* this is added! */'
        }
    }
});
```

A real world example of the above might be to compile shimmed files. Let's
extend the `app.libs` module to do this:

```javascript
modus.module('app.libs', function (libs, done) {
    var loader = modus.Loader.getInstance();
    loader.load([
        'bower_components/jquery/dist/jquery.min.js',
        'bower_components/underscore/underscore.js'
    ], function () {
        libs._ = _;
        libs.$ = jQuery;
        done();
    }, done); // Note how 'done' is used to catch errors.
}, {
    hooks: {
        build: function (raw) {
            var build = modus.Build.getInstance();
            var jquery = build.fs.readFileSync('bower_components/jquery/dist/jquery.min.js', 'utf-8');
            var underscore = build.fs.readFileSync('bower_components/underscore/underscore.js', 'utf-8');
            var compiled = "modus.module('app.libs', function(libs) {\n"
                + jquery + '\n' + underscore + '\n'
                + 'libs.$ = $;\nlibs._=_;\n});';
            return compiled;
        }
    }
});
```

Check out `examples\building` for some more advanced uses of the build event.