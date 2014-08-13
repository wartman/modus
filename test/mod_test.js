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

    it('registers itself with modus', function () {
      var modTest = mod('tests.isRegistered');
      expect(modTest).to.deep.equal(modus.getModule('tests.isRegistered'));
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

});