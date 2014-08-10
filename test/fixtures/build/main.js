modus.config({
  maps: {
    'underscore': '../node_modules/underscore/underscore'
  } 
});

modus.module('fixtures.build.main', function () {
  this.imports(['foo', 'bar', 'baz']).from('.one');
  this.imports('_').from('underscore');
  this.imports('fileload').from('.fileload');
});