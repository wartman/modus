if (modus.isServer()) var expect = require('chai').expect;

describe('mod', function () {

  beforeEach(function () {
    modus.config('root', '');
  });

  it('is an alias for modus.module', function () {
    expect(mod).to.deep.equal(modus.module);
  })

  describe('#init', function () {

    it('registers itself with modus', function () {
      var modTest = mod('tests.isRegistered');
      expect(modTest).to.deep.equal(modus.getModule('tests.isRegistered'));
    });

  });

  describe('#enable', function () {

    it('will be async if an argument is passed', function (done) {
      mod('tests.wait.target', function (mod, moduleDone) {
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