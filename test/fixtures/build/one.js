module(function () {
  this.from('.two').imports('bar', 'baz');
  this.from('.globalBuildEvent').imports('textloader');
  this.foo = 'foo';
  this.textloader('./txt/file2');
});