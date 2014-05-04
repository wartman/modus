var assert = require('assert');

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

      it('imports from external file (using node)', function (done) {
        Modus.namespace('test').module('external', function (external) {
          external.imports('fixtures.one').as('one');
          external.body(function (external) {
            assert.equal(external.one.foo, 'foo', 'Imported script');
            assert.equal(external.one.bar, 'bar', 'Imported script');
            done();
          })
        });
      });

      describe('#using', function () {

        it('uses a plugin from an external file (using node)', function (done) {
          Modus.namespace('modusTest').module('testPluginExternal', function (testPluginExternal) {
            testPluginExternal.imports('mocked.name').as('mocked').using('fixtures.plugin');
            testPluginExternal.body(function (testPluginExternal) {
              assert.equal(testPluginExternal.mocked, 'plugin done', 'Used plugin, loading from external file');
              done();
            }, function (e) {
              throw Error(e);
              done();
            });
          });
        });

      });

    });

  });

  describe('#publish', function () {

    it('creates a simple module using a single value', function (done) {
      Modus.publish('modusTest.published', 'foo');
      Modus.namespace('modusTest').module('testPublished', function (testPublished) {
        testPublished.imports('.published');
        testPublished.body(function (testPublished) {
          assert.equal(testPublished.published, 'foo', 'published');
          done();
        });
      });
    });

  });

  describe('#map / #getMappedPath', function () {

    it('maps a module to a path', function () {
      Modus.map('fixtures/map/mapped', 'foo.mapped');
      assert.equal(Modus.getMappedPath('foo.mapped').src, Modus.config('root') + 'fixtures/map/mapped', 'Path was found');
    });

    it('maps several modules to a path', function () {
      Modus.map('fixtures/map/mapped', [
        'foo.mapped.one',
        'foo.mapped.two'
      ]);
      assert.equal(Modus.getMappedPath('foo.mapped.one').src, Modus.config('root') + 'fixtures/map/mapped', 'Path was found');
      assert.equal(Modus.getMappedPath('foo.mapped.two').src, Modus.config('root') + 'fixtures/map/mapped', 'Path was found');
    });

    it('maps patterns to a path', function () {
      Modus.map('fixtures/fake/module', [
        'foo.fake',
        'foo.fake.*',
        'foo.**.many',
        'foo.*.one'
      ]);
      assert.equal(Modus.getMappedPath('foo.fake').src, Modus.config('root') +'fixtures/fake/module', 'Path was found');
      assert.equal(Modus.getMappedPath('foo.fake.Bar').src, Modus.config('root') +'fixtures/fake/module', 'Path was found');
      assert.equal(Modus.getMappedPath('foo.fake.Baz').src, Modus.config('root') +'fixtures/fake/module', 'Path was found');
      assert.equal(Modus.getMappedPath('foo.fake.Foo').src, Modus.config('root') +'fixtures/fake/module', 'Path was found automatically');
      assert.equal(Modus.getMappedPath('foo.things.many').src, Modus.config('root') +'fixtures/fake/module', '** matches many segments');
      assert.equal(Modus.getMappedPath('foo.things.etc.many').src, Modus.config('root') +'fixtures/fake/module', '** matches many segments');
      assert.notEqual(Modus.getMappedPath('foo.things.etc.fud').src, Modus.config('root') +'fixtures/fake/module', '** does not match when last segment is incorrect');
      assert.equal(Modus.getMappedPath('foo.things.one').src, Modus.config('root') +'fixtures/fake/module', '* matches one segment');
      assert.notEqual(Modus.getMappedPath('foo.things.etc.one').src, Modus.config('root') +'fixtures/fake/module', '* does not match many segments');
    });

    it('replaces wildcards in urls', function () {
      Modus.map('fixtures/fake/*', 'fid.*');
      assert.equal(Modus.getMappedPath('fid.bin').src, Modus.config('root') +'fixtures/fake/bin', 'Mapped');
      assert.notEqual(Modus.getMappedPath('fid.bin.bar').src, Modus.config('root') +'fixtures/fake/bin/bar', '* matches only one');
      Modus.map('fixtures/fake/many/**/*', 'fid.**.*');
      assert.equal(Modus.getMappedPath('fid.bin.bar').src, Modus.config('root') + 'fixtures/fake/many/bin/bar', '** matches many');
      assert.equal(Modus.getMappedPath('fid.bin.baz.bar').src, Modus.config('root') + 'fixtures/fake/many/bin/baz/bar', '** matches many');
    });

  });

});