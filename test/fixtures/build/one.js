modus.module('fixtures.build.one', function () {
  this.imports(['bar', 'baz']).from('.two');
  this.foo = 'foo';
});