modus.module('fixtures.build.main', function (main) {
  main.imports('foo', 'bar', 'baz').from('.one');
  main.imports('fileload').from('.fileload');
});