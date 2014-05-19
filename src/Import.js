
// --------------------
// Modus.Import
//
// Import does what you expect: it handles all imports for 
// Modus namespaces and Modus modules.

// Create a new import. [request] can be a path to a resource,
// a module name, or an array of components to import, depending
// on how you modify the import.
//
// example:
//    // Import the 'App/Foo' module.
//    module.imports('App/Foo'); 
//
//    // Import 'App/Foo' and alias it as 'bin'.
//    module.imports('App/Foo').as('bin');
//
//    // Import 'foo' and 'bar' from 'App/Foo'
//    module.imports(['foo', 'bar']).from('App/Foo');
//
//    // Import 'foo' and 'bar' fr 'App/Foo' and alias them.
//    module.imports({fooAlias:'foo', barAlias:'bar'}).from('App/Foo');
//
//    // Import a script and use the global it defines
//    module.imports('scripts/foo.js').global('foo');
var Import = Modus.Import = function (request, parent) {
  this.is = new Is();
  this._parent = parent;
  this._components = false;
  this._request = request;
  this._as = false;
  this._global = false;
  this._uses = false;
  this._inNamespace = false;
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
// lets you import files that are not wrapped in a Modus.Module.
//
// example:
//    module.imports('bower_components/jquery/dist/jquery.min.js').global('$');
Import.prototype.global = function (item) {
  this._global = item;
  if (!this._as) this._as = item;
  return this;
};

// Get the mapped path and object name from the current request.
// Will return an object with 'src' and 'obj' keys.
Import.prototype.getRequest = function () {
  return getMappedPath(this._request, Modus.config('root'));
};

Import.prototype.getNormalizedRequest = function () {
  return normalizeModuleName(this._request);
}

// Get the parent module.
Import.prototype.getModule = function () {
  return this._parent;
};

// Retrieve the requested resource.
Import.prototype.load = function (next, error) {
  if (this.is.failed()) return error('Import failed');
  var self = this;
  var importError = function (reason) {
    self.is.failed(true);
    error(reason);
  }
  if (!this._parseRequest(importError)) return false;
  if (this.is.loaded() 
    || moduleExists(this._request)
    || (this._global && getObjectByName(this._global)) ) {
    this._enableImportedModule(next, importError);
    return;
  }
  // Handle the request with a plugin if defined.
  if (this._uses) {
    this._loadWithPlugin(next, importError);
    return;
  }
  // Otherwise, use the modus loader.
  Modus.load(this._request, function () {
    self.is.loaded(true);
    self._enableImportedModule(next, importError);
  }, importError);
};

// Compile the import
// (to do)
Import.prototype.compile = function () {
  // do compile code.
};

// Ensure that the request is understandable by Modus
Import.prototype._parseRequest = function (error) {
  var request = this._request;
  if ('string' !== typeof request) {
    error('Request must be a string: ' 
      + typeof request);
    return false;
  }
  if (this._as && this._components) {
    error('Cannot use an alias when importing'
      + 'more then one component: ' + this._request);
    return false;
  }
  if (!request) this._request = '';
  // Handle namespace shortcuts (e.g. "module.imports('./foo')" )
  if (request.indexOf('.') === 0 && this._parent) {
    // Drop the starting './'
    this._inNamespace = request.substring(2);
    // Apply the parent's namespace to the request, droping the '.'
    // but keeping the '/'.
    this._request = this._parent.options.namespace + request.substring(1);
  }
  return true;
};

// Load using a plugin
Import.prototype._loadWithPlugin = function (next, error) {
  var self = this;
  if ('function' === typeof this._uses) {
    this._uses(this, function () {
      self.is.loaded(true);
      self._enableImportedModule(next, error);
    }, error);
    return;
  }
  if (false === Modus.plugin(this._uses)) {
    // Try to load the plugin from an external file
    Modus.load(this._uses, function () {
      // Ensure this is run after plugin has a chance
      // to define itself.
      nextTick(function () {
        if (false === Modus.plugin(self._uses)) {
          error('No plugin of that name found: ' + self._uses);
          return;
        }
        self._loadWithPlugin(next, error);
      });
    }, error);
    return;
  }
  Modus.plugin(this._uses, this, function () {
    self.is.loaded(true);
    self._enableImportedModule(next, error);
  }, error);
};

// Ensure imported modules are enabled.
Import.prototype._enableImportedModule = function (next, error) {
  var moduleName = normalizeModuleName(this._request);
  var module = (moduleExists(moduleName))? Modus.env[moduleName] : false;
  var self = this;
  if (this._global) {
    if (!getObjectByName(this._global)) {
      error('A global import [' + this._global + '] failed for: ' 
        + this._parent.getFullName() );
      return;
    }
    this._applyDependencies();
    next();
  } else if (!module || module.is.failed()) {
    error('An import [' + this._request + '] failed for: ' 
      + this._parent.getFullName() );
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
  var module = this._parent.env;
  var moduleName = normalizeModuleName(this._request);
  var dep = (moduleExists(moduleName))? Modus.env[moduleName] : false;
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
    var obj;
    if (this._inNamespace) {
      obj = normalizeModuleName(this._inNamespace).replace(/\//g, '.');
    } else {
      obj = normalizeModuleName(this._request).replace(/\//g, '.');
    }
    createObjectByName(obj, dep, module);
  }
}