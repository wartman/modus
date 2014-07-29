if (modus.isServer()) var expect = require('chai').expect;

describe('modus.Module', function () {

  describe('#init', function () {

    it('sets up correctly', function () {
      var opts = {namespace: 'tests'};
      var modTest = new modus.Module('moduleName', function () {}, opts);
      opts.moduleName = 'moduleName';
      expect(modTest.options).to.deep.equal(opts);
    });

    it('registers itself with modus.env', function () {
      var module = new modus.Module('tests.isRegistered');
      expect(module).to.deep.equal(modus.env['tests.isRegistered']);
    });

  });

  describe('#getName / #getFullName', function () {
    it('returns the name', function () {
      var mod = new modus.Module('tests.name.test');
      expect(mod.getName()).to.equal('test');
      expect(mod.getFullName()).to.equal('tests.name.test');
    });
  });

  describe('#enable', function () {

    it('will wait for a "done" event to be emited if a second arg is passed', function (done) {
      modus.module('tests.wait.target', function (target, moduleDone) {
        target.foo = 'didn\'t wait';
        setTimeout(function () {
          target.foo = 'waited';
          moduleDone();
        }, 10);
      });
      modus.module('tests.wait.tester', function (tester) {
        tester.imports('foo').from('.target');
        expect(tester.foo).to.equal('waited');
        done();
      });
    });

  });

  describe('#imports', function () {

    it('imports an item', function (done) {
      // Fake up a module.
      modus.env['fixture.one'] = new modus.Module('fixture.one', function (one) {
        one.foo = 'foo'
      });
      var mod = new modus.Module('tests.importer', function (importer) {
        importer.imports('foo').from('fixture.one');
        expect(importer.foo).to.equal('foo');
        done();
      });
      mod.enable();
    });

    it('imports an external module', function (done) {
      modus.module('tests.real', function (real) {
        real.imports('importTest').from('fixtures.importTest');
        expect(real.importTest.test).to.equal('importTest');
        done();
      });
    });

    it('imports an external module', function (done) {
      modus.module('tests.stress', function (stress) {
        stress.imports('foo', 'bar', 'bax').from('fixtures.stress.one');
        expect(stress.foo + stress.bar + stress.bax).to.equal('onetwothree');
        done();
      });
    });

    it('imports a shimmed global', function (done) {
      modus.module('tests.global', function (glob) {
        glob.imports('target').from('fixtures.global.shim');
        expect(glob.target).to.equal('target');
        done();
      })
    });

  });

});