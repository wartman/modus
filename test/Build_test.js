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
    }, function (data) {
      compiled = data;
      done(); 
    });
  });
  
  describe('#start', function () {

    it('compiles a project', function (done) {
      var factory = Function(compiled);
      var base = {};
      factory.call(base);
      var main = base.modus.getModule(base.modus.config('main'));
      main.enableModule().then(function () {
        expect(main.foo).to.equal('foo');
        expect(main.anon).to.equal('anon');
        expect(main.fileload).to.equal('file loaded');
        expect(main._).to.be.a('function');

        // Check the file-loader
        var files = base.modus.getModule('fixtures.build.txt.file2');
        expect(files['default']).to.equal('File two.');
        files = base.modus.getModule('fixtures.build.txt.file3');
        expect(files['default']).to.equal('File three.');

        // Check to see if external build events were loaded and run.
        var buildOne = base.modus.getModule('test.fixtures.buildOne');
        expect(buildOne.foo).to.equal('buildOne');
        var buildTwo = base.modus.getModule('test.fixtures.buildTwo');
        expect(buildTwo.foo).to.equal('buildTwo');

        done();
      });
    });

  });

  describe('#writeOutput', function () {

    it('writes to a destination', function (done) {
      var build = modus.Build.getInstance();
      build.writeOutput(function () {
        build.fs.readFile(process.cwd() + '/test/tmp/compiled.js', 'utf-8', function (err, data) {
          if (err) throw err;
          var factory = Function(data);
          var base = {};
          factory.call(base);
          var main = base.modus.getModule(base.modus.config('main'));
          main.enableModule().then(function () {
            expect(main.foo).to.equal('foo');
            expect(main.fileload).to.equal('file loaded');

            done();
          });
        });
      });
    });

  });

});