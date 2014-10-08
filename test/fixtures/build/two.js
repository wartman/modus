module(function () {
  this.from('.globalBuildEvent').imports('textloader');
  this.textloader('./txt/file3');
  this.bar = 'bar';
  this.baz = 'baz';
});