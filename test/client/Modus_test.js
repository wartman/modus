(function () {

  module('Modus test', {
    setup: function () {
      Modus.config({
        root: 'client/',
        map: {
          'fixtures/*.js': 'fixtures.*'
        }
      });
    }
  });

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

  test('Modus.module', 3, function (test) {
    stop();
    Modus.module('one', function (one) {
      one.exports('foo', function () {
        return 'foo';
      });
      one.exports('bar', 'bar');
      one.wait.done(function () {
        start();
        test.equal(one.foo, 'foo', 'Exported component');
        test.equal(one.bar, 'bar', 'Exports investgates type');
        test.deepEqual(Modus.env.root.one, one, 'Saved to root namespace by default');
      });
    });
  });

  test('Modus.module imports inside namespace', 1, function (test) {
    stop();
    Modus.namespace('foo').module('bar', function (bar) {
      bar.exports('bar', 'bar');
      bar.exports('baz', 'baz');
    });
    Modus.namespace('foo').module('bin', function (bin) {
      bin.imports(['bar', 'baz']).from('.bar');
      bin.wait.done(function () {
        start();
        test.equal(bin.bar + bin.baz, 'barbaz', 'Imported in namespace context');
      })
    })
  });

  test('Modus import from external file', function (test) {
    stop();
    Modus.namespace('foo').module('bin', function (bin) {
      bin.imports('fixtures.test_exports').as('test_exports');
      bin.wait.done(function() {
        start();
        test.equal(bin.test_exports.foo, 'foo', 'Imported script');
      })
    });
  });

  test('Modus imports full names', function (test) {
    stop();
    Modus.namespace('foo').module('testing', function (testing) {
      testing.exports('bar', 'bar');
    });
    Modus.namespace('foo').module('testingAgain', function (again) {
      again.imports('.testing');
      again.wait.done(function () {
        start();
        test.equal(again.testing.bar, 'bar', 'Can import without from');
      });
    });
  });

  test('Modus imports shims', function (test) {
    stop();
    Modus.shim('shim', {
      map: 'fixtures/shim.js'
    });
    Modus.namespace('foo').module('shimmed', function (shimmed) {
      shimmed.imports('shim');
      shimmed.wait.done(function () {
        start();
        test.equal(shimmed.shim, 'shim', 'Got shim');
      })
    });
  });

  test('Modus.namespace several modules at once', function (test) {
    stop();
    Modus.namespace('foo', function (foo) {
      foo.imports('fixtures.test_imports').as('imp');
      foo.module('test_bar', function (test_bar) {
        test_bar.exports('foo', 'foo');
      });
      foo.module('test_ban', function (test_ban) {
        test_ban.exports('ban', 'ban');
      });
      foo.wait.done(function () {
        start();
        test.equal(foo.imp.test, 'foobar:got', 'namespace can import');
        test.equal(foo.test_ban.ban, 'ban', 'Can define modules');
      });
    })

  });

})();