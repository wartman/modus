modus('fixtures.increment.incrementOne', function (imports, exports) {
  imports('fixtures.increment.incrementer');
  exports(function () {
    return window.increment;
  });
});