modus
=====

*Modus* is under heavy development. Feel free to download it and screw around, but be aware that
unstable is an understatement at the moment.

API
---

*Modus* attempts to impliment a es6-inspired module-loading API. Rather then parsing a custom
syntax, *Modus* uses callbacks to ensure dependencies are available.

How about some code?
--------------------

    Modus.namespace('app').module('foo', function (foo) {
       
        foo.imports('.bar');
        foo.imports('my.library.bin').as('bin');
        foo.imports(['Bin', 'Baz']).from('my.libaray.ban');

        foo.exports('foo', 'foo');

        foo.exports('saysFoo', function (foo) {
            return function () {
                return 'says ' + foo.foo;
            }
        });

        foo.body(function (foo) {
            foo.exports = new foo.Bin.extend({
                saysFoo: foo.saysFoo
            });
        });

    });

Ok, explain that to me.
-----------------------

Sure! Let's go line by line.

We start off by declaring our namespace and module:

    Modus.namespace('app').module('foo', function (foo) {
    // ...

Using a namespace is optional. You could start off a module like so:

    Modus.module('foo', function (foo) {

Or even:
    
    Modus.module('app.foo', function (foo) {

In all examples, the arg passed to the Modus.module callback ('foo', in this case) is
a reference to the current module. All Modus methods work like this: you'll generally
be able to pass a callback where the first arg refers to the wrapping class. Here is
an example of how Modus handles context:

    Modus.namespace('app', function (app) {
        // app === the current namespace
        app.module('foo', function (foo) {
            // foo === the current module
            foo.exports('bar', function (foo) {
                // foo === the current module's environment
            })
        });
    });

`exports` works a bit different from `namespace` or `module`: the first arg is an 
object literal that contains all previously imported or exported components of the
current module. We'll get more into what this means in a moment. First, let's look 
at `imports`.

Using a namespace has a few benifits. For example, let's look at the next line.

        foo.imports('.bar');

`imports()` does what you expect -- it loads another module into the current context. When we're
in a namespace, any imports that start with '.' are parsed as being from the current namespace;
so, in this example, `foo.imports('app.bar').as('bar')` is the same as `foo.imports('.bar')`.

`as()` lets you alias an import. In the next line, we're importing from a namespace outside 'app':

        foo.imports('my.library.bin').as('bin');

This malkes `my.library.bin` available as `foo.bin`. If we don't use `as`:
        
        foo.imports('my.library.bin');

... `my.library.bin` will be available as `foo.my.library.bin`, which is rather unweildly.

If you just want specific components from a module, you can pass an array to `imports` and
use `from` to specify the target module:

        foo.imports(['Bin', 'Baz']).from('my.libaray.ban');

In all cases, Modus 