(function () {

  var mod = Modus.module('exportTestFixture');

  module('Modus.Export Test');

  test('Export string', function (test) {
    var item = new Modus.Export('string', 'string', mod);
    item.run();
    test.ok('string' === typeof mod.env.string);
    test.equal(mod.env.string, 'string', 'Exported string');
  });

  test('Export object', function (test) {
    var item = new Modus.Export('obj', {
      foo: 'foo',
      bar: 'bar'
    }, mod);
    item.run();
    test.ok('object' === typeof mod.env.obj);
    test.equal(mod.env.obj.foo, 'foo', 'Exported object');
    test.equal(mod.env.obj.bar, 'bar', 'Exported object');
  });

  test('Export object dirctly (without name)', function (test) {
    var item = new Modus.Export({
      foo: 'foo',
      bar: 'bar'
    }, mod);
    item.run();
    test.equal(mod.env.foo, 'foo', 'Exported object directly');
    test.equal(mod.env.bar, 'bar', 'Exported object directly');
  });

  test('Export string with callback', function (test) {
    var item = new Modus.Export('stringCallback', function () { return 'string' }, mod);
    item.run();
    test.ok('string' === typeof mod.env.stringCallback);
    test.equal(mod.env.stringCallback, 'string', 'Exported string');
  });

  test('Export object with callback', function (test) {
    var item = new Modus.Export('objCallback', function () {
      return {
        foo: 'foo',
        bar: 'bar'
      };
    }, mod);
    item.run();
    test.ok('object' === typeof mod.env.objCallback);
    test.equal(mod.env.objCallback.foo, 'foo', 'Exported object');
    test.equal(mod.env.objCallback.bar, 'bar', 'Exported object');
  });

  test('Export object with callback, CommonJs style', function (test) {
    var item = new Modus.Export('objCallback', function (mod) {
      mod.exports = {
        foo: 'foo',
        bar: 'bar'
      };
    }, mod);
    item.run();
    test.ok('object' === typeof mod.env.objCallback);
    test.equal(mod.env.objCallback.foo, 'foo', 'Exported object');
    test.equal(mod.env.objCallback.bar, 'bar', 'Exported object');
  });

  test('Export object directly (without name) with callback', function (test) {
    var item = new Modus.Export(function () {
      return {
        fooCb: 'foo',
        barCb: 'bar'
      };
    }, mod);
    item.run();
    test.equal(mod.env.fooCb, 'foo', 'Exported object directly');
    test.equal(mod.env.barCb, 'bar', 'Exported object directly');
  });

  test('Export object directly (without name) with callback, CommonJs style', function (test) {
    var item = new Modus.Export(function (mod) {
      mod.exports = {
        fooCb: 'foo',
        barCb: 'bar'
      };
    }, mod);
    item.run();
    test.equal(mod.env.fooCb, 'foo', 'Exported object directly');
    test.equal(mod.env.barCb, 'bar', 'Exported object directly');
  });

  test('Export can define the root object', function (test) {
    var item = new Modus.Export(function (mod) {
      mod.exports = function () { return 'foo'; };
    }, mod);
    item.run();
    test.equal(mod.env(), 'foo', 'Exported as root');
  });

  test('Export can define the root object, and keeps previous exports', function (test) {
    var item = new Modus.Export({
      foo: 'foo',
      bar: 'bar'
    }, mod);
    item.run();
    var item = new Modus.Export(function (mod) {
      mod.exports = function () { return 'foo'; };
    }, mod);
    item.run();
    test.equal(mod.env(), 'foo', 'Exported as root');
    test.equal(mod.env.foo, 'foo', 'Kept previous export');
    test.equal(mod.env.bar, 'bar', 'Kept previous export');
  });

  test('Error when attempting to export something named \'exports\'', function (test) {
    var item = new Modus.Export(function (mod) {
      mod.exports.exports = 'bad';
    }, mod);
    QUnit.throws(function () {
      item.run();
    });
    var item = new Modus.Export(function (mod) {
      return {exports: 'bad'};
    }, mod);
    QUnit.throws(function () {
      item.run();
    });
  });

})();