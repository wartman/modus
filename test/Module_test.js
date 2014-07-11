if (Modus.isServer()) var expect = require('expect');

describe('Modus.Module', function () {

  describe('#init', function () {

    it('sets up correctly', function () {
      var opts = {namespace: 'tests'};
      var modTest = new Modus.Module('moduleName', function () {}, opts);
      opts.moduleName = 'moduleName';
      expect(modTest.options).to.deep.equal(opts);
    });

    it('registers itself with Modus.env', function () {
      var module = new Modus.Module('tests.isRegistered');
      expect(module).to.deep.equal(Modus.env['tests.isRegistered']);
    });

  });

  describe('#getName / #getFullName', function () {
    it('returns the name', function () {
      var mod = new Modus.Module('tests.name.test');
      expect(mod.getName()).to.equal('test');
      expect(mod.getFullName()).to.equal('tests.name.test');
    });
  });

  describe('#enable', function () {

    it('will wait for a "done" event to be emited if options.wait is true', function (done) {
      Modus.module('tests.wait.target', function (target) {
        target.foo = 'didn\'t wait';
        setTimeout(function () {
          target.foo = 'waited';
          target.emit('done');
        }, 10);
      }, {
        wait: true
      });
      Modus.module('tests.wait.tester', function (tester) {
        tester.imports('foo').from('.target');
        expect(tester.foo).to.equal('waited');
        done();
      });
    });

  });

  describe('#imports', function () {

    it('imports an item', function (done) {
      // Fake up a module.
      Modus.env['fixture.one'] = new Modus.Module('fixture.one', function (one) {
        one.foo = 'foo'
      });
      var mod = new Modus.Module('tests.importer', function (importer) {
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
        stress.imports('foo', 'bar').from('fixtures.stress.one');
        console.log(stress);
        expect(stress.foo + stress.bar).to.equal('onetwo');
        done();
      });
    });

    it('imports a shimmed global', function (done) {
      Modus.module('tests.global', function (glob) {
        glob.imports('target').from('fixtures.global.shim');
        expect(glob.target).to.equal('target');
        done();
      })
    });

  });

});