if (Modus.isServer()) {

  // Make Modus GLOBAL so it can run in each context.
  // This basically makes Modus a wrapper for 'require'.
  // This isn't a best practice, but Modus modules have to
  // run in both browser and node contexts, so using 
  // 'module.exports' is out.
  GLOBAL.Modus = Modus;

  Modus.plugins.script = new Modus.Loader(function (module, cb) {
    var src = Modus.config('root') + this._getMappedPath(file) + '.' + js );
    try {
      require(src);
      cb();
    } catch(e) {
      cb(e);
    }
  });

  Modus.plugins.file = new Modus.Loader(function (file, cb) {
    var src = Modus.config('root') + this._getMappedPath(file) + '.' + this.options.type );
    var fs = require('fs');
    fs.readFile(src, function (err, data) {
      if (err) return cb(err);
      Modus.module(file, function (file) {
        file.exports('contents', function (contents) {
          contents = data;
        });
        file.wait.done(cb);
      });
    })
  });

}