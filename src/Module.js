
// --------------------
// Modus.Module

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

Module.prototype.getName = function () {
  return this.options.moduleName;
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
  this.wait.reject(function () {
    throw new Error(reason)
  });
};

Module.prototype.compile = function () {
  // Run compile code here.
};

Module.prototype._loadImports = function () {
  var queue = []
  var remaining = 0;
  var self = this;
  this.is.working(true);
  each(this._imports, function (item) {
    if (!self.is.loaded()) queue.push(item);
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
  if (this.is.ready() || this.is.enabled()) return;
  this.is.working(true);
  each(this._imports, function (item) {
    if (!self.is.working()) return;
    var module = item.getModule();
    if (Modus.shims.hasOwnProperty(item.from())) {
      if (!getObjectByName(item.from())) {
        self.disable('A shimmed import [' + item.from() + '] failed for: ' + self.getFullName() );
      }
    } else if (!module || module.is.failed()) {
      self.disable('An import [' + item.from() + '] failed for: ' + self.getFullName() );
    } else if (!module.is.ready() && !module.is.enabled()) {
      self.is.loaded(true);
      module.run().wait.done(function () { self.run(); });
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
