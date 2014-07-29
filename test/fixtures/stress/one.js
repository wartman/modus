modus.module('fixtures.stress.one', function (one) {
  one.imports('bar').from('.two');
  one.imports('bax').from('.three');
  one.foo = 'one';
});