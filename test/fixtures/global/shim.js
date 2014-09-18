module('fixtures.global.shim', function (module, done) {
  var loader = modus.Loader.getInstance();
  loader.load('fixtures/global/target.js', function () {
    module.target = window.target;
    done();
  }, done);
});