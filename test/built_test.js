if (modus.isServer()) var expect = require('chai').expect;

describe('modus.Build', function () {

  var builtModus;

  before(function (done) {
    var loader = modus.Loader.getInstance();
    loader.load('tmp/compiled.js', function () {
      builtModus = modus.noConflict();
      done();
    }, function () {
      throw Error('Was not compiled. Run `gulp mocha` first.')
    });
  });
  
  describe('#start', function () {

    it('project was compiled correctly', function (done) {
      main = builtModus.getModule('fixtures.build.main');
      main.once('done', function () {
        expect(main.getNamespace().foo).to.equal('foo');
        expect(main.getNamespace().anon).to.equal('anon');
        expect(main.getNamespace().fileload).to.equal('file loaded');
        expect(main.getNamespace()._).to.be.a('function');
        done();
      });
      main.enable();
    });

  });

});