modus('fixtures.increment.incrementTwo', function (imports, exports) {
  imports('fixtures.increment.incrementer');
  exports(function () {
    return window.increment;
  });
});