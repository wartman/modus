(function () {
  
  var mod;
  var modID = 0;

  module('Modus.Module Test', {
    setup: function() {
      modID++;
      mod = new Modus.Module({
        namespace: 'root',
        moduleName: 'test' + modID
      });
    },
  });

  test('Module init', function (test) {
    var opts = {
      namespace: 'namespaceTest',
      moduleName: 'moduleName'
    };
    var modTest = new Modus.Module(opts);
    test.deepEqual(modTest.options, opts, 'Options were defined');
    var modTest = new Modus.Module({moduleName: 'foo'});
    test.deepEqual(modTest.options.namespace, Modus.Module.prototype.options.namespace, 'Applied defaults');
  });

  test('Module getName/getFullName', function (test) {
    test.equal(mod.getName(), 'test' + modID);
    test.equal(mod.getFullName(), 'root.test' + modID);
  });

  test('Module exports', function (test) {
    var item = mod.exports('foo', 'foo');
    test.ok(item instanceof Modus.Export);
    item.run();
    test.equal(mod.env.foo, 'foo', 'Item exported correctly');
  });

  test('Module imports', function (test) {
    stop();
    // Fake up a module.
    Modus.env.fixture = {
      modules: {
        one: new Modus.Module({moduleName: 'one', namespace:'fixture'})
      }
    };
    Modus.env.fixture.modules.one.exports('foo', 'foo');
    // Test
    var item = mod.imports('fixture.one');
    test.ok(item instanceof Modus.Import);
    item.load(function () {
      start();
      test.equal(mod.env.fixture.one.foo, 'foo', 'imported');
    }, function () {
      start();
      ok(false);
    });
  });

  test('Module body', function (test) {
    stop();
    mod.exports('thing', 'thing');
    mod.body(function (mod) {
      mod.exports.otherThing = mod.thing + ':got';
    });
    mod.wait.done(function () {
      start();
      test.equal(mod.env.otherThing, 'thing:got', 'Ran body after exports, exported internal exports');
    });
    mod.run();
  });

  test('Module catches import errors (if throwErrors === false)', function (test) {
    stop();
    mod.options.throwErrors = false;
    // should fail as you cannot import components without a module.
    mod.imports(['foo', 'bar']);
    mod.wait.done(function () {
      stop();
      ok(false, 'Should have failed!');
    }, function () {
      start();
      ok(true);
    });
    mod.run();
  });

  test('Module catches export errors (if throwErrors === false)', function (test) {
    stop();
    mod.options.throwErrors = false;
    mod.exports('thing', function () {
      throw Error();
    });
    mod.wait.done(function () {
      stop();
      ok(false, 'Should have failed!');
    }, function (e) {
      start();
      ok(true);
    });
    mod.run();
  });

  test('Nested modules', function (test) {
    stop();
    mod.module('one', function (one) {
      one.module('two', function (two) {
        two.module('three', function (three) {
          three.exports('foo', 'foo');
        });
      });
    });
    mod.wait.done(function () {
      start();
      test.equal(mod.modules.one.modules.two.modules.three.env.foo, 'foo', 'Correctly created.');
    });
    mod.run();
  });

  test('Nested namespaces', function (test) {
    stop();
    mod.namespace('one', function (one) {
      one.namespace('two', function (two) {
        two.namespace('three', function (three) {
          three.module('four', function (four) {
            four.exports('foo', 'foo');
          });
        });
      });
    });
    mod.wait.done(function () {
      start();
      test.equal(mod.modules.one.modules.two.modules.three.modules.four.env.foo, 'foo', 'Correctly created.');
    });
    mod.run();
  })

})();