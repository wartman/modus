(function () {

  // A lot of this is redundant: probably need to refactor tests at some point.

  module('Modus Test', {
    setup: function () {
      Modus.config({
        root: '',
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

  test('Modus imports globals', function (test) {
    stop();
    Modus.namespace('modusTest').module('shimmed', function (shimmed) {
      shimmed.imports('fixtures/shim.js').global('shim');
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

  test('Define sub-namespace directly', function (test) {
    stop();
    Modus.namespace('sub.test').module('one', function (one) {
      one.exports('foo', 'foo');
      one.body(function (one) {
        start();
        test.equal(Modus.env.sub.modules.test.modules.one.env, one, 'Created all modules');
      });
    });
  });

  test('Module name must be one component long', function (test) {
    QUnit.throws(function () {
      Modus.namespace('modusTest').module('foo.bar');
    });
    QUnit.throws(function () {
      Modus.namespace('modusTest').namespace('foo.bar');
    });
  });

  test('Modus.publish', function (test) {
    stop();
    Modus.publish('modusTest.published', 'foo');
    Modus.namespace('modusTest').module('testPublished', function (testPublished) {
      testPublished.imports('.published');
      testPublished.body(function (testPublished) {
        start();
        test.equal(testPublished.published, 'foo', 'published');
      });
    })
  });

  test('Use a plugin', function (test) {
    stop();
    Modus.plugin('test', function (module, next, error) {
      Modus.publish(module, 'plugin done');
      next();
    });
    Modus.namespace('modusTest').module('testPlugin', function (testPlugin) {
      testPlugin.imports('mocked.name').as('mocked').using('test');
      testPlugin.body(function (testPlugin) {
        start();
        test.equal(testPlugin.mocked, 'plugin done', 'Used plugin');
      })
    });
  });

  test('Use a plugin from an external file', function (test) {
    stop();
    Modus.namespace('modusTest').module('testPluginExternal', function (testPluginExternal) {
      testPluginExternal.imports('mocked.name').as('mocked').using('fixtures.plugin');
      testPluginExternal.body(function (testPluginExternal) {
        start();
        test.equal(testPluginExternal.mocked, 'plugin done', 'Used plugin, loading from external file');
      })
    });
  });

})();