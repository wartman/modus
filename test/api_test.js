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
      modus.mapNamespace('bax', 'bax.path');
      modus.mapNamespace('lib', 'some/lib/path');
      var mapped = modus.getMappedPath;
      expect(mapped('foo.bar.bix')).to.equal('binable/things/bix.js');
      expect(mapped('bax.foo')).to.equal('bax/path/foo.js');
      expect(mapped('lib.thing.etc')).to.equal('some/lib/path/thing/etc.js');
    });

  });

  describe('#normalizeModuleName', function () {

    it('returns a module name', function () {
      var path = modus.normalizeModuleName('foo/bar/bin.js');
      var mod = modus.normalizeModuleName('is.already.a.module.name');
      expect(path).to.equal('foo.bar.bin');
      expect(mod).to.equal('is.already.a.module.name');
    });

    it('appends context if starts with a dot', function () {
      var rootLevel = modus.normalizeModuleName('.foo', '');
      expect(rootLevel).to.equal('foo');
      var inContext = modus.normalizeModuleName('.foo', 'foo.bin.bar');
      expect(inContext).to.equal('foo.bin.foo');
      var noAppend = modus.normalizeModuleName('foo.bar', 'foo.bin.bar');
      expect(noAppend).to.equal('foo.bar');
    });

    it('goes up levels depending on number of dots', function () {
      var norm = modus.normalizeModuleName;
      expect(norm('foo.bar', 'root.namespace.mod')).to.equal('foo.bar');
      expect(norm('.foo.bar', 'root.namespace.mod')).to.equal('root.namespace.foo.bar');
      expect(norm('..foo.bar', 'root.namespace.mod')).to.equal('root.foo.bar');
      expect(norm('...foo.bar', 'root.namespace.mod')).to.equal('foo.bar');
    });

    it('parses URIs correctly', function () {
      var norm = modus.normalizeModuleName;
      expect(norm('foo/bar', 'root.namespace.mod')).to.equal('foo.bar');
      expect(norm('./foo/bar', 'root.namespace.mod')).to.equal('root.namespace.foo.bar');
      expect(norm('../foo/bar', 'root.namespace.mod')).to.equal('root.foo.bar');
      expect(norm('../../foo/bar', 'root.namespace.mod')).to.equal('foo.bar');
    });

  });

  describe('#moduleExists', function () {

  });

  describe('#getModule', function () {

  });

  describe('#module', function () {

    it('creates a new module', function () {
      var curMod = modus.module('tests.create', function () {});
      expect(curMod).to.deep.equal(modus.getModule('tests.create'))
    });

    it('publishes things that are not functions', function (done) {
      modus.module('tests.notFunction.obj', {foo: 'foo'});
      modus.module('tests.notFunction.array', ['foo']);
      modus.module('tests.notFunction.tester', function () {
        this.imports('.obj').as('obj');
        this.imports('.array').as('array');
        expect(this.obj.foo).to.equal('foo');
        expect(this.array[0]).to.equal('foo');
        done();
      })
    });

    it('imports modules', function (done) {
      modus.module('tests.real', function () {
        this.imports(['foo']).from('fixtures.basic.named');
        this.imports(['bar']).from('fixtures.basic.anon');
        expect(this.foo).to.equal('foo');
        expect(this.bar).to.equal('bar');
        done();
      });
    });

    it('imports published modules', function (done) {
      modus.module('tests.realPub', function () {
        this.imports('fixtures.publish.named').as('named');
        this.imports('fixtures.publish.anon').as('anon');
        expect(this.named).to.equal('named');
        expect(this.anon[0]).to.equal('anon');
        done();
      });
    });

    it('imports modules recursively', function (done) {
      modus.module('tests.stress', function () {
        this.imports('foo', 'bar', 'bax').from('fixtures.stress.one');
        expect(this.foo + this.bar + this.bax).to.equal('onetwothree');
        done();
      });
    });

    it('imports a shimmed global', function (done) {
      modus.module('tests.global', function () {
        this.imports('target').from('fixtures.global.shim');
        expect(this.target).to.equal('target');
        done();
      });
    });

    it('imports anon modules', function (done) {
      modus.module('tests.anon', function () {
        this.imports('fixtures.anon.basic').as('basic');
        expect(this.basic).to.deep.equal({foo:'foo', bar:'bar'});
        done();
      });
    });

    it('imports anon modules recursively', function (done) {
      modus.module('tests.anonRecursive', function () {
        this.imports('fixtures.anon.hasDeps').as('hasDeps');
        expect(this.hasDeps).to.deep.equal({one:'one', two:'two', hasDeps: 'hasDeps'});
        done();
      })
    });

    it('imports external, anon AMD modules', function (done) {
      modus.module('tests.importAmd', function () {
        this.imports('fixtures.amd.basic').as('basic');
        expect(this.basic).to.deep.equal({foo:'foo', bar:'bar'});
        done();
      });
    });

    it('imports external, anon AMD modules recursively', function (done) {
      modus.module('tests.importAmdRecursive', function () {
        this.imports('fixtures.amd.hasDeps').as('hasDeps');
        expect(this.hasDeps).to.deep.equal({one:'one', two:'two', hasDeps: 'hasDeps'});
        done();
      });
    });

    it('imports AMD modules using a \'(require)\' signature', function (done) {
      modus.module('tests.importAmdCommonJs', function () {
        this.imports('three', 'commonJs').from('fixtures.amd.commonJs');
        expect(this.three).to.equal('three');
        expect(this.commonJs).to.equal('commonJs');
        done();
      });
    });

    it('imports AMD modules using a \'(require, exports, module)\' signature ', function (done) {
      modus.module('tests.importAmdCommonJsFull', function () {
        this.imports('fixtures.amd.commonJsFull').as('commonJsFull');
        expect(this.commonJsFull.check).to.equal('commonJsFull');
        expect(this.commonJsFull.four).to.equal('four');
        done();
      });
    });

  });

  describe('#main', function () {

    it('can set config', function (done) {
      modus.main({
        main: 'tests.mainOne',
        mainFoo: 'bar'
      }, function () {
        expect(modus.config('mainFoo')).to.equal('bar');
        done();
      });
    });

    it('registers a module with `modus.config(\'main\')` as the name', function (done) {
      modus.config('main', 'tests.mainTwo');
      modus.main(function () {
        expect(this.getModuleName()).to.equal('tests.mainTwo');
        done();
      });
    });

    after(function () {
      // Reset `main` to the default value.
      modus.config('main', 'main');
    });

  });

  describe('#define', function () {

    it('creates an AMD module', function (done) {
      var mod = modus.define('tests/amd/basic', function () {
        return {foo: 'foo'};
      });
      mod.enableModule().then(function () {
        expect(mod.foo).to.equal('foo');
        done();
      });
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

    it('can handle things other then functions', function (done) {
      modus.define('tests/amd/nonFunction/obj', {testsObj:'foo'});
      modus.module('tests.amd.nonFunction.loader', function () {
        this.imports('testsObj').from('.obj');
        expect(this.testsObj).to.equal('foo');
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
        this.imports('foo', 'bar').from('tests/amd/targetTwo');
        expect(this.foo).to.equal('foo');
        expect(this.bar).to.equal('bar');
        done();
      });
    });

  });

});