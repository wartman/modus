
// --------------------
// Modus.Import
//
// Import does what you expect: it handles all imports for 
// Modus namespaces and Modus modules.

var Import = Modus.Import = function (request, module) {
  this.is = new Is();
  this._module = module;
  this._components = false;
  this._request = request;
  this._as = false;
  this._uses = false;
  this._inNamespace = false;
};

// Import components from this module.
Import.prototype.from = function (request) {
  if (!request) return this._request;
  if (!this._components) this._components = this._request;
  this._request = request;
  return this;
};

// Use an alias for this import. This will only work if
// you're importing a single item.
Import.prototype.as = function (alias) {
  if (this._components) {
    throw new Error('Cannot use an alias when importing'
      + 'more then one component: ' + this._request);
  }
  if (!alias) return this._as;
  this._as = alias;
  return this;
};

// Use a plugin to import.
Import.prototype.uses = function (plugin) {
  if (!plugin) return this._uses;
  this._uses = plugin;
  return this;
};

// Import the module, passing the request on to the
// appropriate Modus.Loader if needed. 
Import.prototype.load = function (next, error) {
  if (this.is.failed()) return error();
  this._ensureNamespace();
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
Import.prototype._ensureNamespace = function () {
  var request = this._request
  if ('string' !== typeof request) {
    throw new TypeError('Request must be a string: ' 
      + typeof request);
  }
  if (!request) this._request = '';
  if (request.indexOf('.') === 0 && this._module) {
    this._inNamespace = request;
    this._request = this._module.options.namespace + request;
  }
};

// Ensure imported modules are enabled.
Import.prototype._enableImportedModule = function (next, error) {
  var module = getObjectByName('Modus.env.' + this._request);
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

// Apply requested components to the parent module.
Import.prototype._applyDependencies = function () {
  var dep = getObjectByName('Modus.env.' + this._request);
  var module = this._module;
  if (Modus.shims.hasOwnProperty(this._request)) {
    dep = getObjectByName(this._request);
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
      createObjectByName('Modus.env.' + module.getFullName() 
        + this._inNamespace, dep);
      return;
    }
    createObjectByName('Modus.env.' + module.getFullName() 
      + '.' + this._request, dep);
  }
}