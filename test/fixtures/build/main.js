modus.main({
  main: 'fixtures.build.main',
  buildEvents: [
    'fixtures/build/events_one',
    'fixtures/build/events_two'
  ],
  maps: {
    'underscore': '../node_modules/underscore/underscore-min'
  } 
}, function () {
  this.imports('underscore');
  this.imports('fixtures.build.anon');
  this.imports('fixtures.build.moduleBuildEvent').as('fileload');
  this.imports('fixtures.build.globalBuildEvent').as('glob');
  this.from('fixtures.build.one').imports('foo', 'bar', 'baz');
});