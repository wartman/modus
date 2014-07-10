if (Modus.isServer()) var expect = require('expect');

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
      expect(modTest.options).to.deep.equal(opts);
    });

    it('registers itself with Modus.env', function () {
      var module = new Modus.Module('moduleTest.isRegistered');
      expect(module).to.deep.equal(Modus.env['moduleTest.isRegistered']);
    });

  });

  describe('#getName / #getFullName', function () {
    it('returns the name', function () {
      expect(mod.getName()).to.equal('test');
      expect(mod.getFullName()).to.equal('moduleTest.test');
    });
  });

  describe('#imports', function () {

    it('imports an item', function (done) {
      // Fake up a module.
      Modus.env['fixture.one'] = new Modus.Module('fixture.one', {}, function (one) {
        one.foo = 'foo'
      });
      var mod = new Modus.Module('tests.importer', {}, function (importer) {
        importer.imports('foo').from('fixture.one');
        expect(importer.foo).to.equal('foo');
        done();
      });
      mod.enable();
    });

    it('imports an external module', function (done) {
      Modus.module('tests.real', function (real) {
        real.imports('importTest').from('fixtures.importTest');
        expect(real.importTest.test).to.equal('importTest');
        done();
      });
    });

    it('imports an external module', function (done) {
      Modus.module('tests.stress', function (stress) {
        stress.imports('one', 'two').from('fixtures.stress.one');
        expect(stress.one + stress.two).to.equal('onetwo');
        done();
      });
    });


  });

});