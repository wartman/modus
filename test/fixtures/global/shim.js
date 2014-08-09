modus.module('fixtures.global.shim', function (done) {
  var loader = modus.Loader.getInstance();
  var self = this;
  loader.load('fixtures/global/target.js', function () {
    self.target = window.target;
    done();
  }, done);
});