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
        expect(main.getEnv().foo).to.equal('foo');
        expect(main.getEnv().anon).to.equal('anon');
        expect(main.getEnv().fileload).to.equal('file loaded');
        expect(main.getEnv()._).to.be.a('function');
        done();
      });
      main.enable();
    });

  });

});