module('fixtures.stress.one', function () {
  this.from('.two').imports('bar');
  this.from('.three').imports('bax');
  this.foo = 'one';
});