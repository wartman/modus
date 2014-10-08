modus.module(function () {
  // Should be able to use namespace shortcuts, even if annon.
  // This will be super handy.
  this.from('.one').imports('one');
  this.from('.two').imports('two');
  this.hasDeps = 'hasDeps';
});