Modus.module('fixtures.build.one', function (one) {
  one.imports('bar', 'baz').from('.two');
  one.foo = 'foo';
});