
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
  this._uses = false;
  this._inNamespace = false;
};

// Import components from the request.
Import.prototype.from = function (request) {
  if (!request) return this._request;
  if (!this._components) this._components = this._request;
  this._request = request;
  return this;
};

// Use an alias for this import. This will only work if
// you're importing a single item.
Import.prototype.as = function (alias) {
  if (!alias) return this._as;
  this._as = alias;
  return this;
};

// Import using the plugin.
Import.prototype.using = function (plugin) {
  if (!plugin) return this._uses;
  this._uses = plugin;
  return this;
};

// Import the module, passing the request on to the
// appropriate Modus.Loader if needed. 
Import.prototype.load = function (next, error) {
  if (this.is.failed()) return error();
  try {
    this._ensureNamespace();
  } catch(e) {
    error(e);
    return;
  }
  var fromName = 'Modus.env.' + this._request;
  var self = this;
  var importError = function (reason) {
    self.is.failed(true);
    error(reason);
  }
  if (this.is.loaded() || getObjectByName(fromName)) {
    this._enableImportedModule(next, importError);
    return;
  }
  if (!this._uses) this._uses = 'script';
  // Pass to the modus loader.
  Modus.load(this._uses, this._request, function (err) {
    self.is.loaded(true);
    if (err) return importError();
    self._enableImportedModule(next, importError);
  });
};

Import.prototype.compile = function () {
  // do compile code.
};

// Ensure that the request is a full namespace.
Import.prototype._ensureNamespace = function (error) {
  var request = this._request
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
};

// Ensure imported modules are enabled.
Import.prototype._enableImportedModule = function (next, error) {
  var module = getObjectByName(this._request, Modus.managers);
  var self = this;
  if (Modus.shims.hasOwnProperty(this._request)) {
    if (!getObjectByName(this._request)) {
      error('A shimmed import [' + this._request + '] failed for: ' 
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
  var dep = getObjectByName(this._request, Modus.env);
  var module = this._module.env;
  if (Modus.shims.hasOwnProperty(this._request)) {
    dep = getObjectByName(this._request);
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