
// --------------------
// Modus.Import
//
// Import does what you expect: it handles all imports for 
// Modus namespaces and Modus modules.

// Create a new import. [request] can be several things,
// depening on how you modify the import later. To explain
// this, here are some examples:
//
// example:
//    // finds the 'app.foo' module. Avilable as 'module.app.foo'
//    module.imports('app.foo'); 
//    // Imports 'app.foo' and aliases it as 'bin'.
//    // Available as 'module.bin'.
//    module.imports('app.foo').as('bin');
//    // Finds 'foo' and 'bar' from 'app.foo'
//    // Available as 'module.foo' and 'module.bar'
//    module.imports(['foo', 'bar']).from('app.foo');
//    // Imports 'foo' and 'bar' for 'app.foo' and aliases them.
//    // Available as 'module.fooAlias' and 'module.barAlias'
//    module.imports({fooAlias:'foo', barAlias:'bar'}).from('app.foo');
var Import = Modus.Import = function (request, module) {
  this.is = new Is();
  this._module = module;
  this._components = false;
  this._request = request;
  this._as = false;
  this._global = false;
  this._uses = false;
  this._inNamespace = false;
  this._modulePath = '';
};

// Import components from the request.
Import.prototype.from = function (request) {
  if (!this._components) this._components = this._request;
  this._request = request;
  return this;
};

// Use an alias for this import. This will only work if
// you're importing a single item.
Import.prototype.as = function (alias) {
  this._as = alias;
  return this;
};

// Import using a plugin. This can point to an external
// file: modus will load it like any other module,
// then use the plugin defined there to resolve this
// import (see 'Modus.plugin' for some examples).
// Yoy can also pass a function here.
Import.prototype.using = function (plugin) {
  this._uses = plugin;
  return this;
};

// Load a script and import a global var. This method
// lets you import files that are not wrapped in Modus.Modules:
// think of it as a shim.
Import.prototype.global = function (path) {
  this._global = this._request;
  if (!this._as) this._as = this._request;
  this._request = path;
  return this;
};

// Import the module, passing the request on to 
// Modus.load if needed.
Import.prototype.load = function (next, error) {
  if (this.is.failed()) return error();
  try {
    this._ensureNamespace();
  } catch(e) {
    error(e);
    return;
  }
  var self = this;
  var importError = function (reason) {
    self.is.failed(true);
    error(reason);
  }
  if (this.is.loaded() 
    || getObjectByName(this._modulePath, Modus.env)
    || (this._global && getObjectByName(this._global)) ) {
    this._enableImportedModule(next, importError);
    return;
  }
  if (this._uses) {
    this._loadWithPlugin(next, importError);
    return;
  }
  // Pass to the modus loader.
  Modus.load(this._request, function () {
    self.is.loaded(true);
    self._enableImportedModule(next, importError);
  }, importError);
};


Import.prototype.compile = function () {
  // do compile code.
};

// Load using a plugin
Import.prototype._loadWithPlugin = function (next, error) {
  var self = this;
  if ('function' === typeof this._uses) {
    this._uses(function () {
      self.is.loaded(true);
      self._enableImportedModule(next, error);
    }, error);
    return;
  }
  if (false === Modus.plugin(this._uses)) {
    Modus.load(this._uses, function () {
      if (false === Modus.plugin(self._uses)) {
        error('No plugin of that name found: ' + self._uses);
        return;
      }
      self._loadWithPlugin(next, error);
    }, error);
    return;
  }
  Modus.plugin(this._uses, this._request, function () {
    self.is.loaded(true);
    self._enableImportedModule(next, error);
  }, error);
};

// Ensure that the request is a full namespace.
Import.prototype._ensureNamespace = function (error) {
  var request = this._request;
  if ('string' !== typeof request) {
    throw new TypeError('Request must be a string: ' 
      + typeof request);
  }
  if (this._as && this._components) {
    throw new Error('Cannot use an alias when importing'
      + 'more then one component: ' + this._request);
  }
  if (!request) this._request = '';
  if (request.indexOf('.') === 0 && this._module) {
    // Drop the starting '.'
    this._inNamespace = request.substring(1);
    this._request = this._module.options.namespace + request;
  }
  this._modulePath = getModulePath(this._request);
};

// Ensure imported modules are enabled.
Import.prototype._enableImportedModule = function (next, error) {
  var module = getObjectByName(this._modulePath, Modus.env);
  var self = this;
  if (this._global) {
    if (!getObjectByName(this._global)) {
      error('A global import [' + this._global + '] failed for: ' 
        + this._module.getFullName() );
      return;
    }
    this._applyDependencies();
    next();
  } else if (!module || module.is.failed()) {
    error('An import [' + this._request + '] failed for: ' 
      + this._module.getFullName() );
  } else {
    module.wait.done(function () {
      self.is.ready();
      self._applyDependencies();
      next();
    }, error);
    module.run();
  }
};

// Apply imported components to the parent module.
Import.prototype._applyDependencies = function () {
  var module = this._module.env;
  var dep = getObjectByName(this._modulePath, Modus.env);
  if (this._global) {
    dep = getObjectByName(this._global);
  } else {
    dep = dep.env;
  }
  if (this._components instanceof Array) {
    each(this._components, function (component) {
      module[component] = dep[component];
    });
  } else if ("object" === typeof this._components) {
    each(this._components, function (component, alias) {
      module[alias] = dep[component];
    });
  } else if (this._components) {
    module[this._components] = dep[this._components];
  } else if (this._as) {
    module[this._as] = dep;
  } else {
    if (this._inNamespace) {
      createObjectByName(this._inNamespace, dep, module);
      return;
    }
    createObjectByName(this._request, dep, module);
  }
}