(function () {

  var mod = Modus.module('exportTestFixture');

  module('Modus.Export Test');

  test('Export string', function (test) {
    var item = new Modus.Export('string', 'string', mod);
    item.run();
    test.ok('string' === typeof mod.string);
    test.equal(mod.string, 'string', 'Exported string');
  });

  test('Export object', function (test) {
    var item = new Modus.Export('obj', {
      foo: 'foo',
      bar: 'bar'
    }, mod);
    item.run();
    test.ok('object' === typeof mod.obj);
    test.equal(mod.obj.foo, 'foo', 'Exported object');
    test.equal(mod.obj.bar, 'bar', 'Exported object');
  });

  test('Error on unnamed exports that don\'t return an object', function (test) {
    QUnit.throws(function () {
      var item = new Modus.Export('string', mod);
      item.run();
    });
  });

  test('Export object dirctly (without name)', function (test) {
    var item = new Modus.Export({
      foo: 'foo',
      bar: 'bar'
    }, mod);
    item.run();
    test.equal(mod.foo, 'foo', 'Exported object directly');
    test.equal(mod.bar, 'bar', 'Exported object directly');
  });

  test('Export string with callback', function (test) {
    var item = new Modus.Export('stringCallback', function () { return 'string' }, mod);
    item.run();
    test.ok('string' === typeof mod.stringCallback);
    test.equal(mod.stringCallback, 'string', 'Exported string');
  });

  test('Export object with callback', function (test) {
    var item = new Modus.Export('objCallback', function () {
      return {
        foo: 'foo',
        bar: 'bar'
      };
    }, mod);
    item.run();
    test.ok('object' === typeof mod.objCallback);
    test.equal(mod.objCallback.foo, 'foo', 'Exported object');
    test.equal(mod.objCallback.bar, 'bar', 'Exported object');
  });

  test('Error on unnamed exports that don\'t return an object with callback', function (test) {
    QUnit.throws(function () {
      var item = new Modus.Export(function () {return 'string'}, mod);
      item.run();
    });
  });

  test('Export object directly (without name) with callback', function (test) {
    var item = new Modus.Export(function () {
      return {
        fooCb: 'foo',
        barCb: 'bar'
      };
    }, mod);
    item.run();
    test.equal(mod.fooCb, 'foo', 'Exported object directly');
    test.equal(mod.barCb, 'bar', 'Exported object directly');
  });

})();