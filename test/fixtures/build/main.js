modus.config({
  maps: {
    'underscore': '../node_modules/underscore/underscore-min'
  } 
});

modus.module('fixtures.build.main', function () {
  this.imports('_').from('underscore');
  this.imports(['foo', 'bar', 'baz']).from('.one');
  this.imports('anon').from('.anon');
  this.imports('fileload').from('.fileload');
});