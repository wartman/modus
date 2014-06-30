Modus.module('fixtures.stress.one', function (one) {

  one.imports('two').from('.two');
  one.imports('three').from('.three');

  one.default = 'one';

});