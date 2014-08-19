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
      var factory = Function(compiled);
      var base = {};
      factory.call(base);
      var main = base.modus.getModule('fixtures.build.main');
      main.addModuleEventListener('done', function () {
        expect(main.foo).to.equal('foo');
        expect(main.anon).to.equal('anon');
        expect(main.fileload).to.equal('file loaded');
        expect(main._).to.be.a('function');
        done();
      }, true);
      main.enableModule();
    });

  });

  describe('#writeOutput', function () {

    it('writes to a destination', function (done) {
      var build = modus.Build.getInstance();
      build.writeOutput();
      build.once('output.done', function () {
        build.fs.readFile(process.cwd() + '/test/tmp/compiled.js', 'utf-8', function (err, data) {
          if (err) throw err;
          var factory = Function(data);
          var base = {};
          factory.call(base);
          var main = base.modus.getModule('fixtures.build.main');
          main.addModuleEventListener('done', function () {
            expect(main.foo).to.equal('foo');
            expect(main.fileload).to.equal('file loaded');
            done();
          }, true);
          main.enableModule();
        });
      });
    });

  });

});