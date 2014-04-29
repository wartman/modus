(function () {

  var modPrefix = 'imp-';
  var modInt = 0;
  var modId;
  var mod = Modus.module('importTestFixture');
  var failed = function (reason) {
    throw reason;
  };

  module('Modus.Import Test', {
    setup: function() {
      modInt++;
      modId = modPrefix + modInt;
      Modus.namespace('importTest').module(modId, function (mod) {
        mod.exports({
          foo: 'foo',
          bar: 'bar',
          baz: 'baz',
          bin: 'bin'
        });
      });
    }
  });

  test('Import all', function (test) {
    stop();
    var item = new Modus.Import('importTest.' + modId, mod);
    item.load(function () {
      start();
      test.equal(mod.importTest[modId].foo, 'foo', 'Imported using full name');
    }, failed);
  });

  test('Import as', function (test) {
    stop();
    var item = new Modus.Import('importTest.' + modId, mod);
    item.as('bin');
    item.load(function () {
      start();
      test.equal(mod.bin.foo, 'foo', 'Imported using alias');
    }, failed);
  });

  test('Import from single', function (test) {
    stop();
    var item = new Modus.Import('foo', mod);
    item.from('importTest.' + modId);
    item.load(function () {
      start();
      test.equal(mod.foo, 'foo', 'Imported component');
    }, failed);
  });

  test('Import from many', function (test) {
    stop();
    var item = new Modus.Import(['foo', 'bar'], mod);
    item.from('importTest.' + modId);
    item.load(function () {
      start();
      test.equal(mod.foo, 'foo', 'Imported component');
      test.equal(mod.bar, 'bar', 'Imported component');
    }, failed);
  });

  test('Import from many aliased (using object)', function (test) {
    stop();
    var item = new Modus.Import({fooAlias:'foo', barAlias:'bar'}, mod);
    item.from('importTest.' + modId);
    item.load(function () {
      start();
      test.equal(mod.fooAlias, 'foo', 'Imported aliased component');
      test.equal(mod.barAlias, 'bar', 'Imported aliased component');
    }, failed);
  });

  test('Fail if importing components and no from call', function (test) {
    stop();
    var item = new Modus.Import(['foo', 'bar'], mod);
    item.load(function () {
      start();
      ok(false)
    }, function () {
      start();
      ok(true, 'Caught error');
    });
  });

  test('Fail if importing components and trying to use alias', function (test) {
    stop();
    var item = new Modus.Import(['foo', 'bar'], mod);
    item.from('importTest.' + modId).as('bin');
    item.load(function () {
      start();
      ok(false)
    }, function () {
      start();
      ok(true, 'Caught error');
    });
  });

  test('Import using plugin', function (test) {
    Modus.plugins.test = new Modus.Loader(function (module, cb) {
      Modus.namespace('testPlugin').module('tested').exports('foo', 'foo');
      cb();
    });
    stop();
    var item = new Modus.Import('testPlugin.tested', mod);
    item.uses('test');
    item.load(function () {
      start();
      test.equal(mod.testPlugin.tested.foo, 'foo', 'Imported with plugin');
    }, failed);
  });

})();