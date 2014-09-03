mod(function () {
  // Left blank.
});

modus.addBuildEvent('fixtures.build.moduleBuildEvent', function (mod, raw, build) {
  var moduleName = mod.getModuleName();
  build.removeOutput(moduleName);
  var file = build.readFile('fixtures/build/txt/file', {ext:'txt'});
  build.output(moduleName, "modus.publish('" + moduleName + "', '" + file + "' )");
});