modus.config({
  maps: {
    'underscore': '../node_modules/underscore/underscore-min'
  } 
});

modus.module('fixtures.build.main', function () {
  this.imports('underscore').as('_');
  this.imports('.anon').as('anon');
  this.imports('.fileload').as('fileload');
  this.imports('foo', 'bar', 'baz').from('.one');
});