Modus
=====

*Modus* is under heavy development. Feel free to download it and screw around, but be aware that
unstable is an understatement at the moment.

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

*More details are coming, once I nail down the API*