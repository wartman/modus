modus.main({
  main: 'main',
  maps: {
    'underscore': '../node_modules/underscore/underscore-min'
  } 
}, function () {
  this.imports('underscore').as('_');
  this.imports('fixtures.build.anon').as('anon');
  this.imports('fixtures.build.moduleBuildEvent').as('fileload');
  this.imports('fixtures.build.globalBuildEvent').as('glob');
  this.imports('foo', 'bar', 'baz').from('fixtures.build.one');
});