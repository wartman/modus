// modus.Module
// ------------
// The core of modus.
var Module = modus.Module = function (name, factory, options) {
  var self = this;

  // Allow for anon modules.
  if('function' === typeof name) {
    options = factory;
    factory = name;
    name = false;
  }

  this.__moduleEvents = new EventEmitter();
  this.__moduleDependencies = [];
  this.__moduleName = '';
  this.__moduleFactory = null;
  this.__moduleMeta = defaults({
    throwErrors: true,
    isAsync: false,
    isPublished: false,
    isAmd: false,
    isDisabled: false,
    isEnabled: false,
    isEnabling: false,
    isAnon: true
  }, options);

  // If the factory has more then one argument, this module
  // depends on some sort of async operation (unless this is an
  // amd module).
  if ((factory && factory.length >= 1) && !this.getModuleMeta('isAmd'))
    this.setModuleMeta('isAsync', true);
  if (this.getModuleMeta('isAsync')) {
    // We only want to wait until 'done' is emited, then
    // return to the usual behavior.
    this.addModuleEventListener('done', function () {
      self.setModuleMeta('isAsync', false);
    }, true);
  }
  
  this.setModuleFactory(factory);
  this.registerModule(name);
};

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
        env[props] = omit(dep, ['__moduleName', '__moduleFactory', '__moduleEvents', '__moduleMeta', '__moduleDependencies']);
    }
  }
};

// Start an import chain. You can import specific properties from a module
// by using 'imports(<properties>).from(<moduleName>)'. For example:
//
//    var ns = new modus.Namespace('test');
//    // Pass an arbitrary number of arguments:
//    ns.imports('Foo', 'Bar').from('some.module');
//    // Or use an array:
//    ns.imports(['Foo', 'Bar']).from('some.module');
//    // Now all imported items are available in the current namespace:
//    console.log(ns.Foo, ns.Bar);
//
// If you want to import everything from a module (or import the 'default'
// export, if it is set) use 'imports(<moduleName>).as(<alias>)'. For example:
//
//    ns.imports('some.module').as('Module');
//    // The module is now available in the current namespace:
//    console.log(ns.Module.Foo, ns.Module.Bar);
//
// In both cases, '<moduleName>' will be parsed by modus and used to define
// a dependency for the current module. See 'Module#_investigate' for more on
// what's going on here.
Module.prototype.imports = function (/* args */) {
  var self = this;
  var args = Array.prototype.slice.call(arguments, 0);
  var props = [];
  if (args[0] instanceof Array) {
    props = args[0];
  } else {
    props = props.concat(args);
  }
  return {
    from: function (dep) {
      dep = normalizeModuleName(dep, self.getModuleName());
      if (modus.moduleExists(dep)) {
        var depEnv = modus.getModule(dep);
        _applyToModule.call(self, props, depEnv, false);
      }
    },
    as: function (alias) {
      var dep = props[0];
      dep = normalizeModuleName(dep, self.getModuleName());
      if (modus.moduleExists(dep)) {
        var depEnv = modus.getModule(dep);
        _applyToModule.call(self, alias, depEnv, false);
      }
    }
  };
};

// Set the module name and register the module, if a name is
// provided.
Module.prototype.registerModule = function (name) {
  if (this.getModuleMeta('isAnon') && name) {
    this.setModuleMeta('isAnon', false);
    this.__moduleName = normalizeModuleName(name);
    // Register with modus
    modus.addModule(this.getModuleName(), this);
  }
};

Module.prototype.getModuleMeta = function (key) {
  if(!key) return this.__moduleMeta;
  return this.__moduleMeta[key] || false;
};

Module.prototype.setModuleMeta = function (key, value) {
  this.__moduleMeta[key] = value;
};

Module.prototype.addModuleEventListener = function (name, callback, once) {
  this.__moduleEvents.addEventListener(name, callback, once);
};

Module.prototype.emitModuleEvent = function () {
  this.__moduleEvents.emit.apply(this.__moduleEvents, arguments);
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

// API method to set the factory function.
Module.prototype.setModuleFactory = function (factory) {
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
    mod.addModuleEventListener('done', function () { nextTick(next) }, true);
    mod.addModuleEventListener('error', function () { nextTick(error) }, true);
    mod.enableModule();
  } else {
    error('Could not load dependency: ' + dep);
  }
};

// RegExps to find imports.
var _finders = [
  /\.from\([\'|\"]([\s\S]+?)[\'|\"]\)/g,
  /\.imports\([\'|\"]([\s\S]+?)[\'|\"]\)\.as\([\s\S]+?\)/g
];

// Use RegExp to find any imports this module needs, then add
// them to the imports stack.
var _investigate = function () {
  if (!this.__moduleFactory) return;
  var factory = this.__moduleFactory.toString();
  var self = this;
  var addDep = function (matches, dep) {
    self.addModuleDependency(dep);
  };
  each(_finders, function (re) {
    factory.replace(re, addDep);
  });
  this.emitModuleEvent('investigate', this, factory);
  modus.events.emit('investigate', this, factory);
};

// Run the registered factory.
var _runFactory = function () {
  if (!this.__moduleFactory) return;
  var self = this;
  // Run the factory.
  if (this.__moduleFactory.length <= 0) {
    this.__moduleFactory.call(this);
  } else {
    this.__moduleFactory.call(this, function (err) {
      if (err)
        self.emitModuleEvent('error', err);
      else
        self.emitModuleEvent('done', null, self);
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
  var amdNamespace = {};
  // Create or get the current env.
  each(deps, function (dep) {
    if (dep === 'exports') {
      mods.push(amdNamespace);
      usingExports = true;
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
    amdNamespace = this.__moduleFactory.apply(this, mods) || {};
  else 
    this.__moduleFactory.apply(this, mods);

  // Export the env
  if (typeof amdNamespace === 'function')
    amdNamespace['default'] = amdNamespace;
  extend(this, amdNamespace);

  // Cleanup.
  delete this.__moduleFactory;
};

// Enable this module.
Module.prototype.enableModule = function() {
  if (this.getModuleMeta('isDisabled') || this.getModuleMeta('isEnabling')) 
    return;
  if (this.getModuleMeta('isEnabled')) {
    if (!this.getModuleMeta('isAsync')) 
      this.emitModuleEvent('done');
    return;
  }

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
      self.emitModuleEvent('done');
  };

  // Ensure we don't try to enable this module twice.
  this.setModuleMeta('isEnabling', true);
  this.emitModuleEvent('enable.before');
  // Find all dependencies.
  _investigate.call(this);
  deps = this.getModuleDependencies();

  if (deps.length <= 0) {
    onFinal();
    return;
  }

  eachAsync(deps, {
    each: function (dep, next, error) {
      if (self.getModuleMeta('isAmd') && dep === 'exports') {
        next();
      } else if (moduleExists(dep)) {
        _ensureModuleIsEnabled(dep, next, error);
      } else {
        // Try to find the module.
        if (moduleExists(dep)) {
          _ensureModuleIsEnabled(dep, next, error);
        } else {
          loader.load(dep, function () {
            _ensureModuleIsEnabled(dep, next, error);
          }, error);
        }
      }
    },
    onFinal: onFinal,
    onError: function (reason) {
      self.disableModule(reason);
    }
  });
};

// Disable this module and run any error hooks. Once a 
// module is disabled it cannot transition to an 'enabled' state.
Module.prototype.disableModule = function (reason) {
  this.getModuleMeta('isDisabled', true);
  this.emitModuleEvent('error', reason);
  if (this.getModuleMeta('throwErrors') && reason instanceof Error) {
    throw reason;
  } else if (this.getModuleMeta('throwErrors')) {
    throw new Error(reason);
  }
};
