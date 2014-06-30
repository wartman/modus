
// Modus.Import
// ------------
// Import does what you expect: it handles all imports for 
// Modus namespaces and Modus modules.

// Create a new import. [request] can be a path to a resource,
// a module name, or an array of components to import, depending
// on how you modify the import.
var Import = Modus.Import = function (parent) {
  this._parent = parent;
  this._components = [];
  this._module = false;
};

// Import components from a module.
Import.prototype.imports = function() {
  var self = this;
  if (!this._components) this._components = [];
  each(arguments, function (arg) {
    self._components.push(arg);
  });
  return this;
}

// Specify the module to import from. Modus.Module uses
// RegExp to find investigate this method, and try to load
// the specified module. When actually called in the module
// environment, this module will apply your request to the env.
Import.prototype.from = function (module) {
  this._module = module;
  this._applyToEnv();
  return this;
};

// Get the parent module.
Import.prototype.getModule = function () {
  return this._parent;
};

// Apply imported components to the parent module.
Import.prototype._applyToEnv = function () {
  if (!this._module) throw new Error('No module specified for import');
  var parentEnv = this._parent.env;
  var module = normalizeModuleName(this._module);
  // Check if this is using a namespace shortcut
  if (module.indexOf('.') === 0)
    module = this._parent.options.namespace + module;
  var self = this;
  var depEnv = (moduleExists(module))
    ? getModule(module).env 
    : getMappedGlobal(module);
  if (!depEnv) throw new Error('Dependency not avalilable [' + module + '] for: ' + this._parent.getFullName());
  if (this._components.length <= 0) return;
  if (this._components.length === 1) {
    // Handle something like "module.imports('foo').from('app.foo')"
    // If the name matches the last segment of the module name, it should import the entire module.
    var moduleName = module.substring(module.lastIndexOf('.') + 1);
    var component = this._components[0];
    if (component === moduleName) {
      if (depEnv['default'])
        parentEnv[component] = depEnv['default'];
      else
        parentEnv[component] = depEnv;
      return;
    }
  }
  each(this._components, function(component) {
    if(depEnv.hasOwnProperty(component))
      parentEnv[component] = depEnv[component];
  });
}