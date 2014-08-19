Modus
=====

**NOTE: Modus is very much in development.**
The API shouldn't change too much from this point forward, but be warned.

**NOTE:** If you're using a version before 0.2.0, please read the API notes for
the new way imports work.

Modus is a JavaScript module loader for the web. It uses a Python and 
ES6 inspired syntax, but can also load AMD modules.

Here's an example of a simple `modus.module`:

```javascript
mod(function () {
    this.imports('foo', 'bar').from('.bar');
    this.imports('View').from('backbone');

    var self = this;

    this.MyView = this.View.extend({
        init: function () {
            this.foo = self.foo;
            this.bar = self.bar;
        }
    });
});
```

Getting Started
---------------

In your HTML file, add a script tag pointing at Modus and a 'data-main' attribute
for the main module in your project.

```html
<script src="dir/where/you/put/Modus.js" data-main='path.to.main.module'></script>
```

API
---

### modus.__module__(*name*, *factory*, *options*) *or* __mod__(*name*, *factory*, *options*)

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

For brevity, `modus.module` is aliased as `mod`, which is what we'll be using for the
rest of the document.

```javascript
mod('example.module', function () {
    this.SomeExport = 'foo';
    this.SomeOtherExport = 'bar';
});
```

#### Importing

To import something from a module, use the `this.imports(/* items */).from('mod')` chain.
These imports will then be available as properties in `this`;

```javascript
mod('example.otherModule', function () {
    this.imports('SomeExport', 'SomeOtherExport').from('example.module');
    console.log(this.SomeExport, this.SomeOtherExport); 
    // --> 'foo bar'
});
```

If you want to import everything from a module (or to import the `default` export), use the
`imports(/* moduleName */).as('alias');` chain.

```javascript
mod('example.otherModule', function () {
    // You can name the import whatever you like. 
    this.imports('example.module').as('someRandomName');
    console.log(this.someRandomName.SomeExport, this.someRandomName.someOtherExport);
    // --> 'foo bar'
});
```

The above example holds unless the requested module has a `default` property, in which case
the `default` property will be imported instead.

```javascript
mod('example.hasDefault', function () {
    this.bar = 'bar';
    this.default = 'foo';
});

mod('example.otherModule', function () {
    this.imports('example.hasDefault').as('def');
    console.log(this.def, this.def.bar);
    // --> 'foo undefined';
});
```

Relative imports can be created by prefixing a module with a dot. For example:

```javascript
mod('example.otherModule', function () {
    // Imports from 'example.module':
    this.imports('SomeExport', 'SomeOtherExport').from('.module');
    console.log(this.SomeExport, this.SomeOtherExport); 
    // --> 'foo bar'
});
```

The number of dots you prefix the module name with will correspond to the number
of levels you move up, relative to the *current module* (rather then the current namespace).

```javascript
mod('app.foo.bar', function () {
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
mod('app.foo.bar', function () {
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
All you need to do is pass an argument to the module factory (typically called "done", although this
can be whatever you'd like). If you've used a testing framework like Mocha, this should be a
familiar pattern.

```javascript
mod('tests.wait', function (done) {
    var self = this;
    this.foo = 'didn\'t wait';
    setTimeout(function () {
        self.foo = 'waited';
        // Enable this module, and continue enabling
        // all dependent modules.
        done();
    }, 10);
});

mod('tests.waiting', function () {
    // This factory won't be run until the following
    // import is enabled:
    this.imports('foo').from('.wait');
    console.log(this.foo);
    // --> 'waited'
});
```

#### Events

Each module has an event emitter you can hook into. Right now, the only
event that has much effect is the 'build' event, run when compiling
a module. Here's an example:

```javascript
mod(function (done) {
    this.imports('$').from('jquery');
    var self = this;
    $.ajax({
        url: 'some/txt/file.txt'
    }).done(function (data) {
        self.default = data;
        done();
    });
}).on('build', function (moduleName, raw) {
    // When compiled, the following will replace the module:
    var build = modus.Build.getInstance();
    var file = build.readFile('some/txt/file.txt');
    build.output(moduleName, "modus.publish('" + moduleName + "', '" + file + "' )" );
});
```

#### AMD Integration

Using AMD modules is easy: just import the AMD module like you would anything else.

```javascript
mod(function () {
    this.imports('jquery').as('$');
    this.$('#foo').html('This works!');
    $('#fooBar').html('This too.');
});
```

You can even import properties from an AMD module. For example, here's what you can do
with Backbone:

```javascript
mod(function () {
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

### modus.__Build__()

**Note**: This area is probably the most unstable part of Modus at the moment.
Expect changes.

This class is used when by modus' console app:

```
$ modus [src] [dest] <options>
```

This allows you to compile a modus project into a single file. For more, type
`$ modus --help` in your console.

### modus.__events__

If you need to, you can hook into global modus events. For example, say you're loading
text files with AJAX, and want to include them when compiling your app.

```javascript
// Global file store.
_loadedFiles = {};

mod('loadfile', function () {
    this.imports('jquery').as('$');
    this.default = function (file, next) {
        if (_loadedFiles.hasOwnProperty(file)) {
            next(_loadedFiles[file]);
        } else {
            $.ajax({
                url: file
            }).done(function (data) {
                _loadedFiles[file] = data;
                next(data);
            });
        }
    };
});

// The following will be run for every imported module:
modus.events.on('build', function (currentModule, raw) {
    // investigate the module for any 'loadfile' calls
    var _checkFiles = /loadfile\(([\s\S]+?)\)/g;
    var build = modus.Build.getInstance();
    raw.replace(_checkFiles, function (match, path) {
        // If a match is found, read each file, then add them to the
        // compiled file.
        var file = build.readFile(path);
        build.output(path, "_loadedFiles['" + path + "'] = '" + file + "')");
    });
});
```

The above example is just an example to give you an idea of how to use the
'build' hook: there are far too many issues with it for it to be something you
should actually use.

License Junk
------------
Released under the [MIT license](LICENSE-MIT).

