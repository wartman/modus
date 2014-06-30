Modus.module('fixtures.test_imports', function (test_imports) {
  test_imports.imports('foo', 'bar').from('fixtures.test_exports');
  test_imports.got = function () {
    return test_imports.foo + test_imports.bar + ':got';
  };
})