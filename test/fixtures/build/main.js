modus.module('fixtures.build.main', function () {
  this.imports(['foo', 'bar', 'baz']).from('.one');
  this.imports('fileload').from('.fileload');
});