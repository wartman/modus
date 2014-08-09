Modus
=====

*modus* is under heavy development. Feel free to download it and screw around, but be aware that
unstable is an understatement at the moment.

How about some code?
--------------------

```javascript
modus.module('app.foo', function () {
   
    this.imports(['baritize']).from('app.baz');
    this.imports(['Bin', {'Baz':'BazAlias'}]).from('app.bar');

    // You can use imports right away inside the module callback.
    var bar = this.baritize('bar');

    // Exporting something is as simple as this:
    this.foo = 'foo';

    // Functions too.
    this.saysFoo = function (foo) {
        return function () {
            return 'says ' + foo.foo;
        }
    };

});
```

Api
---
Modus is based on the es6 syntax, and works in a similar way.

To import the deafult value of a module, or to import all properties defined
by a module, pass a `string` to `this.imports`.

```javascript
modus.module('app.example', function () {
    this.imports('foo').from('app.foo');
});
```

To import specific properties, pass an `array`:
```javascript
modus.module('app.example', function () {
    this.imports(['foo', 'bar']).from('app.foo');
});
```

Async Modules
-------------
Modus is focused JUST on loading javascript modules. No support is provided
for, say, loading text files. However, you can tell a module to wait for
some async function (like, say, an AJAX call) by simply adding a callback
to the module factory (typically called 'done'). This should be familiar if
you've used a testing framework like Mocha.

```javascript
modus.module('app.bar', function (done) {
    this.imports(['$']).from('app.libs');

    var self = this;

    // Let's grab some JSON data with jquery.
    $.getJSON('some/json/file.json', function (data) {
        self.data = data;
        // All done with async stuff!
        done();
    });
});
```

If you need to catch an error, simply pass an error or a message to the `done` callback.

```javascript
modus.module('app.bar', function (done) {
    this.imports('thing').from('app.things');
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
modus.module('app.libs', function (done) {
    var self = this;
    // modus.Loader can be used to load any scripts
    var loader = modus.Loader.getInstance();
    loader.load([
        'bower_components/jquery/dist/jquery.min.js',
        'bower_components/underscore/underscore.js'
    ], function () {
        // The above scripts are now available in the global scope, as always.
        // However, we can also make them available as exports from this module:
        self._ = _;
        self.$ = jQuery;
        done();
    }, done); // Note how 'done' is used to catch errors.
});
```

Building
--------
Modus comes with a compiler called `modus.Build` to crunch a project into
a single file. You can use it from the command line:

```cli
$ modus path\to\main\module path\to\destination
```

You can add functionality to the builder by using modus' event system, either
globally or per-module.

The following will be called for every module:

```javascript
modus.events.on('build', function (moduleName, raw) {
    // If we need to use modus.Build, we can call the `getInstance` function.
    var build = modus.Build.getInstance();
    // Let's say we, for whatever reason, want to add some text from a file.
    // `modus.Build` has a handy alias for node's filesystem built-in:
    var txt = build.fs.readFileSync('my/filename.txt', 'utf-8');
    // 'raw' is the contents of the current module. We can append our text to
    // the end of it:
    raw += txt;
    // Finally, we need to call `build.output` to use our modified module.
    build.output(moduleName, raw);
});
```

We can also register an event in a module to run it for *only* that module:

```javascript
modus.module('app.foo', function () {
    this.bar = 'bar';
}).on('build', function (moduleName, raw) {
    var build = modus.Build.getInstance();
    build.output(moduleName, raw + '/* this is added! */');
});
```

A real world example of the above might be to compile shimmed files. Let's
extend the `app.libs` module to do this:

```javascript
modus.module('app.libs', function (done) {
    var self = this;
    var loader = modus.Loader.getInstance();
    loader.load([
        'bower_components/jquery/dist/jquery.min.js',
        'bower_components/underscore/underscore.js'
    ], function () {
        self._ = _;
        self.$ = jQuery;
        done();
    }, done); // Note how 'done' is used to catch errors.
}).on('build', function (moduleName, raw) {
    var build = modus.Build.getInstance();
    var jquery = build.fs.readFileSync('bower_components/jquery/dist/jquery.min.js', 'utf-8');
    var underscore = build.fs.readFileSync('bower_components/underscore/underscore.js', 'utf-8');
    // Add our shimmed files to the output
    build.output('jquery', jquery);
    build.output('undersocre', underscore);
    // Rewrite the 'app.libs' module:
    var mod = "modus.module('app.libs', function () { this._ = _; this.$ = $; });";
    build.output('app.libs', mod);
});
```

Check out `examples\building` for some more advanced uses of the build event.