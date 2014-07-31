require('../lib/build');
var expect = require('chai').expect;

describe('modus.Build', function () {
  
  beforeEach(function () {
    modus.config('root', 'test/');
  });
  
  describe('#start', function () {

    it('compiles a project', function (done) {
      console.log(modus.Build);
      var build = modus.Build.getInstance();
      build.start({
        root: process.cwd() + '/',
        main: 'fixtures.build.main',
        dest: 'tmp/compiled.js'
      }).once('done', function (compiled) {
        console.log(compiled);
        var factory = Function(compiled);
        factory(modus);
        var main = modus.getModule('fixtures.build.main').getEnv();
        expect(main.one).to.equal('one');
        expect(main.fileload).to.equal('file loaded');
        done();
      });
    });

  });

  describe('#writeOutput', function () {

    it('writes to a destination', function (done) {
      var build = modus.Build.getInstance();
      build.start({
        root: process.cwd() + '/',
        main: 'fixtures.build.main',
        dest: 'tmp/compiled.js'
      }).once('done', function (compiled) {
        build.writeOutput();
        build.once('output.done', function () {
          build.fs.readFile(process.cwd() + '/' + 'tmp/compiled.js', 'utf-8', function (err, data) {
            var factory = Function('modus', data);
            factory(modus);
            var main = modus.getModule('fixtures.build.main').getEnv();
            expect(main.one).to.equal('one');
            expect(main.fileload).to.equal('file loaded');
            done();
          });
        });
      });
    });

  });

});