// modus.Module
// ------------
// The core of modus. Exports are applied directly to each module
// object, so some effort has been made to reduce the likelihood of 
// name conflicts (mostly by making method names rather verbose).
var Module = modus.Module = function (name, factory, options) {
  var self = this;

  // Allow for anon modules.
  if('string' !== typeof name && (name !== false)) {
    // options = factory;
    factory = name;
    name = false;
  }

  // Define module information
  this.__modulePromise = when();
  this.__moduleDependencies = [];
  this.__moduleName = '';
  this.__moduleFactory = null;
  this.__moduleMeta = defaults({
    throwErrors: true,
    isAsync: false,
    isAmd: false,
    isDisabled: false,
    isEnabled: false,
    isEnabling: false,
    isAnon: true
  }, options);
  
  this.setModuleFactory(factory);
  this.registerModule(name);
};

// A list of props to omit from module imports.
var _moduleOmit = ['__moduleName', '__moduleFactory', '__modulePromise', '__moduleMeta', '__moduleDependencies'];

// Private method to add imported properties to a module.
function _applyToModule (props, dep, many) {
  var env = this;
  if (props instanceof Array) {
    each(props, function (prop) {
      _applyToModule.call(env, prop, dep, true);
    });
  } else if ('object' === typeof props) {
    each(props, function (alias, actual) {
      env[alias] = (dep.hasOwnProperty(actual))? dep[actual] : null;
    });
  } else {
    if (many) {
      // If 'many' is true, then we're iterating through props and
      // assigning them.
      env[props] = (dep.hasOwnProperty(props))? dep[props] : null;
    } else {
      if (dep.hasOwnProperty('default'))
        env[props] = dep['default']
      else
        env[props] = omit(dep, _moduleOmit);
    }
  }
};

// Import components from a given module.
//
//    this.from('foo.bar').imports('bar', 'bin');
//      // Imports `bar` and `bin` from `foo.bar`
//    this.from('foo.bar').imports('bar', {'bin': 'box'});
//      // Imports `bar` and `bin` from `foo.bar`, aliasing 'bin' as 'box'
//
Module.prototype.from = function (dep) {
  var self = this;
  dep = normalizeModuleName(dep, this.getModuleName());

  return {
    imports: function (/*...*/) {
      var args = Array.prototype.slice.call(arguments, 0);
      var props = [];
      if (args[0] instanceof Array) {
        props = args[0]
      } else {
        props = props.concat(args);
      }
      if (modus.moduleExists(dep)) {
        var depEnv = modus.getModule(dep);
        _applyToModule.call(self, props, depEnv, false);
      }
    }
  }
};

// Import an entire module. This will either import all exported module properties,
// or import the `default` export (if one exists).
//
//    this.imports('foo.bar'); // Will import the `foo.bar` module as `bar`.
//    this.imports('foo.bar').as('bin'); // Imports the `foo.bar` module as `bin`.
//    this.imports({'foo.bar': 'bin'}); // Imports the `foo.bar` module as `bin`.
//
Module.prototype.imports = function (dep) {
  var self = this;
  var alias;
  var unNormalizedDep;
  var depEnv;

  if ('object' === typeof dep) {
    for (var key in dep) {
      unNormalizedDep = key;
      alais = dep[key];
    }
  } else {
    unNormalizedDep = dep;
    alias = dep.split('.').pop();
  }

  var prevValue = this[alias];
  dep = normalizeModuleName(unNormalizedDep, this.getModuleName());
  if (modus.moduleExists(dep)) {
    depEnv = modus.getModule(dep);
    _applyToModule.call(self, alias, depEnv, false);
  }

  return {
    // Alias an import to avoid naming conflicts.
    // This will also restore the value of any overwritten
    // modules.
    as: function (newAlias) {
      // Return aliased value to the last owner.
      self[alias] = prevValue;
      if (depEnv)
        _applyToModule.call(self, newAlias, depEnv, false);
    }
  }
};

// Shim for CommonJs style require calls.
Module.prototype.require = function (dep) {
  dep = normalizeModuleName(dep, this.getModuleName());
  var result = {};
  if (modus.moduleExists(dep)) {
    var depEnv = modus.getModule(dep);
    if (depEnv.hasOwnProperty('default'))
      result = depEnv['default']
    else
      result = omit(depEnv, _moduleOmit);
  }
  return result;
};

// Set the module name and register the module, if a name is
// provided.
Module.prototype.registerModule = function (name) {
  if (this.getModuleMeta('isAnon') && name) {
    this.setModuleMeta('isAnon', false);
    this.__moduleName = normalizeModuleName(name);
    // Register with modus
  }
  if (!this.getModuleMeta('isAnon'))
    modus.addModule(this.getModuleName(), this);
};

// Get a meta item from the module, if it exists ('meta items' typically
// being things like 'isAsync' or 'isEnabled'). Returns `false` if nothing
// is found.
Module.prototype.getModuleMeta = function (key) {
  if(!key) return this.__moduleMeta;
  return this.__moduleMeta[key] || false;
};

// Set a meta item.
Module.prototype.setModuleMeta = function (key, value) {
  this.__moduleMeta[key] = value;
};

// Use a promise
Module.prototype.onModuleReady = function(onReady, onFail) {
  if (arguments.length)
    this.__modulePromise.then(onReady, onFail);
  return this.__modulePromise;
};

// Get the name of the module, excluding the namespace.
Module.prototype.getModuleName = function () {
  return this.__moduleName;
};

// API method to add a dependency.
Module.prototype.addModuleDependency = function (dep) {
  var self = this;
  if (dep instanceof Array) {
    each(dep, function (item) {
      self.addModuleDependency(item);
    });
    return;
  }
  dep = normalizeModuleName(dep, this.getModuleName());
  this.__moduleDependencies.push(dep);
  return dep;
};

// API method to get all dependencies.
Module.prototype.getModuleDependencies = function () {
  return this.__moduleDependencies || [];
};

// RegExp to remove comments, ensuring that we don't try to
// import things that have been commented out.
var _commentRegExp = /(\/\*([\s\S]*?)\*\/|([^:]|^)\/\/(.*)$)/mg;

// RegExps to find imports.
var _importRegExp = [
  /(?:[^\.'"\(\)]+)\.from\(\s*["']([^'"\s]+)["']\s*\)/g,
  /(?:[^\.'"\(\)]+)\.imports\(\s*["']([^'"\s]+)["']\s*\)/g,
  /require\s*\(\s*["']([^'"\s]+)["']\s*\)/g
];

// Use RegExp to find any imports this module needs, then add
// them to the dependency stack.
Module.prototype.findModuleDependencies = function () {
  if (!this.__moduleFactory) return;
  var self = this;
  var factory = this.__moduleFactory
    .toString()
    .replace(_commentRegExp, '');
  each(_importRegExp, function (re) {
    factory.replace(re, function (matches, dep) {
      self.addModuleDependency(dep);
    });
  });
};

// API method to set the factory function.
// If the factory has more then one argument, this module
// depends on some sort of async operation (unless this is an
// amd module).
Module.prototype.setModuleFactory = function (factory) {
  if (!factory) return;
  // Make sure factory is a function
  if ('function' !== typeof factory) {
    var value = factory;
    if (this.getModuleMeta('isAmd')) {
      factory = function () { return value; };
    } else {
      factory = function () { this['default'] = value; };
    }
  };
  if (factory.length >= 2 && !this.getModuleMeta('isAmd'))
    this.setModuleMeta('isAsync', true);
  this.__moduleFactory = factory;
};

// API method to get the factory function, if it exists.
Module.prototype.getModuleFactory = function () {
  return this.__moduleFactory || false;
};

// Make sure a module is enabled and add event listeners.
var _ensureModuleIsEnabled = function (dep, next, error) {
  if (moduleExists(dep)) {
    var mod = getModule(dep);
    mod.enableModule().then(next, error);
  } else {
    error('Could not load dependency: ' + dep);
  }
};

// Run the registered factory.
var _runFactory = function () {
  if (!this.__moduleFactory) return;
  var self = this;
  // Run the factory.
  if (this.__moduleFactory.length <= 1) {
    this.__moduleFactory.call(this, this);
  } else {
    this.__moduleFactory.call(this, this, function (err) {
      if (err)
        self.__modulePromise.reject(err, self);
      else
        self.__modulePromise.resolve(self, self);
    });
  }
  // Cleanup.
  delete this.__moduleFactory;
};

// Run an AMD-style factory
var _runFactoryAMD = function () {
  if (!this.__moduleFactory) return;
  var self = this;
  var deps = this.getModuleDependencies();
  var mods = [];
  var usingExports = false;
  var amdModule = {exports: {}};
  // Create or get the current env.
  each(deps, function (dep) {
    if (dep === 'exports') {
      mods.push(amdModule.exports);
      usingExports = true;
    } else if (dep === 'module') {
      mods.push(amdModule);
      usingExports = true;
    } else if (dep === 'require') {
      mods.push(bind(self.require, self));
    } else {
      dep = normalizeModuleName(dep);
      if (moduleExists(dep)) {
        var env = getModule(dep);
        if (env.hasOwnProperty('default'))
          mods.push(env['default']);
        else
          mods.push(env);
      }
    }
  });
  if (!usingExports) 
    amdModule.exports = this.__moduleFactory.apply(this, mods) || {};
  else 
    this.__moduleFactory.apply(this, mods);

  // Export the env
  // @todo: I think I have the following check just to make underscore work. Seems a
  // little odd? Is it even necessary?
  if (typeof amdModule.exports === 'function')
    amdModule.exports['default'] = amdModule.exports;
  extend(this, amdModule.exports);

  // Cleanup.
  delete this.__moduleFactory;
};

// Enable this module.
Module.prototype.enableModule = function() {
  if (this.getModuleMeta('isDisabled') 
      || this.getModuleMeta('isEnabling')
      || this.getModuleMeta('isEnabled')) 
    return this.__modulePromise;

  var self = this;
  var loader = modus.Loader.getInstance();
  var deps = [];
  var onFinal = function () {
    self.setModuleMeta('isEnabling', false);
    self.setModuleMeta('isEnabled', true);
    if(!modus.isBuilding) {
      if (self.getModuleMeta('isAmd'))
        _runFactoryAMD.call(self);
      else
        _runFactory.call(self);
    }
    if(!self.getModuleMeta('isAsync'))
      self.__modulePromise.resolve(null, self);
  };

  // Ensure we don't try to enable this module twice.
  this.setModuleMeta('isEnabling', true);
  this.findModuleDependencies();
  deps = this.getModuleDependencies();

  if (deps.length <= 0) {
    onFinal();
    return this.__modulePromise;
  }

  whenAll(deps, function (dep, next, error) {
    if (self.getModuleMeta('isAmd') && inArray(['exports', 'require', 'module'], dep) >= 0) {
      // Skip AMD/CommonJS helpers
      next();
    } else if (moduleExists(dep)) {
      _ensureModuleIsEnabled(dep, next, error);
    } else {
      // Try to find the module.
      if (moduleExists(dep)) {
        _ensureModuleIsEnabled(dep, next, error);
      } else {
        loader
          .load(dep)
          .then(function () {
            _ensureModuleIsEnabled(dep, next, error);
          }, error);
      }
    }
  }).then(onFinal, bind(this.disableModule, this));

  return this.__modulePromise;
};

// Disable this module and run any error hooks. Once a 
// module is disabled it cannot transition to an 'enabled' state.
Module.prototype.disableModule = function (reason) {
  this.setModuleMeta('isDisabled', true);
  this.__modulePromise.reject(reason);
  if (this.getModuleMeta('throwErrors') && reason instanceof Error) {
    throw reason;
  } else if (this.getModuleMeta('throwErrors')) {
    throw new Error(reason);
  }
  return reason;
};
