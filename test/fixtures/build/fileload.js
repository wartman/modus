modus.module('fixtures.build.fileload', function (fileload) {
  // Intentionally left blank.
}).on('build', function (moduleName, raw) {
  var build = modus.Build.getInstance();
  build.removeOutput(moduleName);
  var file = build.fs.readFileSync(modus.config('root') + '/fixtures/build/txt/file.txt', 'utf-8');
  build.output(moduleName, "modus.module('" + moduleName + "', function (f) { f.default = '" + file + "' })" );
});