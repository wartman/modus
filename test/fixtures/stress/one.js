Modus.module('fixtures.stress.one', function (one) {
  one.imports('bar').from('.two');
  one.foo = 'one';
});