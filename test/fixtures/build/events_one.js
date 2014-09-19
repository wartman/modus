modus.addBuildEvent(function (modules, output, build) {
  modus.getModule(modus.config('main')).addModuleDependency('test.fixtures.buildOne');
  build.output('test.fixtures.buildOne', "module('test.fixtures.buildOne', function () { this.foo = 'buildOne'; })");
});