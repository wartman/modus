Modus API
=========

### modus.__module__(*name*, *factory*, *options*)

Typically, you'll define a module using `modus.module`. Modules can be
named, or left anonymous and automatically assigned a name.

#### Creating Modules

Inside the *factory* callback, `this` will be bound to the current module.
Defining exports is as simple as assigning a property to `this`:

```javascript
modus.module('example.module', function () {
    this.SomeExport = 'foo';
    this.SomeOtherExport = 'bar';
});
```

The first argument passed to the callback will also be bound to the current module, which
is handy if you need to define something in another scope.

```javascript
modus.module('example.module', function (module) {
    module.SomeExport = 'foo';
    (function () {
        module.SomeOtherExport = 'bar';
    })();
});
```

For brevity, `modus.module` can be aliased as `module` or `mod`. We'll be using `module`
for the rest of this document.

```javascript
module('example.module', function () {
    this.SomeExport = 'foo';
    this.SomeOtherExport = 'bar';
});
```

As a quick note, all of modus' global exports have a `noConflict` method you can use
if they interfere with your project.

```javascript
var module = function () {
    return 'foo';
};

// modus gets included here, then:
var modusModule = module.noConflict();

module();
// --> 'foo'
```

#### Importing

To import something from a module, use the `this.imports(/* items */).from('module')` chain.
These imports will then be available as properties in `this`;

```javascript
module('example.otherModule', function () {
    this.imports('SomeExport', 'SomeOtherExport').from('example.module');
    console.log(this.SomeExport, this.SomeOtherExport); 
    // --> 'foo bar'
});
```

If you want to import everything from a module (or to import the `default` export), use the
`imports(/* moduleName */).as('alias');` chain.

```javascript
module('example.otherModule', function () {
    // You can name the import whatever you like. 
    this.imports('example.module').as('someRandomName');
    console.log(this.someRandomName.SomeExport, this.someRandomName.someOtherExport);
    // --> 'foo bar'
});
```

The above example holds unless the requested module has a `default` property, in which case
the `default` property will be imported instead.

```javascript
module('example.hasDefault', function () {
    this.bar = 'bar';
    this.default = 'foo';
});

module('example.otherModule', function () {
    this.imports('example.hasDefault').as('def');
    console.log(this.def, this.def.bar);
    // --> 'foo undefined';
});
```

Relative imports can be created by prefixing a module with a dot. For example:

```javascript
module('example.otherModule', function () {
    // Imports from 'example.module':
    this.imports('SomeExport', 'SomeOtherExport').from('.module');
    console.log(this.SomeExport, this.SomeOtherExport); 
    // --> 'foo bar'
});
```

The number of dots you prefix the module name with will correspond to the number
of levels you move up, relative to the *current module* (rather then the current namespace).

```javascript
module('app.foo.bar', function () {
    this.imports('SomeExport').from('some.module');
    // --> resolves to 'some/module.js'
    this.imports('SomeExport').from('.some.module');
    // Up one level from the current module:
    // 'app.foo.<bar>'
    // --> resolves to 'app/foo/some/module.js'
    this.imports('SomeExport').from('..some.module');
    // Up two levels.
    // 'app.<foo.bar>';
    // --> resolves to 'app/some/module.js';
    // and so forth.
});
```

You can also use the URI syntax to load modules, which will work just like you expect. Both
styles can work side-by-side with no issues.

```javascript
module('app.foo.bar', function () {
    this.imports('SomeExport').from('some/module');
    // --> resolves to 'some/module.js'
    this.imports('SomeExport').from('./some/module');
    // Up one level from the current module:
    // 'app.foo.<bar>'
    // --> resolves to 'app/foo/some/module.js'
    this.imports('SomeExport').from('../some/module');
    // Up two levels.
    // 'app.<foo.bar>';
    // --> resolves to 'app/some/module.js';
    this.imports('SomeExport').from('../../some/module');
    // Up three levels.
    // '<app.foo.bar>';
    // --> resolves to 'some/module.js';
    // and so forth.
});
```

#### Asynchronous Modules

If you need to do something asynchronous (and you probably will at some point), you can
tell modus to wait until your operation has completed before continuing along the module stack.
All you need to do is pass a second argument to the module factory (typically called "done", although this
can be whatever you'd like). If you've used a testing framework like Mocha, this should be a
familiar pattern.

```javascript
module('tests.wait', function (module, done) {
    module.foo = 'didn\'t wait';
    setTimeout(function () {
        module.foo = 'waited';
        // Enable this module, and continue enabling
        // all dependent modules.
        done();
    }, 10);
});

module('tests.waiting', function () {
    // This factory won't be run until the following
    // import is enabled:
    this.imports('foo').from('.wait');
    console.log(this.foo);
    // --> 'waited'
});
```

#### AMD Integration

Using AMD modules is easy: just import the AMD module like you would anything else.

```javascript
module(function () {
    this.imports('jquery').as('$');
    this.$('#foo').html('This works!');
    $('#fooBar').html('This too.');
});
```

You can even import properties from an AMD module. For example, here's what you can do
with Backbone:

```javascript
module(function () {
    this.imports('View', 'Model').from('backbone');
    this.Foo = this.View.extend({
        // code
    });
});
```

The above examples aren't actually functional. They need a little configuration
first to let modus know where, for example, 'jquery' is hiding. For that, we need
`modus.config`.

### modus.__config__(*key*, *value*)

Pretty self explanatory.

```javascript
modus.config({
    // Set the root path:
    root: 'scripts/',
    // Map moduleNames to URIs:
    maps: {
        'jquery': 'bower_components/jquery/jquery.min.js'
    },
    // Map namespaces to URIs:
    namespaceMaps: {
        'foo': 'some/long/path/'
    }
});

modus.module('main', function () {
    // The following will import from 'bower_components/jquery/jquery.min.js':
    this.imports('jquery').as('$');
    // The following will import from 'some/long/path/foo.js':
    this.imports('bar').from('foo.bar');
});
```

### modus.__main__(*config*, *factory*)

'modus.main' is a shortcut for defining a main module. It will automatically register
a module with `modus.config('main')` as the module name, and you can set config options
by passing an object as the first argument. This method should be used in the file that
`data-main` points to.

```javascript
modus.main({
    root: 'foo/bar',
    maps: {
        'foo': 'bar'
    }
}, function () {
    this.imports('App').from('foo.app');
    this.App.start(); // or whatever you need.
});
```

### modus.__Build__()

**Note**: This area is probably the most unstable part of Modus at the moment.
Expect changes.

This class is used when by modus' console app:

```
$ modus [src] [dest] <options>
```

This allows you to compile a modus project into a single file. For more, type
`$ modus --help` in your console.

### modus.__addBuildEvent__(*moduleName*, *callback*)

There may be cases where you need to add some custom behavior when building a modus
app. `addBuildEvent` can register an event that will be run for a single module or
an event that will parse all of them. 

```javascript
modus.addBuildEvent(function (modules, output, build) {
    // modules == an object containing all current `modus.Modules`.
    // output == an object containing raw strings off all `modus.Modules`.
    // build == the current instance of `modus.Build`

    // So, you could do something like this:
    for (var modName in output) {
        var modRaw = output[modName];
        modRaw += '/n/*this will be appended to the end*//n';
        // Replace the previous output for 'modName'.
        build.output(modName, modRaw);
    }
});
```

You can register a build event in the same file as a modus module (so long as you don't place
it inside the module callback), but a better option is to use build files. Simply register all
the build events you want in your app's config:

```javascript
modus.config({
    buildFiles: 'path/to/build/file'
});
// If you have many build files you can use an array of paths:
modus.config({
    buildFiles: [
        'path/to/build/file-one',
        'path/to/build/file-two'
    ]
});
```

The content of these build files won't be added to the compiled script.

License Junk
------------
Released under the [MIT license](LICENSE-MIT).

