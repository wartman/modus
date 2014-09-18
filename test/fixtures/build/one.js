module(function () {
  this.imports('bar', 'baz').from('.two');
  this.imports('textloader').from('.globalBuildEvent');
  this.foo = 'foo';
  this.textloader('./txt/file2');
});