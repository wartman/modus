(function () {

  var fail = function (reason) {
    start();
    ok(false, reason);
  };

  module('Modus.load test', {
    setup: function () {
      Modus.config({
        root: 'client/'
      });
    }
  });

  test('Load file by object name', function (test) {
    stop();
    Modus.load('fixtures.loadTargetOne', function () {
      start();
      test.equal(window.loadedOne, 'loaded');
    }, fail);
  });

  test('Load file by path name', function (test) {
    stop();
    Modus.load('fixtures/loadTargetTwo.js', function () {
      start();
      test.equal(window.loadedTwo, 'loaded');
    }, fail);
  });

  test('Load file only once, attach other loads to onLoad event', function (test) {
    window.loadIndex = 0;
    stop();
    Modus.load('fixtures.loadTargetThree', function () {
      start();
      test.equal(window.loadIndex, 1, 'Loaded once');
    }, fail);
    stop();
    Modus.load('fixtures.loadTargetThree', function () {
      start();
      test.equal(window.loadIndex, 1, 'Loaded once');
    }, fail);
    stop();
    Modus.load('fixtures.loadTargetThree', function () {
      start();
      test.equal(window.loadIndex, 1, 'Loaded once');
    }, fail);
  });

})();