module(function () {
  // Left blank.
});

modus.addBuildEvent('fixtures.build.moduleBuildEvent', function (module, raw, build) {
  var moduleName = module.getModuleName();
  build.removeOutput(moduleName);
  var file = build.readFile('fixtures/build/txt/file', {ext:'txt'});
  build.output(moduleName, "modus.publish('" + moduleName + "', '" + file + "' )");
});