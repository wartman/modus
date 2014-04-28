(function () {

  module('Modus test');

  test('Modus.namespace', function (test) {
    var ns = Modus.namespace('foo');
    test.deepEqual(Modus.env.foo, ns, 'Saved correctly');
  });

  test('Modus.namespace factory', function (test) {
    stop();
    Modus.namespace('foo', function(foo) {
      start();
      test.deepEqual(Modus.env.foo, foo, 'Passed correctly');
    });
  });

})();