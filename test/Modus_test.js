if (Modus.isServer()) var assert = require('assert');

describe('Modus', function () {

  beforeEach(function (done) {
    if (Modus.isServer()) {
      Modus.config('root', __dirname + '/');
    } else {
      Modus.config('root', '');
    }
    done();
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
          assert.deepEqual(Modus.env['one'].env, one, 'Saved to Modus.env correctly');
          done();
        });
      });
    });

    it('creates a module in a namespace', function (done) {
      Modus.module('test/one', function (one) {
        one.exports('foo', function () {
          return 'foo';
        });
        one.exports('bar', 'bar');
        one.body(function (one) {
          assert.equal(one.foo, 'foo', 'Exported component');
          assert.equal(one.bar, 'bar', 'Exports investgates type');
          assert.deepEqual(Modus.env['test/one'].env, one, 'Saved to Modus.env');
          done();
        });
      });
    });

    it('can define sub-modules', function (done) {
      Modus.module('namespaceTest', function (foo) {
        foo.imports('fixtures/test_imports').as('imp');
        foo.imports('fixtures/test_exports').as('exp');
        foo.module('test_bar', function (test_bar) {
          test_bar.exports('foo', 'foo');
        });
        foo.module('test_ban', function (test_ban) {
          test_ban.exports('ban', 'ban');
        });
        foo.wait.done(function () {
          assert.equal(foo.env.imp.test, 'foobar:got', 'namespace can import');
          assert.equal(foo.env.exp.foo, 'foo', 'namespace can import');
          assert.equal(Modus.env['namespaceTest/test_ban'].env.ban, 'ban', 'Can define modules');
          done();
        }, function (reason) {
          throw new Error(reason);
          done();
        });
      });
    });

    describe('#exports', function () {

      it('exports components', function (done) {
        Modus.module('test/exporter', function (exporter) {
          exporter.exports('bar', 'bar');
          exporter.exports('baz', 'baz');
        }).wait.done(function () {
          assert.deepEqual(Modus.env['test/exporter'].env, {bar:'bar', baz:'baz'});
          done();
        });
      });

    })

    describe('#imports', function () {

      it('imports another module using current namespace', function (done) {
        Modus.module('test/bar', function (bar) {
          bar.exports('bar', 'bar');
          bar.exports('baz', 'baz');
        });
        Modus.module('test/bin', function (bin) {
          bin.imports(['bar', 'baz']).from('./bar');
          bin.body(function (bin) {
            assert.equal(bin.bar + bin.baz, 'barbaz', 'Imported in namespace context');
            done();
          });
        });
      });

      it('imports full names by default', function (done) {
        Modus.module('modusTest/testing', function (testing) {
          testing.exports('bar', 'bar');
        });
        Modus.module('modusTest/testingAgain', function (again) {
          again.imports('./testing');
          again.body(function (again) {
            assert.equal(again.testing.bar, 'bar', 'Can import without from');
            done();
          });
        });
      });

      it('imports from external file', function (done) {
        Modus.module('test/external', function (external) {
          external.imports('fixtures/one').as('one');
          external.body(function (external) {
            assert.equal(external.one.foo, 'foo', 'Imported script');
            assert.equal(external.one.bar, 'bar', 'Imported script');
            done();
          })
        });
      });

      describe('#using', function () {

        it('uses a plugin from an external file', function (done) {
          Modus.module('modusTest/testPluginExternal', function (testPluginExternal) {
            testPluginExternal.imports('mocked/name').as('mocked').using('fixtures/plugin');
            testPluginExternal.body(function (testPluginExternal) {
              assert.equal(testPluginExternal.mocked, 'plugin done', 'Used plugin, loading from external file');
              done();
            });
          });
        });

      });

      describe('#global', function () {
      
        if(Modus.isClient()) {
          it('imports globals', function (done) {
            Modus.module('modusTest/shimmed', function (shimmed) {
              shimmed.imports('fixtures/shim.js').global('shim');
              shimmed.body(function (shimmed) {
                assert.equal(shimmed.shim, 'shim', 'Got shim');
                done();
              })
            });
          });
        }
      });

    });

  });

  describe('#publish', function () {

    it('creates a simple module using a single value', function (done) {
      Modus.publish('modusTest/published', 'foo');
      Modus.module('modusTest/testPublished', function (testPublished) {
        testPublished.imports('./published');
        testPublished.body(function (testPublished) {
          assert.equal(testPublished.published, 'foo', 'published');
          done();
        });
      });
    });

  });

  describe('#normalizeModuleName', function () {

    it('Strips extensions', function () {
      assert.equal(Modus.normalizeModuleName('Foo/Bar.js'), 'Foo/Bar');
      assert.equal(Modus.normalizeModuleName('Foo/Bar.txt'), 'Foo/Bar');
      assert.equal(Modus.normalizeModuleName('Foo/Bar.min.txt'), 'Foo/Bar');
    });

  });

  describe('#map / #getMappedPath', function () {

    it('maps a module to a path', function () {
      Modus.map('fixtures/map/mapped', 'foo/mapped');
      assert.equal(Modus.getMappedPath('foo/mapped'), Modus.config('root') + 'fixtures/map/mapped.js', 'Path was found');
    });

    it('maps several modules to a path', function () {
      Modus.map('fixtures/map/mapped.js', [
        'foo/mapped/one',
        'foo/mapped/two'
      ]);
      assert.equal(Modus.getMappedPath('foo/mapped/one'), Modus.config('root') + 'fixtures/map/mapped.js', 'Path was found');
      assert.equal(Modus.getMappedPath('foo/mapped/two'), Modus.config('root') + 'fixtures/map/mapped.js', 'Path was found');
    });

    it('maps patterns to a path', function () {
      Modus.map('fixtures/fake/module.js', [
        'foo/fake',
        'foo/fake/*',
        'foo/**/many',
        'foo/*/one'
      ]);
      assert.equal(Modus.getMappedPath('foo/fake'), Modus.config('root') +'fixtures/fake/module.js', 'Path was found');
      assert.equal(Modus.getMappedPath('foo/fake/Bar'), Modus.config('root') +'fixtures/fake/module.js', 'Path was found');
      assert.equal(Modus.getMappedPath('foo/fake/Baz'), Modus.config('root') +'fixtures/fake/module.js', 'Path was found');
      assert.equal(Modus.getMappedPath('foo/fake/Foo'), Modus.config('root') +'fixtures/fake/module.js', 'Path was found automatically');
      assert.equal(Modus.getMappedPath('foo/things/many'), Modus.config('root') +'fixtures/fake/module.js', '** matches many segments');
      assert.equal(Modus.getMappedPath('foo/things/etc/many'), Modus.config('root') +'fixtures/fake/module.js', '** matches many segments');
      assert.notEqual(Modus.getMappedPath('foo/things/etc/fud'), Modus.config('root') +'fixtures/fake/module.js', '** does not match when last segment is incorrect');
      assert.equal(Modus.getMappedPath('foo/things/one'), Modus.config('root') +'fixtures/fake/module.js', '* matches one segment');
      assert.notEqual(Modus.getMappedPath('foo/things/etc/one'), Modus.config('root') +'fixtures/fake/module.js', '* does not match many segments');
    });

    it('replaces wildcards in urls', function () {
      Modus.map('fixtures/fake/*.js', 'fid/*');
      assert.equal(Modus.getMappedPath('fid/bin'), Modus.config('root') +'fixtures/fake/bin.js', 'Mapped');
      assert.notEqual(Modus.getMappedPath('fid/bin/bar'), Modus.config('root') +'fixtures/fake/bin/bar.js', '* matches only one');
      Modus.map('fixtures/fake/many/**/*', 'fid/**/*');
      assert.equal(Modus.getMappedPath('fid/bin/bar'), Modus.config('root') + 'fixtures/fake/many/bin/bar.js', '** matches many');
      assert.equal(Modus.getMappedPath('fid/bin/baz/bar'), Modus.config('root') + 'fixtures/fake/many/bin/baz/bar.js', '** matches many');
    });

  });

});