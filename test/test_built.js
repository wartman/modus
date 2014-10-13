if (modus.isServer()) var expect = require('chai').expect;

describe('modus.Build', function () {

  before(function (done) {
    var loader = modus.Loader.getInstance();
    loader.load('tmp/compiled.js', function () {
      done();
    }, function () {
      throw Error('Was not compiled. Run `gulp mocha` first.')
    });
  });
  
  describe('#start', function () {

    it('project was compiled correctly', function (done) {
      // Will register with the original modus context, not the new one.
      main = modus.getModule('fixtures.build.main');
      main.enableModule().then(function () {
        expect(main.foo).to.equal('foo');
        expect(main.anon).to.equal('anon');
        expect(main.fileload).to.equal('file loaded');
        expect(main._).to.be.a('function');
        done();
      }, true);
    });

  });

});