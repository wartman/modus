if (modus.isServer()) var expect = require('chai').expect;

describe('modus.Build', function () {

  var builtModus;

  before(function (done) {
    var loader = modus.Loader.getInstance();
    loader.load('tmp/compiled.js', function () {
      builtModus = modus.noConflict();
      module.noConflict();
      define.noConflict();
      done();
    }, function () {
      throw Error('Was not compiled. Run `gulp mocha` first.')
    });
  });
  
  describe('#start', function () {

    it('project was compiled correctly', function (done) {
      main = builtModus.getModule('main');
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