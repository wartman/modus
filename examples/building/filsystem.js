// This is an example of how you might compile imported
// text files into modus project using events.

// This is a simple file loader that uses jQuery to grab
// text files.
modus.module('examples.building.fs', function (fs) {
  fs.imports('$').from('exampes.shims.shims');

  fs.readFile = function (fileName, next) {
    if (modus.hasModule(fileName)) {
      next(modus.getModule(fileName).getEnv().default);
      return;
    }

    $.ajax({
      url: fileName
    }).done(function (data) {
      modus.module(fileName, function (f) { f.default = data });
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
modus.events.on('build', function (raw) {
  var build = modus.Build.getInstance();
  var fsFinder = /fs\.readFile\(([\s\S]+?)\)/g;
  var files = []
  raw.replace(fsFinder, function (match, file) {
    files.push(file);
  });
  var i;
  if (files.length) {
    for (i=0; i < files.length; i+=1) {
      // `build.fs` is just an alias for Node's `fs` library.
      var contents = build.fs.readFileSync(files[i], 'utf-8');
      var factory = "modus.module('" + files[i] + "', function (f) { f.default = '" + contents.replace(/'/g, "\'") + "' });";
      build.add(files[i], factory);
    }
  }
});