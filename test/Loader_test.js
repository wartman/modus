if (modus.isServer()) var expect = require('chai').expect;

describe('modus.Loader', function () {

  describe('#getInstance', function () {

    it('returns an instance', function () {
      var loader = modus.Loader.getInstance();
      expect(loader).to.be.an.instanceof(modus.Loader);
    });

    it('is a singleton', function () {
      var loader = modus.Loader.getInstance();
      loader.foo = 'bar';
      var loaderTwo = modus.Loader.getInstance();
      expect(loader).to.deep.equal(loaderTwo);
    });

  });

  describe('#load', function () {

  });

});