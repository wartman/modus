require('../lib/build');
var expect = require('chai').expect;

describe('modus.Build', function () {
  
  var compiled = "";

  before(function (done) {
    modus.config('root', 'test/');
    var build = modus.Build.getInstance();
    build.start({
      root: process.cwd() + '/',
      main: 'fixtures.build.main',
      dest: 'tmp/compiled.js'
    }).once('done', function (data) {
      compiled = data;
      done(); 
    });
  });
  
  describe('#start', function () {

    it('compiles a project', function (done) {
      var build = modus.Build.getInstance();
      var factory = Function(compiled);
      var testRoot = {};
      factory.apply(testRoot);
      var main = testRoot.modus.getModule('fixtures.build.main');
      main.once('done', function () {
        expect(main.getEnv().foo).to.equal('foo');
        expect(main.getEnv().fileload).to.equal('file loaded');
        done();
      });
      main.enable();
    });

  });

  describe('#writeOutput', function () {

    it('writes to a destination', function (done) {
      var build = modus.Build.getInstance();
      build.writeOutput();
      build.once('output.done', function () {
        build.fs.readFile(process.cwd() + '/test/tmp/compiled.js', 'utf-8', function (err, data) {
          if (err) throw err;
          var factory = Function('modus', data);
          var testRoot = {};
          factory.apply(testRoot);
          var main = testRoot.modus.getModule('fixtures.build.main');
          main.once('done', function () {
            expect(main.getEnv().foo).to.equal('foo');
            expect(main.getEnv().fileload).to.equal('file loaded');
            done();
          });
          main.enable();
        });
      });
    });

  });

});