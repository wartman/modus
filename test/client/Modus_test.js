(function () {

  // A lot of this is redundant: probably need to refactor tests at some point.

  module('Modus Test', {
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
    var ns = Modus.namespace('modusTest');
    test.deepEqual(Modus.env.modusTest, ns, 'Saved correctly');
  });

  test('Modus.namespace factory', function (test) {
    stop();
    Modus.namespace('modusTest', function(modusTest) {
      start();
      test.deepEqual(Modus.env.modusTest.env, modusTest.env, 'Passed correctly');
    });
  });

  test('Modus.module', 3, function (test) {
    stop();
    Modus.module('one', function (one) {
      one.exports('foo', function () {
        return 'foo';
      });
      one.exports('bar', 'bar');
      one.body(function (one) {
        start();
        test.equal(one.foo, 'foo', 'Exported component');
        test.equal(one.bar, 'bar', 'Exports investgates type');
        test.deepEqual(Modus.env.root.modules.one.env, one, 'Saved to root namespace by default');
      });
    });
  });

  test('Modus.module imports inside namespace', 1, function (test) {
    stop();
    Modus.namespace('modusTest').module('bar', function (bar) {
      bar.exports('bar', 'bar');
      bar.exports('baz', 'baz');
    });
    Modus.namespace('modusTest').module('bin', function (bin) {
      bin.imports(['bar', 'baz']).from('.bar');
      bin.body(function (bin) {
        start();
        test.equal(bin.bar + bin.baz, 'barbaz', 'Imported in namespace context');
      });
    });
  });

  test('Modus import from external file', function (test) {
    stop();
    Modus.namespace('modusTest').module('bin', function (bin) {
      bin.imports('fixtures.test_exports').as('test_exports');
      bin.body(function (bin) {
        start();
        test.equal(bin.test_exports.foo, 'foo', 'Imported script');
      })
    });
  });

  test('Modus imports full names', function (test) {
    stop();
    Modus.namespace('modusTest').module('testing', function (testing) {
      testing.exports('bar', 'bar');
    });
    Modus.namespace('modusTest').module('testingAgain', function (again) {
      again.imports('.testing');
      again.body(function (again) {
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
    Modus.namespace('modusTest').module('shimmed', function (shimmed) {
      shimmed.imports('shim');
      shimmed.body(function (shimmed) {
        start();
        test.equal(shimmed.shim, 'shim', 'Got shim');
      })
    });
  });

  test('Modus.namespace create several modules at once', function (test) {
    stop();
    Modus.namespace('namespaceTest', function (foo) {
      foo.imports('fixtures.test_imports').as('imp');
      foo.imports('fixtures.test_exports').as('exp');
      foo.module('test_bar', function (test_bar) {
        test_bar.exports('foo', 'foo');
      });
      foo.module('test_ban', function (test_ban) {
        test_ban.exports('ban', 'ban');
      });
      foo.wait.done(function () {
        start();
        test.equal(foo.env.imp.test, 'foobar:got', 'namespace can import');
        test.equal(foo.env.exp.foo, 'foo', 'namespace can import');
        test.equal(foo.modules.test_ban.env.ban, 'ban', 'Can define modules');
      });
    });
  });

  test('Export several items with an exports call, returned', function (test) {
    stop();
    Modus.namespace('modusTest').module('many', function (many) {
      many.exports(function (many) {
        return {
          fid: 'fid',
          fad: 'fad'
        }
      });
      many.body(function (many) {
        start();
        test.equal(many.fid, 'fid', 'Exported');
        test.equal(many.fad, 'fad', 'Exported');
      });
    });
  });

  test('Export several items with an exports call, exports object', function (test) {
    stop();
    Modus.namespace('modusTest').module('many', function (many) {
      many.exports(function (many) {
        return {
          fid: 'fid',
          fad: 'fad'
        }
      });
      many.body(function (many) {
        start();
        test.equal(many.fid, 'fid', 'Exported');
        test.equal(many.fad, 'fad', 'Exported');
      });
    });
  });

  test('Modus.Module.body', function (test) {
    stop();
    Modus.namespace('modusTest').module('depOne', function (depOne) {
      depOne.body(function (depOne) {
        var Foo = 'Foo';
        var Bar = 'Bar';
        depOne.bin = 'bin'
        depOne.exports = {
          Foo: Foo,
          Bar: Bar
        };
      });
    });
    Modus.namespace('modusTest').module('testBody', function (testBody) {
      testBody.imports(['Foo', 'Bar', 'bin']).from('.depOne');
      testBody.body(function (testBody) {
        start();
        test.equal(testBody.bin, 'bin', 'Body directly defined');
        test.equal(testBody.Foo + testBody.Bar, 'FooBar', 'Body exported stuff');
      });
    });
  });

  test('Get imports from another module', function (test) {
    stop();
    Modus.namespace('modusTest').module('one', function (one) {
      one.exports('foo', 'foo');
      one.exports('bar', 'bar');
    });
    Modus.namespace('modusTest').module('two', function (two) {
      two.imports(['foo', 'bar']).from('.one');
      two.exports('bin', 'bin');
    });
    Modus.namespace('modusTest').module('three', function (three) {
      three.imports(['foo', 'bar', 'bin']).from('.two');
      three.body(function (three) {
        start();
        test.equal(three.foo, 'foo', 'Imported');
        test.equal(three.bar, 'bar', 'Imported');
        test.equal(three.bin, 'bin', 'Imported');
      })
    });

  });

})();