if (modus.isServer()) var expect = require('chai').expect;

describe('modus.Module', function () {

  beforeEach(function () {
    modus.config('root', '');
  });

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
      modus.module('tests.wait.target', function (moduleDone) {
        var self = this;
        this.foo = 'didn\'t wait';
        setTimeout(function () {
          self.foo = 'waited';
          moduleDone();
        }, 10);
      });
      modus.module('tests.wait.tester', function () {
        this.imports(['foo']).from('.target');
        expect(this.foo).to.equal('waited');
        done();
      });
    });

  });

  describe('#imports', function () {

    it('imports `default` string is passed', function (done) {
      var mod = new modus.Module('tests.import.stringTarget', function () {
        this.default = 'String Target';
      });
      var mod = new modus.Module('tests.import.string', function () {
        this.imports('target').from('.stringTarget');
        expect(this.target).to.equal('String Target');
        done();
      });
      mod.enable();
    });

    it('imports an entire module if `default` is not set and a string is passed', function (done) {
      var mod = new modus.Module('tests.import.stringAllTarget', function () {
        this.foo = 'foo';
        this.bar = 'bar';
      });
      var mod = new modus.Module('tests.import.stringAll', function () {
        this.imports('target').from('.stringAllTarget');
        expect(this.target).to.deep.equal({foo:'foo', bar:'bar'});
        done();
      });
      mod.enable();
    });

    it('imports components if array is passed', function (done) {
      var mod = new modus.Module('tests.import.stringArrayTarget', function () {
        this.foo = 'foo';
        this.bar = 'bar';
      });
      var mod = new modus.Module('tests.import.stringArray', function () {
        this.imports(['foo', 'bar']).from('.stringArrayTarget');
        expect(this.foo).to.equal('foo');
        expect(this.bar).to.equal('bar');
        done();
      });
      mod.enable();
    });

  });

});