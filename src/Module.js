var Module = Modus.Module = function (options) {
  this.options = defaults(this.options, options);
  this.wait = new Wait();
  this.is = new Is();
  this._imports = [];
  this._exports = [];
};

Module.prototype.options = {
  namespace: 'root',
  moduleName: null
};

Module.prototype.imports = function (deps) {
  var item = new Modus.Import(deps, this);
  this._imports.push(item);
  return item;
};

Module.prototype.exports = function (name, factory) {
  var item = new Modus.Export(name, factory, this);
  this._exports.push(item);
  return item;
};

Module.prototype.getFullName = function () {
  return this.options.namespace + '.' + this.options.moduleName;
};

Module.prototype.run = function () {
  if (this.is.pending()) {
    this._loadImports();
  } else if (this.is.loaded()) {
    this._checkDependencies();
  } else if (this.is.ready()) {
    this._enableExports();
  } else if (this.is.enabled()) {
    this.wait.resolve(this);
  } else if (this.is.failed()) {
    this.wait.reject();
  }
  return this;
};

Module.prototype.disable = function (reason) {
  this.is.failed(true);
  this.wait.reject(reason);
};

Module.prototype.compile = function () {
  // Run compile code here.
};

Module.prototype._loadImports = function () {
  var queue, remaining;
  var self = this;
  this.is.working(true);
  each(this._imports, function (item) {
    if (!item.is.loaded()) queue.push(item);
  });
  remaining = queue.length;
  if (!remaining) {
    this.is.loaded(true);
    this.run();
    return;
  }
  each(queue, function (item) {
    item.load(function (err) {
      if (err) {
        self.disable(err);
        return;
      }
      remaining -= 1;
      if (remaining <= 0) {
        self.is.loaded(true);
        self.run();
      }
    });
  });
};

Module.prototype._checkDependencies = function () {
  var self = this;
  self.is.working(true);
  each(this._imports, function (item) {
    var module = item.getModule();
    if (!this.is.working()) return;
    if (module.is.failed()) {
      this.disable('An import ' + module.getFullName() + ' failed: ' + self.getFullName() );
    } if (!module.is.ready()) {
      self.is.loaded(true);
      module.run();
      module.wait.done(function () { self.run(); });
      return true;
    }
  });
  if (!this.is.working()) return;
  this.is.ready(true);
  this.run();
};

Module.prototype._enableExports = function () {
  var self = this;
  this.is.working(true);
  each(this._exports, function (item) {
    try {
      item.run();
    } catch(e) {
      this.disable(e);
    }
  });
  if (!this.is.working()) return;
  this.is.enabled(true);
  this.run();
};
