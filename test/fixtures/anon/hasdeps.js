modus.module(function () {
  // Should be able to use namespace shortcuts, even if annon.
  // This will be super handy.
  this.imports('one').from('.one');
  this.imports('two').from('.two');
  this.hasDeps = 'hasDeps';
});