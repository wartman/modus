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
    test.equal(mod.foo, 'foo', 'Item exported correctly');
  });

  test('Module imports', function (test) {
    stop();
    // Fake up a module.
    Modus.env.fixture = {
      one: new Modus.Module({moduleName: 'one', namespace:'fixture'})
    };
    Modus.env.fixture.one.exports('foo', 'foo');
    // Test
    var item = mod.imports('fixture.one');
    test.ok(item instanceof Modus.Import);
    item.load(function () {
      start();
      test.equal(mod.fixture.one.foo, 'foo', 'imported');
    }, function () {
      start();
      ok(false);
    });
  });

  test('Module body', function (test) {
    stop();
    mod.exports('thing', 'thing');
    mod.body(function () {
      mod.exports('otherThing', mod.thing + ':got');
    });
    mod.wait.done(function () {
      start();
      test.equal(mod.otherThing, 'thing:got', 'Ran body after exports, exported internal exports');
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
    // Should fail as you cannot export a string without a name.
    mod.exports('thing');
    mod.wait.done(function () {
      stop();
      ok(false, 'Should have failed!');
    }, function (e) {
      start();
      ok(true);
    });
    mod.run();
  });
  

})();