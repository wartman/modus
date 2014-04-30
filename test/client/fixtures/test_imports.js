Modus.namespace('fixtures').module('test_imports', function (test_imports) {
  test_imports.imports(['foo', 'bar']).from('.test_exports');
  test_imports.exports('test', function (test_imports) {
    test_imports.exports = test_imports.foo + test_imports.bar + ':got';
  });
})