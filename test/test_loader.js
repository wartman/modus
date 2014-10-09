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
    
    var loader = modus.Loader.getInstance();

    it('loads any script', function (done) {
      // Shouldn't need to worry about root.
      loader.load('fixtures/loader/target.js').then(function () {
        expect(window.loaderTarget).to.equal('loaderTarget');
        done();
      });
    });

    //todo: Test visits, make sure files are loaded only once.

  });

});