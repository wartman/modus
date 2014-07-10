
// Modus.Import
// ------------
// Import does what you expect: it handles all imports for 
// Modus namespaces and Modus modules.
var Import = Modus.Import = function (parent) {
  this._listeners = {};
  this._parent = parent;
  this._components = [];
  this._module = false;
  this._plugin = false;
};

// Extend the event emitter.
Import.prototype = new EventEmitter()
Import.prototype.constructor = Import;

// Import components from a module.
Import.prototype.imports = function() {
  var self = this;
  if (!this._components) this._components = [];
  each(arguments, function (arg) {
    self._components.push(arg);
  });
  return this;
};

// Use a plugin to load this module. 
Import.prototype.using = function (plugin) {
  this._plugin = plugin;
  return this;
};

// Specify the module to import from. Note that this method
// doesn't actually load a module: see 'Modus.Module#investigate'
// to figure out what Modus is doing.
//
// When defining imports, note that 'from' MUST be the last
// part of your chain. 
Import.prototype.from = function (module) {
  this._module = module;
  this._applyToEnv();
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
    : getGlobal(module);
  if (!depEnv) Modus.err('Dependency not avalilable [' + module + '] for: ' + this._parent.getFullName());
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