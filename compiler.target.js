Modus.module('app.fs', function (fs) {
  fs.imports('$').from('.shims');

  fs.readFile = function (fileName, next) {
    if (Modus.hasModule(fileName)) {
      next(Modus.env[fileName]);
      return;
    }
    $.ajax({
      url: fileName
    }).done(function (data) {
      next(data);
    });
  }
});

Modus.events.on('build', function (raw, builder) {
  var _fsFinder = /fs\.readFile\(([\s\S]+?)\)/g;
  var files = []
  raw.replace(compiler, function (match, file) {
    files.push(file);
  });
  var i;
  var fileSys = builder.require('fs');
  if (files.length) {
    for (i=0; i < files.length; i+=1) {
      var contents = fileSys.loadFileSync(files[i], 'utf-8');
      var factory = "Modus.module('" + files[i] + "', function (f) { f = '" + contents + "' });";
      builder._raw[files[i]] = factory;
    }
  }
});