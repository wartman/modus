// Import does what you expect: it handles all imports for Modus namespaces and Modus modules.
var Import = Modus.Import = function (items, module) {
  this._module = module;

  this._components = false;
  this._from = false;
  this._as = false;
  this._uses = false;

  if (isArray(items)) {
    this._components = items;
  } else {
    this._from = items;
  }
};

Import.prototype.from = function (module) {
  this._components = this._from;
  this._from = module;
  return this;
};

Import.prototype.as = function (alias) {
  this._as = alais;
  return this;
};

Import.prototype.uses = function (plugin) {
  this._uses = plugin;
  return this;
}

Import.prototype.load = function (next) {
  this._from = this._ensureNamespace(this._from);
  var fromName = 'Modus.env.' + this._from;
  var self = this;
  if (getObjectByName(fromName)) {
    this._applyDependencies();
    next(false);
    return;
  }
  if (!this._uses) {
    this._uses = 'script';
  }
  // Pass to the modus loader.
  Modus.load(this._uses, this._from, function (err) {
    if (err) {
      next(err);
      return;
    }
    self.load(next);
  }
};

Import.prototype.compile = function () {
  // do compile code.
};

Import._applyDependencies = function () {
  var fromName = 'Modus.env.' + this._from;
  var dep = getObjectByName(fromName);
  var module = this._module;
  if (this._components) {
    each(this._components, function (component) {
      module[component] = dep[component];
    });
  } else if(this._alias) {
    module[this._alias] = dep;
  } else {
    createObjectFromName('Modus.env.' + module.getFullName + this._from, dep);
  }
}