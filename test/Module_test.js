if (Modus.isServer()) var assert = require('assert');

describe('Modus.Module', function () {
  var mod;
  var modID = 0;

  beforeEach(function() {
    modID++;
    mod = new Modus.Module('moduleTest.test' + modID);
  });

  describe('#init', function () {

    it('sets up correctly', function () {
      var opts = {namespace: 'moduleTest'};
      var modTest = new Modus.Module('moduleName', opts);
      opts.moduleName = 'moduleName';
      assert.deepEqual(modTest.options, opts, 'Options were defined');
    });

    it('registers itself with Modus.env', function () {
      var module = new Modus.Module('moduleTest.isRegistered');
      assert.deepEqual(module, Modus.env['moduleTest.isRegistered'], 'Saved');
    });

  });

  describe('#getName / #getFullName', function () {
    it('returns the name', function () {
      assert.equal(mod.getName(), 'test' + modID);
      assert.equal(mod.getFullName(), 'moduleTest.test' + modID);
    });
  });


  describe('#imports', function () {

    it('imports an item', function (done) {
      // Fake up a module.
      Modus.env['fixture.one'] = new Modus.Module('fixture.one', {}, function (one) {
        one.foo = 'foo'
      });
      var mod = new Modus.Module('test.importer', {}, function (importer) {
        importer.imports('foo').from('fixture.one');
        assert.equal(importer.foo, 'foo', 'imported');
        done();
      });
      mod.enable();
    });

    it('imports an external module', function (done) {
      Modus.module('test.real', function (real) {
        real.imports('test_imports').from('fixtures.test_imports');
        assert.equal(real.test_imports.got(), 'foobar:got');
        done();
      });
    });

    it('imports an external module', function (done) {
      Modus.module('test.stress', function (stress) {
        stress.imports('two', 'three').from('fixtures.stress.one');
        assert.equal(stress.two + stress.three, 'twothree');
        done();
      });
    });


  });

});