var assert = require('assert');
var Modus = require('../../dist/Modus');

describe('Modus', function () {

  beforeEach(function (done) {
    Modus.config('root', __dirname + '/');
    done();
  });

  describe('#namespace', function () {

    it('creates a namespace', function () {
      var ns = Modus.namespace('modusTest');
      assert.deepEqual(Modus.env.modusTest, ns, 'Saved correctly');
    });

    it('creates a namespace using a factory', function (done) {
      Modus.namespace('modusTest', function(modusTest) {
        assert.deepEqual(Modus.env.modusTest.env, modusTest.env, 'Passed correctly');
        done();
      });
    });

    it('creates a module in a namespace', function (done) {
      Modus.namespace('test').module('one', function (one) {
        one.exports('foo', function () {
          return 'foo';
        });
        one.exports('bar', 'bar');
        one.body(function (one) {
          assert.equal(one.foo, 'foo', 'Exported component');
          assert.equal(one.bar, 'bar', 'Exports investgates type');
          assert.deepEqual(Modus.env.test.modules.one.env, one, 'Saved to test namespace');
          done();
        });
      });
    });

  });

  describe('#module', function () {

    it('creates a module', function (done) {
      Modus.module('one', function (one) {
        one.exports('foo', function () {
          return 'foo';
        });
        one.exports('bar', 'bar');
        one.body(function (one) {
          assert.equal(one.foo, 'foo', 'Exported component');
          assert.equal(one.bar, 'bar', 'Exports investgates type');
          assert.deepEqual(Modus.env.root.modules.one.env, one, 'Saved to root namespace by default');
          done();
        });
      });
    });

    describe('#exports', function () {

      it('exports components', function (done) {
        Modus.namespace('test').module('exporter', function (exporter) {
          exporter.exports('bar', 'bar');
          exporter.exports('baz', 'baz');
        }).wait.done(function () {
          assert.deepEqual(Modus.env.test.modules.exporter.env, {bar:'bar', baz:'baz'});
          done();
        });
      });

    })

    describe('#imports', function () {

      it('imports another module using current namespace', function (done) {
        Modus.namespace('test').module('bar', function (bar) {
          bar.exports('bar', 'bar');
          bar.exports('baz', 'baz');
        });
        Modus.namespace('test').module('bin', function (bin) {
          bin.imports(['bar', 'baz']).from('.bar');
          bin.body(function (bin) {
            assert.equal(bin.bar + bin.baz, 'barbaz', 'Imported in namespace context');
            done();
          });
        });
      });

      it('imports from external file', function (done) {
        Modus.namespace('test').module('external', function (external) {
          external.imports('fixtures.one').as('one');
          external.body(function (external) {
            assert.equal(external.one.foo, 'foo', 'Imported script');
            assert.equal(external.one.bar, 'bar', 'Imported script');
            done();
          })
        });
      });

    });

  });

});