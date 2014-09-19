modus.addBuildEvent(function (modules, output, build) {
  modus.getModule(modus.config('main')).addModuleDependency('test.fixtures.buildTwo');
  build.output('test.fixtures.buildTwo', "module('test.fixtures.buildTwo', function () { this.foo = 'buildTwo'; })");
});