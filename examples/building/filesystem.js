// This is an example of how you might compile imported
// text files into modus project using events.

// This is a simple file loader that uses jQuery to grab
// text files.
modus.module('examples.building.fs', function () {
  this.imports(['$']).from('exampes.shims.shims');

  this.readFile = function (fileName, next) {
    if (modus.hasModule(fileName)) {
      next(modus.getModule(fileName).getEnv().default);
      return;
    }

    $.ajax({
      url: fileName
    }).done(function (data) {
      modus.publish(fileName, data);
      var mod = modus.getModule(fileName);
      mod.enable();
      mod.once('done', function () {
        next(mod.getEnv().default);
      })
    });

  };

});

// By binding a function to the 'build' event, we can
// bundle imported files into our compiled project.
modus.events.on('build', function (moduleName, raw) {
  var build = modus.Build.getInstance();
  var fsFinder = /fs\.readFile\(([\s\S]+?)\)/g;
  var files = []
  raw.replace(fsFinder, function (match, file) {
    files.push(file);
  });
  var i;
  if (files.length) {
    for (i=0; i < files.length; i+=1) {
      var contents = build.readFile(files[i]);
      var factory = "modus.publish('" + files[i] + "', '" + contents.replace(/'/g, "\'") + "');";
      build.output(files[i], factory);
    }
  }
});