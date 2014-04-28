var Namespace = Modus.Namespace = function (options) {
  this.options = defaults(this.options, options);
  this.wait = new Wait();
  this.is = new Is();
  this._modules = {};
};

Namespace.prototype.module = function (name, factory) {
  var module = new Modus.Module({
    namespace: this.getName(),
    moduleName: name
  });
  if (reservedName(name)) {
    throw new Error ('Cannot create a module with a reserved name: ' + name);
    return;
  }
  this._modules[name] = module;
  if (factory) factory(module);
  return module;
};

Namespace.prototype.run = function () {
  if (this.is.pending()) {
    this._enableModules();
  } else if (this.is.enabled()) {
    this.wait.resolve();
  } else if (this.is.failed()) {
    this.wait.reject();
  }
};

Namespace.prototype.compile = function () {
  // do compile code.
};

Namespace.prototype._enableModules = function () {
  var remaining = this._modules.length;
  var self = this;
  this.isWorking(true);
  each(this._modules, function (module) {
    module.run();
    module.wait.done(function () {
      remaining -= 1;
      if (remaining <= 0) {
        self.is.enabled(true);
        self.run();
      }
    }, function () {
      self.is.failed(true);
      self.run();
    })
  });
};