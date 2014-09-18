if (modus.isServer()) var expect = require('chai').expect;

describe('module', function () {

  beforeEach(function () {
    modus.config('root', '');
  });

  it('is an alias for modus.module', function () {
    expect(module).to.deep.equal(modus.module);
  })

  describe('#init', function () {

    it('registers itself with modus', function () {
      var modTest = module('tests.isRegistered');
      expect(modTest).to.deep.equal(modus.getModule('tests.isRegistered'));
    });

  });

  describe('#enable', function () {

    it('will be async if an argument is passed', function (done) {
      module('tests.wait.target', function (module, moduleDone) {
        var self = this;
        this.foo = 'didn\'t wait';
        setTimeout(function () {
          self.foo = 'waited';
          moduleDone();
        }, 10);
      });
      module('tests.wait.tester', function () {
        this.imports(['foo']).from('.target');
        expect(this.foo).to.equal('waited');
        done();
      });
    });

  });

});