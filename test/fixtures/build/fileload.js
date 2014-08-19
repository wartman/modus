modus.module('fixtures.build.fileload', function () {
  // Left blank.
}).addModuleEventListener('build', function (moduleName, raw) {
  var build = modus.Build.getInstance();
  build.removeOutput(moduleName);
  var file = build.readFile('fixtures/build/txt/file.txt');
  build.output(moduleName, "modus.publish('" + moduleName + "', '" + file + "' )" );
});