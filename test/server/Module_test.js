var assert = require('assert');
var Modus = require('../../');

describe('Modus.Module', function () {
  var mod;
  var modID = 0;

  beforeEach(function() {
    modID++;
    mod = new Modus.Module({
      namespace: 'root',
      moduleName: 'test' + modID
    });
  });

  describe('#init', function () {
    it('sets up correctly', function () {
      var opts = {
        namespace: 'namespaceTest',
        moduleName: 'moduleName'
      };
      var modTest = new Modus.Module(opts);
      assert.deepEqual(modTest.options, opts, 'Options were defined');
      var modTest = new Modus.Module({moduleName: 'foo'});
      assert.deepEqual(modTest.options.namespace, Modus.Module.prototype.options.namespace, 'Applied defaults');
    });
  });

  describe('#getName / #getFullName', function () {
    it('returns the name', function () {
      assert.equal(mod.getName(), 'test' + modID);
      assert.equal(mod.getFullName(), 'root.test' + modID);
    });
  });

  describe('#exports', function () {

    it('exports an item', function () {
      var item = mod.exports('foo', 'foo');
      assert.ok(item instanceof Modus.Export);
      item.run();
      assert.equal(mod.env.foo, 'foo', 'Item exported correctly');
    });

    it('catches errors (if throwErrors === false)', function (done) {
      mod.options.throwErrors = false;
      mod.exports('thing', function () {
        throw Error();
      });
      mod.wait.done(function () {
        assert(false, 'Should have failed!');
      }, function (e) {
        done();
        assert(true);
      });
      mod.run();
    });

  });

  describe('#imports', function () {

    it('imports an item', function (done) {
      // Fake up a module.
      Modus.env.fixture = {
        modules: {
          one: new Modus.Module({moduleName: 'one', namespace:'fixture'})
        }
      };
      Modus.env.fixture.modules.one.exports('foo', 'foo');
      // Test
      var item = mod.imports('fixture.one');
      assert.ok(item instanceof Modus.Import);
      item.load(function () {
        assert.equal(mod.env.fixture.one.foo, 'foo', 'imported');
        done();
      }, function () {
        throw new Error();
        done();
      });
    });

    it('catches errors (if throwErrors === false)', function (done) {
      mod.options.throwErrors = false;
      // should fail as you cannot import components without a module.
      mod.imports(['foo', 'bar']);
      mod.wait.done(function () {
        assert(false, 'Should have failed!');
        done();
      }, function () {
        assert(true);
        done();
      });
      mod.run();
    });

  });

  describe('#body', function () {

    it('runs after everything else', function (done) {
      mod.exports('thing', 'thing');
      mod.body(function (mod) {
        mod.exports.otherThing = mod.thing + ':got';
      });
      mod.wait.done(function () {
        assert.equal(mod.env.otherThing, 'thing:got', 'Ran body after exports, exported internal exports');
        done();
      });
      mod.run();
    });

  });

  describe('#module', function () {

    it('nests modules', function (done) {
      mod.module('one', function (one) {
        one.module('two', function (two) {
          two.module('three', function (three) {
            three.exports('foo', 'foo');
          });
        });
      });
      mod.wait.done(function () {
        assert.equal(mod.modules.one.modules.two.modules.three.env.foo, 'foo', 'Correctly created.');
        done();
      });
      mod.run();
    });

  });

  describe('#namespace', function () {

    it('nests namespaces', function (done) {
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
        assert.equal(mod.modules.one.modules.two.modules.three.modules.four.env.foo, 'foo', 'Correctly created.');
        done();
      });
      mod.run();
    });

  });

});