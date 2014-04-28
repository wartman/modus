var Loader = Modus.Loader = function (handler) {
  this.wait = new Wait();
  this.is = new Is();
  this._handler = null;
  if (handler) this.handler(handler);
};

Loader.prototype.handler = function (handler) {
  this._handler = function () {
    handler.apply(this, arguments);
  };
};

Loader.prototype.run = function (request, next) {
  var src = this._getMappedPath(request);
  this._handler(src, next);
};

Loader.prototype._getMappedPath = function (module) {
  var mappedPath = false;
  each(Modus.config('map', []), function (maps, path) {
    each(maps, function (map) {
      if (map.test(module)){
        mappedPath = path;
        var matches = map.exec(module);

        // NOTE: The following doesn't take ordering into account.
        // Could pose an issue for paths like: 'foo/*/**.js'
        // Think more on this. Could be fine as is! Not sure what the use cases are like.
        if (matches.length > 2) {
          mappedPath = mappedPath
            .replace('**', matches[1].replace(/\./g, '/'))
            .replace('*', matches[2]);
        } else if (matches.length === 2) {
          mappedPath = mappedPath
            .replace('*', matches[1]);
        }
      }
    });
  });
  return mappedPath;
};