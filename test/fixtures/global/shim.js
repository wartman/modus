Modus.module('fixtures.global.shim', function (shim, done) {
  Modus.load('fixtures/global/target.js', function () {
    shim.target = window.target;
    done();
  }, done);
});