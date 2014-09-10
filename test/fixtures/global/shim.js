mod('fixtures.global.shim', function (mod, done) {
  var loader = modus.Loader.getInstance();
  loader.load('fixtures/global/target.js', function () {
    mod.target = window.target;
    done();
  }, done);
});