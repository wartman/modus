// modus.Import
// ------------
// Import does what you expect: it handles all imports for 
// modus namespaces and modus modules.
var Import = function (parent) {
  this._listeners = {};
  this._parent = parent;
  this._components = [];
  this._module = false;
  this._plugin = false;
};

// Import components from a module. If a string is passed,
// the default value of the module will be imported (or, if
// default isn't set, the entire module). If an array is passed,
// all matching properties from the requested module will be imported.
Import.prototype.imports = function(components) {
  this._components = components;
  if (!this._components) this._components = [];
  return this;
};

// Specify the module to import from. Note that this method
// doesn't actually load a module: see 'modus.Module#investigate'
// to figure out what modus is doing.
//
// When defining imports, note that 'from' MUST be the last
// part of your chain. 
Import.prototype.from = function (module) {
  this._module = module;
  this._applyToEnv();
};

// Get the parent module.
Import.prototype.getParent = function () {
  return this._parent;
};

// Apply imported components to the parent module.
Import.prototype._applyToEnv = function () {
  if (!this._module) throw new Error('No module specified for import');
  var parentEnv = this._parent.getEnv();
  var module = normalizeModuleName(this._module);
  // Check if this is using a namespace shortcut
  if (module.indexOf('.') === 0)
    module = this._parent.getNamespace() + module;
  var self = this;
  var depEnv = (moduleExists(module))
    ? getModule(module).getEnv() 
    : false;
  var components = this._components;
  if (!depEnv) modus.err('Dependency not avalilable [' + module + '] for: ' + this._parent.getFullName());
  if (typeof components === 'string') {
    if (depEnv['default']) {
      parentEnv[components] = depEnv['default'];
    } else {
      parentEnv[components] = depEnv;
    }
  } else if (this._components.length <= 0) {
    return;
  } else {
    each(components, function(component) {
      if(depEnv.hasOwnProperty(component))
        parentEnv[component] = depEnv[component];
    });
  }
};
