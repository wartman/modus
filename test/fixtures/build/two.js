module(function () {
  this.imports('textloader').from('.globalBuildEvent');
  this.textloader('./txt/file3');
  this.bar = 'bar';
  this.baz = 'baz';
});