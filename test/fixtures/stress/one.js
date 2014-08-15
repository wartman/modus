mod('fixtures.stress.one', function () {
  this.imports('bar').from('.two');
  this.imports('bax').from('.three');
  this.foo = 'one';
});