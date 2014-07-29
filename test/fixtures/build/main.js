modus.module('fixtures.build.main', function (main) {
  main.imports('foo', 'bar', 'baz').from('.one');
  console.log(main.foo, main.bar, main.baz);
});