if (modus.isServer()) var expect = require('chai').expect;

describe('mod', function () {

  beforeEach(function () {
    modus.config('root', '');
  });

  it('is an alias for modus.module', function () {
    expect(mod).to.deep.equal(modus.module);
  })

  describe('#init', function () {

    it('sets up correctly', function () {
      var opts = {namespace: 'tests'};
      var modTest = mod('moduleName', function () {}, opts);
      opts.moduleName = 'moduleName';
      expect(modTest.options).to.deep.equal(opts);
    });

    it('registers itself with modus.env', function () {
      var modTest = mod('tests.isRegistered');
      expect(modTest).to.deep.equal(modus.env['tests.isRegistered']);
    });

  });

  describe('#getName / #getFullName', function () {
    it('returns the name', function () {
      var modTest = mod('tests.name.test');
      expect(modTest.getName()).to.equal('test');
      expect(modTest.getFullName()).to.equal('tests.name.test');
    });
  });

  describe('#enable', function () {

    it('will wait for a "done" event to be emited if an arg is passed', function (done) {
      mod('tests.wait.target', function (moduleDone) {
        var self = this;
        this.foo = 'didn\'t wait';
        setTimeout(function () {
          self.foo = 'waited';
          moduleDone();
        }, 10);
      });
      mod('tests.wait.tester', function () {
        this.imports(['foo']).from('.target');
        expect(this.foo).to.equal('waited');
        done();
      });
    });

  });

  describe('#imports', function () {

    it('imports `default` string is passed', function (done) {
      mod('tests.import.stringTarget', function () {
        this.default = 'String Target';
      });
      mod('tests.import.string', function () {
        this.imports('target').from('.stringTarget');
        expect(this.target).to.equal('String Target');
        done();
      });
    });

    it('imports an entire module if `default` is not set and a string is passed', function (done) {
      mod('tests.import.stringAllTarget', function () {
        this.foo = 'foo';
        this.bar = 'bar';
      });
      mod('tests.import.stringAll', function () {
        this.imports('target').from('.stringAllTarget');
        expect(this.target).to.deep.equal({foo:'foo', bar:'bar'});
        done();
      });
    });

    it('imports components if array is passed', function (done) {
      mod('tests.import.stringArrayTarget', function () {
        this.foo = 'foo';
        this.bar = 'bar';
      });
      mod('tests.import.stringArray', function () {
        this.imports(['foo', 'bar']).from('.stringArrayTarget');
        expect(this.foo).to.equal('foo');
        expect(this.bar).to.equal('bar');
        done();
      });
    });

  });

});