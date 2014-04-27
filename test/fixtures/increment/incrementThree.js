modus('fixtures.increment.incrementThree', function (imports, exports) {
  imports('fixtures.increment.incrementer');
  exports(function () {
    return window.increment;
  });
});