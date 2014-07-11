Modus.module('fixtures.global.shim', function (shim) {
  Modus.load('fixtures/global/target.js', function () {
    shim.target = window.target;
    shim.emit('done');
  }, function () {
    shim.emit('done');
  });
}, {
  wait: true
});