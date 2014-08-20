mod(function () {
  this.textloader = function (txt) {
    // do nothing! This is just a target to test out
    // the compiler, seeing if my little idea about how
    // text files can be loaded actually works.
  };
});

modus.events.on('build:compileBefore', function (mods, build) {
  var txtCheck = /\.textloader\(['|"]([\s\S]+?)['|"]\)/g;
  for (var modName in mods) {
    mods[modName].replace(txtCheck, function (match, filepath) {
      var fileModName = modus.normalizeModuleName(filepath, modName);
      var file = build.readFile(filepath, {ext: 'txt', context: modName});
      modus.publish(fileModName, file);
      modus.getModule(modName).addModuleDependency(fileModName);
      build.output(fileModName, "modus.publish('" + fileModName + "', '" + file + "');");
    });
  }
});
