mod(function () {
  this.imports('./foobin').as('bax');

  this.exports('bax', this.bax);
  this.exports('bar');
});