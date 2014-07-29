modus.module('fixtures.global.shim', function (shim, done) {
  var loader = modus.Loader.getInstance();
  loader.load('fixtures/global/target.js', function () {
    shim.target = window.target;
    done();
  }, done);
});