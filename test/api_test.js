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

});