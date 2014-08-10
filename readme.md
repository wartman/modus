Modus
=====

Modus is a JavaScript module loader for the web. It uses a Python and 
ES6 inspired syntax, but can also load AMD modules.

Here's an example of a simple `modus.module`:

```javascript
modus.module(function () {
    this.imports(['foo', 'bar']).from('.bar');
    this.imports(['View']).from('backbone');

    var mod = this;

    this.MyView = this.View.extend({
        init: function () {
            this.foo = mod.foo;
            this.bar = mod.bar;
        }
    });
});
```

API
---

#### modus.__module__(*name*, *factory*, *options*)

Typically, you'll define a module using `modus.module`. Modules can be
named, or left anonymous and automatically assigned a name.

Inside the *factory* callback, `this` will be bound to the current module.
Defining exports is as simple as assigning a property to `this`:

```javascript
modus.module('example.module', function () {
    this.SomeExport = 'foo';
    this.SomeOtherExport = 'bar';
});
```

To import something from a module, use the `this.imports(/* items */).from('mod')` chain.
These imports will then be available as properties in `this`;

```javascript
modus.module('example.otherModule', function () {
    this.imports(['SomeExport', 'SomeOtherExport']).from('example.module');
    console.log(this.SomeExport, this.SomeOtherExport); 
    // --> 'foo bar'
});
```

Note how an array was passed to `imports` in the above example, and how this imported several
exports from the requested module. To import everything from a module, you can pass a string instead:

```javascript
modus.module('example.otherModule', function () {
    // You can name the import whatever you like. 
    this.imports('someRandomName').from('example.module');
    console.log(this.someRandomName.SomeExport, this.someRandomName.someOtherExport);
    // --> 'foo bar'
});
```

If the imported module has a 'default' export, it will be used instead:

```javascript
modus.module('example.hasDefault', function () {
    this.bar = 'bar';
    this.default = 'foo';
});

modus.module('example.otherModule', function () {
    this.imports('def').from('example.hasDefault');
    console.log(this.def, this.def.foo);
    // --> 'foo undefined';
});
```

As a handy shortcut, you can import modules in the same namespace starting
a module name with a dot:

```javascript
modus.module('example.otherModule', function () {
    // Imports from 'example.module':
    this.imports(['SomeExport', 'SomeOtherExport']).from('.module');
    console.log(this.SomeExport, this.SomeOtherExport); 
    // --> 'foo bar'
});
```

This can be very powerful in anon modules, allowing you to place
modules wherever you like:

```javascript
// in foo/bar/otherModule.js:
modus.module(function () {
    // The following will import 'foo.bar.module':
    this.imports(['SomeExport', 'SomeOtherExport']).from('.module');
    console.log(this.SomeExport, this.SomeOtherExport); 
    // --> 'foo bar'
});
```

As a final example, here's what importing an AMD module looks like:

```javascript
modus.module(function () {
    this.imports('$').from('jQuery');
    this.$('#foo').html('This works!');
    $('#fooBar').html('This too.');
});
```

The above example actually isn't entirely complete: it needs a little configuration
first, but see the next section.


#### modus.__config__(*key*, *value*)

Pretty self explanitory, this is where you configure things.

```javascript
modus.config({
    // Set the root path:
    root: 'scripts/',
    // Map moduleNames to URIs:
    maps: {
        'jQuery': 'bower_components/jquery/jquery.min.js'
    },
    // Map namespaces to URIs:
    namespaceMaps: {
        'foo': 'some/long/path/'
    }
});

modus.module('main', function () {
    // The following will import from 'bower_components/jquery/jquery.min.js':
    this.imports('$').from('jQuery');
    // The following will import from 'some/long/path/foo.js':
    this.imports(['bar']).from('foo.bar');
})
```

**This doc is still a WIP**
More info to come, but the above should give you an idea of what works.


