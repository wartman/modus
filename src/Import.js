
// --------------------
// Modus.Import
//
// Import does what you expect: it handles all imports for 
// Modus namespaces and Modus modules.

var Import = Modus.Import = function (items, module) {
  this.is = new Is();
  this._module = module;
  this._components = false;
  this._from = items;
  this._as = false;
  this._uses = false;
  this._inNamespace = false;
};

Import.prototype.from = function (module) {
  if (!module) return this._from;
  this._components = this._from;
  this._from = module;
  return this;
};

Import.prototype.as = function (alias) {
  if (!alias) return this._as;
  this._as = alias;
  return this;
};

Import.prototype.uses = function (plugin) {
  if (!plugin) return this._uses;
  this._uses = plugin;
  return this;
};

Import.prototype.load = function (next) {
  if (this.is.failed() || this.is.loaded()) return;
  this._from = this._ensureNamespace(this._from);
  var fromName = 'Modus.env.' + this._from;
  var self = this;
  if (this.is.loaded() || getObjectByName(fromName)) {
    this._applyDependencies();
    next();
    return;
  }
  if (!this._uses) this._uses = 'script';
  // Pass to the modus loader.
  Modus.load(this._uses, this._from, function (err) {
    if (err) {
      self.is.failed(true);
      next(err);
      return;
    }
    self.is.loaded(true);
    self._applyDependencies();
    next();
  });
};

Import.prototype.getModule = function () {
  return getObjectByName('Modus.env.' + this._from);
};

Import.prototype.compile = function () {
  // do compile code.
};

Import.prototype._ensureNamespace = function (from) {
  if (from instanceof Array) {
    throw new TypeError('Module must be a string if "from" is not called: ' + typeof from);
  }
  if (!from) from = '';
  if (from.indexOf('.') === 0 && this._module) {
    this._inNamespace = from;
    return this._module.options.namespace + from;
  }
  return from;
};

Import.prototype._applyDependencies = function () {
  var fromName = 'Modus.env.' + this._from;
  var dep = getObjectByName(fromName);
  var module = this._module;
  if (Modus.shims.hasOwnProperty(this._from)) {
    dep = getObjectByName(this._from);
  }
  if (this._components instanceof Array) {
    each(this._components, function (component) {
      module[component] = dep[component];
    });
  } else if (this._components) {
    module[this._components] = dep[this._components];
  } else if (this._as) {
    module[this._as] = dep;
  } else {
    if (this._inNamespace) {
      createObjectByName('Modus.env.' + module.getFullName() + this._inNamespace, dep);
      return;
    }
    createObjectByName('Modus.env.' + module.getFullName() + '.' + this._from, dep);
  }
}