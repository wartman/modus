
// --------------------
// Modus.Namespace

var Namespace = Modus.Namespace = function (options) {
  this.options = defaults(this.options, options);
  this.wait = new Wait();
  this.is = new Is();
  this._modules = [];
  this._imports = [];
};

Namespace.prototype.options = {
  namespaceName: 'root'
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
  this._modules.push(module);
  createObjectByName('Modus.env.' + this.getName() + '.' + name, module);
  if (factory) { 
    factory(module);
    module.run();
  }
  return module;
};

Namespace.prototype.imports = function (deps) {
  this.is.pending(true);
  var item = new Modus.Import(deps, this);
  this._imports.push(item);
  return item;
};

Namespace.prototype.run = function () {
  if (this.is.pending()) {
    this._loadImports();
  } else if (this.is.loaded()) {
    this._checkDependencies();
  } else if (this.is.ready()) {
    this._enableModules();
  } else if (this.is.enabled()) {
    this.wait.resolve();
  } else if (this.is.failed()) {
    this.wait.reject();
  }
};

Namespace.prototype.disable = function (reason) {
  this.is.failed(true);
  this.wait.reject(reason);
}

Namespace.prototype.getName = function () {
  return this.options.namespaceName;
};

Namespace.prototype.getFullName = function () {
  return this.options.namespaceName;
};

Namespace.prototype.compile = function () {
  // do compile code.
};

Namespace.prototype._loadImports = function () {
  Modus.Module.prototype._loadImports.apply(this);
};

Namespace.prototype._checkDependencies = function () {
  Modus.Module.prototype._checkDependencies.apply(this)
};

Namespace.prototype._enableModules = function () {
  var remaining = this._modules.length;
  var self = this;
  if (!remaining) return;
  this.is.working(true);
  each(this._modules, function (module) {
    module.run();
    module.wait.done(function () {
      remaining -= 1;
      if (remaining <= 0) {
        self.is.enabled(true);
        self.run();
      }
    }, function () {
      self.disable('A module failed');
    })
  });
};