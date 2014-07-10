Modus.module('fixtures.stress.one', function (one) {
  one.imports('two').from('.two');
  one.one = 'one';
});