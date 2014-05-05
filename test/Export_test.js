if (Modus.isServer()) var assert = require('assert');

var mod = Modus.module('exportTestFixture');

describe('Modus.Export', function () {

  describe('#constructor', function () {

    it('exports string', function () {
      var item = new Modus.Export('string', 'string', mod);
      item.run();
      assert('string' === typeof mod.env.string);
      assert.equal(mod.env.string, 'string', 'Exported string');
    });

    it('exports object', function () {
      var item = new Modus.Export('obj', {
        foo: 'foo',
        bar: 'bar'
      }, mod);
      item.run();
      assert('object' === typeof mod.env.obj);
      assert.equal(mod.env.obj.foo, 'foo', 'Exported object');
      assert.equal(mod.env.obj.bar, 'bar', 'Exported object');
    });

    it('exports to module root if not nammed', function () {
      var item = new Modus.Export({
        foo: 'foo',
        bar: 'bar'
      }, mod);
      item.run();
      assert.equal(mod.env.foo, 'foo', 'Exported object directly');
      assert.equal(mod.env.bar, 'bar', 'Exported object directly');
    });

    it('exports string using a callback', function () {
      var item = new Modus.Export('stringCallback', function () { return 'string' }, mod);
      item.run();
      assert.ok('string' === typeof mod.env.stringCallback);
      assert.equal(mod.env.stringCallback, 'string', 'Exported string');
    });

    it('exports object using callback', function () {
      var item = new Modus.Export('objCallback', function () {
        return {
          foo: 'foo',
          bar: 'bar'
        };
      }, mod);
      item.run();
      assert.ok('object' === typeof mod.env.objCallback);
      assert.equal(mod.env.objCallback.foo, 'foo', 'Exported object');
      assert.equal(mod.env.objCallback.bar, 'bar', 'Exported object');
    });

    it('exports object to module root using callback', function () {
      var item = new Modus.Export(function () {
        return {
          fooCb: 'foo',
          barCb: 'bar'
        };
      }, mod);
      item.run();
      assert.equal(mod.env.fooCb, 'foo', 'Exported object directly');
      assert.equal(mod.env.barCb, 'bar', 'Exported object directly');
    });

    it('exports using commonjs style when set to "isBody"', function () {
      var item = new Modus.Export(function (mod) {
        mod.exports = {
          fooCb: 'foo',
          barCb: 'bar'
        };
      }, mod, {isBody:true});
      item.run();
      assert.equal(mod.env.fooCb, 'foo', 'Exported object directly');
      assert.equal(mod.env.barCb, 'bar', 'Exported object directly');
    });

    it('can define the root object (if "isBody")', function () {
      var item = new Modus.Export(function (mod) {
        mod.exports = function () { return 'foo'; };
      }, mod, {isBody:true});
      item.run();
      assert.equal(mod.env(), 'foo', 'Exported as root');
    });

    it('doesn\'t overwrite previous exports when defining root export', function () {
      var item = new Modus.Export({
        foo: 'foo',
        bar: 'bar'
      }, mod);
      item.run();
      // Test isBody mode:
      var item = new Modus.Export(function (mod) {
        mod.exports = function () { return 'foo'; };
      }, mod, {isBody:true});
      item.run();
      assert.equal(mod.env(), 'foo', 'Exported as root');
      assert.equal(mod.env.foo, 'foo', 'Kept previous export');
      assert.equal(mod.env.bar, 'bar', 'Kept previous export');
    });

    it('throws error when attempting to export something named \'exports\' (in "isBody" mode)', function () {
      var item = new Modus.Export(function (mod) {
        mod.exports.exports = 'bad';
      }, mod, {isBody:true});
      assert.throws(item.run, Error);
    });

  });

});