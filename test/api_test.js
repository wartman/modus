if (modus.isServer()) var expect = require('chai').expect;

describe('modus', function () {
  
  describe('#config', function () {

    it('sets config items', function () {
      modus.config('foo', 'bar')
      expect(modus.config('foo')).to.equal('bar');
    });

    it('returns false if not defined', function () {
      expect(modus.config('foopaksd')).to.be.false;
    });

  });

  describe('#map', function () {

    it('maps a module', function () {
      modus.map('foo.bin', 'foo/bar/bin/zip.js');
      var maps = modus.config('maps');
      expect(maps['foo.bin']).to.equal('foo/bar/bin/zip.js');
    });

  });

  describe('#mapNamespace', function () {

    it('maps a namespace', function () {
      modus.mapNamespace('foo.bin', 'foo/bar/bin/zip.js');
      var maps = modus.config('namespaceMaps');
      expect(maps['foo.bin']).to.equal('foo/bar/bin/zip.js');
    });

  });

  describe('#getMappedPath', function () {

    it('gets a mapped module', function () {
      modus.map('mapped.module', 'thing/thing/path/file.js');
      var path = modus.getMappedPath('mapped.module');
      expect(path).to.equal('thing/thing/path/file.js');
    });

    it('gets a mapped namespace', function () {
      modus.mapNamespace('foo.bar', 'binable/things');
      var path = modus.getMappedPath('foo.bar.bix');
      expect(path).to.equal('binable/things/bix.js');
    });

  });

  describe('#normalizeModuleName', function () {

    it('returns a module name', function () {
      var path = modus.normalizeModuleName('foo/bar/bin.js');
      var mod = modus.normalizeModuleName('is.already.a.module.name');
      expect(path).to.equal('foo.bar.bin');
      expect(mod).to.equal('is.already.a.module.name');
    });

  });

  describe('#moduleExists', function () {

  });

  describe('#getModule', function () {

  });

  describe('#namespace', function () {

    it('defines modules using provided namespace', function (done) {
      modus.namespace('tests.namespace', function () {
        this.module('foo', function () {
          this.foo = 'foo';
        });
        this.module('bar', function () {
          this.bar = 'bar';
        });
      });
      modus.module('tests.namespace.import', function () {
        this.imports(['foo']).from('.foo');
        this.imports(['bar']).from('.bar');
        expect(modus.moduleExists('tests.namespace.foo')).to.be.true;
        expect(modus.moduleExists('tests.namespace.bar')).to.be.true;
        expect(this.foo).to.equal('foo');
        expect(this.bar).to.equal('bar');
        done();
      })
    });

  });

  describe('#module', function () {

    it('creates a new module', function () {
      var mod = modus.module('tests.create', function () {});
      expect(mod).to.be.an.instanceOf(modus.Module);
    });

    it('imports an external module', function (done) {
      modus.module('tests.real', function () {
        this.imports('importTest').from('fixtures.importTest');
        expect(this.importTest.test).to.equal('importTest');
        done();
      });
    });

    it('imports modules recursivly', function (done) {
      modus.module('tests.stress', function () {
        this.imports(['foo', 'bar', 'bax']).from('fixtures.stress.one');
        expect(this.foo + this.bar + this.bax).to.equal('onetwothree');
        done();
      });
    });

    it('imports a shimmed global', function (done) {
      modus.module('tests.global', function () {
        this.imports(['target']).from('fixtures.global.shim');
        expect(this.target).to.equal('target');
        done();
      });
    });

    it('imports anon modules', function (done) {
      modus.module('tests.anon', function () {
        this.imports('basic').from('fixtures.anon.basic');
        expect(this.basic).to.deep.equal({foo:'foo', bar:'bar'});
        done();
      });
    });

    it('imports anon modules recursivly', function (done) {
      modus.module('tests.anonRecursive', function () {
        this.imports('hasDeps').from('fixtures.anon.hasDeps');
        expect(this.hasDeps).to.deep.equal({one:'one', two:'two', hasDeps: 'hasDeps'});
        done();
      })
    });

    it('imports external, anon AMD modules', function (done) {
      modus.module('tests.importAmd', function () {
        this.imports('basic').from('fixtures.amd.basic');
        expect(this.basic).to.deep.equal({foo:'foo', bar:'bar'});
        done();
      });
    });

    it('imports external, anon AMD modules recursivly', function (done) {
      modus.module('tests.importAmdRecursive', function () {
        this.imports('hasDeps').from('fixtures.amd.hasDeps');
        expect(this.hasDeps).to.deep.equal({one:'one', two:'two', hasDeps: 'hasDeps'});
        done();
      });
    });

  });

  describe('#publish', function () {
    it('publishes a value', function (done) {
      modus.publish('tests.publish', 'published');
      modus.module('tests.publish.import', function () {
        this.imports('publish').from('tests.publish');
        expect(this.publish).to.equal('published');
        done();
      });
    });
  });

  describe('#define', function () {

    it('creates an AMD module', function (done) {
      var mod = modus.define('tests/amd/basic', function () {
        return {foo: 'foo'};
      });
      mod.once('done', function () {
        expect(mod.getEnv().foo).to.equal('foo');
        done();
      });
      mod.enable();
    });

    it('can import other modules', function (done) {
      modus.define('tests/amd/targetOne', function () {
        return {foo: 'foo'};
      });
      modus.define('tests/amd/importing', ['tests/amd/targetOne'], function (targetOne) {
        expect(targetOne.foo).to.equal('foo');
        done();
      });
    });

    it('can be imported by normal modules', function (done) {
      modus.define('tests/amd/targetTwo', function () {
        return {
          foo: 'foo',
          bar: 'bar'
        };
      });
      modus.module('tests.amd.import', function () {
        this.imports(['foo', 'bar']).from('tests/amd/targetTwo');
        expect(this.foo).to.equal('foo');
        expect(this.bar).to.equal('bar');
        done();
      });
    });

  });

});