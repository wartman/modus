Modus
=====

*Modus* is under heavy development. Feel free to download it and screw around, but be aware that
unstable is an understatement at the moment.

How about some code?
--------------------

```JavaScript
Modus.namespace('app').module('foo', function (foo) {
   
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

*More details are coming, once I nail down the API*

v0.1.3
------
Client-side module loading works and has some tests. Server-side
module loading and compiling is being planned.