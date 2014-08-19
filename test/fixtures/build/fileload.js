modus.module('fixtures.build.fileload', function () {
  // Left blank.
}).addModuleEventListener('build', function (mod, raw) {
  var build = modus.Build.getInstance();
  var moduleName = mod.getModuleName();
  build.removeOutput(moduleName);
  var file = build.readFile('fixtures/build/txt/file.txt');
  build.output(moduleName, "modus.publish('" + moduleName + "', '" + file + "' )" );
});