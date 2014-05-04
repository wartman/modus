var assert = require('assert');

var modPrefix = 'imp';
var modInt = 0;
var modId;
var mod = Modus.module('importTestFixture');
var failed = function (reason) {
  throw reason;
};

describe('Modus.Import', function () {

  beforeEach(function () {
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
  });

  describe('#constructor', function () {

    it('sets the first argument as the item to import', function () {
      var item = new Modus.Import('importTest.' + modId, mod);
      assert.equal(item._request, 'importTest.' + modId);
    });

    it('sets the second argument as the parent module', function () {
      var item = new Modus.Import('importTest.' + modId, mod);
      assert.equal(item._module, mod);
    });

  });

  describe('#load', function () {

    it('loads a module, or finds one that already exists', function (done) {
      var item = new Modus.Import('importTest.' + modId, mod);
      item.load(function () {
        assert.equal(mod.env.importTest[modId].foo, 'foo', 'Imported using full name');
        done();
      }, failed);
    });

  });

  describe('#as', function () {
    
    it('aliases an import', function (done) {
      var item = new Modus.Import('importTest.' + modId, mod);
      item.as('bin');
      item.load(function () {
        assert.equal(mod.env.bin.foo, 'foo', 'Imported using alias');
        done();
      }, failed);
    });

  });

  describe('#from', function () {

    it('imports a single component', function (done) {
      var item = new Modus.Import('foo', mod);
      item.from('importTest.' + modId);
      item.load(function () {
        assert.equal(mod.env.foo, 'foo', 'Imported component');
        done();
      }, failed);
    });

    it('imports several components', function (done) {
      var item = new Modus.Import(['foo', 'bar'], mod);
      item.from('importTest.' + modId);
      item.load(function () {
        assert.equal(mod.env.foo, 'foo', 'Imported component');
        assert.equal(mod.env.bar, 'bar', 'Imported component');
        done();
      }, failed);
    });

    it('imports several components and aliases them', function (done) {
      var item = new Modus.Import({fooAlias:'foo', barAlias:'bar'}, mod);
      item.from('importTest.' + modId);
      item.load(function () {
        assert.equal(mod.env.fooAlias, 'foo', 'Imported aliased component');
        assert.equal(mod.env.barAlias, 'bar', 'Imported aliased component');
        done();
      }, failed);
    });

    it('fails if importing several components without a from call', function (done) {
      var item = new Modus.Import(['foo', 'bar'], mod);
      item.load(function () {
        throw new Error();
        done();
      }, function () {
        assert(true, 'Caught error');
        done();
      });
    });

    it('fails if both #from and #as are used', function (done) {
      var item = new Modus.Import(['foo', 'bar'], mod);
      item.from('importTest.' + modId).as('bin');
      item.load(function () {
        throw new Error();
        done();
      }, function () {
        assert(true, 'Caught error');
        done();
      });
    });

  });

  describe('#global', function () {
    it('imports a global var', function (done) {
      GLOBAL.globalTest = 'test';
      var item = new Modus.Import('globalTest', mod);
      item.global('fake/path.js');
      item.load(function () {
        assert.equal(mod.env.globalTest, 'test', 'Got global var.');
        done();
      }, failed);
    });
  });

  describe('#using', function () {

    it('imports using a plugin', function (done) {
      Modus.plugin('test', function (module, next, error) {
        Modus.namespace('testPlugin').module('tested').exports('foo', 'foo');
        next();
      });
      var item = new Modus.Import('testPlugin.tested', mod);
      item.using('test');
      item.load(function () {
        assert.equal(mod.env.testPlugin.tested.foo, 'foo', 'Imported with plugin');
        done();
      }, failed);
    });

    it('imports using a passed function', function (done) {
      var item = new Modus.Import('testPluginFunc.tested', mod);
      item.using(function (next, error) {
        Modus.module('testPluginFunc.tested').exports('foo', 'foo');
        next();
      });
      item.load(function () {
        assert.equal(mod.env.testPluginFunc.tested.foo, 'foo', 'Imported with func');
        done();
      }, failed);
    });

  });

});