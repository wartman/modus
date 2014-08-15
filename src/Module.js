// modus.Module
// ------------
// The core of modus, Modules allow you to spread code across
// several files (private).
var Module = function (name, factory, options) {
  var self = this;

  // Allow for anon modules.
  if('function' === typeof name) {
    options = factory;
    factory = name;
    name = false;
  }

  this.options = defaults({
    moduleName: null,
    throwErrors: true,
    pub: false,
    amd: false,
    wait: false
  }, options);

  // If the factory has more then one argument, this module
  // depends on some sort of async operation (unless this is an
  // amd module).
  if ((factory && factory.length >= 1) && !this.options.amd) 
    this.options.wait = true;
  if (this.options.wait) {
    // We only want to wait until 'done' is emited, then
    // return to the usual behavior.
    this.once('done', function () {
      self.options.wait = false;
    });
  }

  this._namespace = null;
  this._isDisabled = false;
  this._isEnabled = false;
  this._isEnabling = false;
  this._deps = [];
  this._listeners = {};
  this._isAnon = true;
  
  this.setFactory(factory);
  this.register(name);
};

// Extend the event emitter.
Module.prototype = new EventEmitter();
Module.prototype.constructor = Module;

// Set the module name and register the module, if a name is
// provided.
Module.prototype.register = function (name) {
  if (this._isAnon && name) {
    this._isAnon = false;
    this._parseName(name);
    // Register with modus
    modus.addModule(this.getModuleName(), this);
  }
};

// Get the name of the module, excluding the namespace.
Module.prototype.getModuleName = function () {
  return this.options.moduleName;
};

// API method to add a dependency.
Module.prototype.addDependency = function (dep) {
  var self = this;
  if (dep instanceof Array) {
    each(dep, function (item) {
      self.addDependency(item);
    });
    return;
  }
  dep = normalizeModuleName(dep, this.getModuleName());
  this._deps.push(dep);
  return dep;
};

// API method to get all dependencies.
Module.prototype.getDependencies = function () {
  return this._deps || [];
};

// API method to set the factory function.
Module.prototype.setFactory = function (factory) {
  this._factory = factory;
};

// API method to get the factory function, if it exists.
Module.prototype.getFactory = function () {
  return this._factory || false;
};

// API method to set this module's namespace.
Module.prototype.setNamespace = function (namespace) {
  if (!(namespace instanceof Namespace))
    throw new TypeError('Namespace must be an instance of [modus.Namespace]: ' + typeof namespace);
  this._namespace = namespace;
};

// API method to get the module's namespace.
Module.prototype.getNamespace = function () {
  if (this._isAnon)
    throw new Error('Cannot get namespace from anonymous module');
  return this._namespace || new Namespace(this.getModuleName());
};

// Make sure a module is enabled and add event listeners.
var _ensureModuleIsEnabled = function (dep, next, error) {
  if (moduleExists(dep)) {
    var mod = getModule(dep);
    mod.once('done', function () { nextTick(next) });
    mod.once('error', function () { nextTick(error) });
    mod.enable();
  } else {
    error('Could not load dependency: ' + dep);
  }
};

// Enable this module.
Module.prototype.enable = function() {
  if (this._isDisabled || this._isEnabling) return;
  if (this._isEnabled) {
    if (!this.options.wait) this.emit('done');
    return;
  }

  var self = this;
  var loader = modus.Loader.getInstance();
  var deps = [];
  var onFinal = function () {
    self._isEnabling = false;
    self._isEnabled = true;
    if(!modus.isBuilding) {
      if (self.options.amd)
        self._runFactoryAMD();
      else
        self._runFactory();
    }
    if(!self.options.wait) self.emit('done');
  };

  // Ensure we don't try to enable this module twice.
  this._isEnabling = true;
  this.emit('enable.before');
  this._investigate();
  deps = this.getDependencies();

  if (deps.length <= 0) {
    onFinal();
    return;
  }

  eachAsync(deps, {
    each: function (dep, next, error) {
      if (self.options.amd && dep === 'exports') {
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
      self.disable(reason);
    }
  });
};

// Disable this module and run any error hooks. Once a 
// module is disabled it cannot transition to an 'enabled' state.
Module.prototype.disable = function (reason) {
  this._isDisabled = true;
  this.emit('error');
  if (this.options.throwErrors && reason instanceof Error) {
    throw reason;
  } else if (this.options.throwErrors) {
    throw new Error(reason);
  }
};

// Parse a string into a module name.
Module.prototype._parseName = function (name) {
  this.options.moduleName = normalizeModuleName(name);
};

// RegExps to find imports.
var _finders = [
  /\.from\([\'|\"]([\s\S]+?)[\'|\"]\)/g,
  /\.imports\([\'|\"]([\s\S]+?)[\'|\"]\)\.as\([\s\S]+?\)/g
];

// Use RegExp to find any imports this module needs, then add
// them to the imports stack.
Module.prototype._investigate = function () {
  if (!this._factory) return;
  var factory = this._factory.toString();
  var self = this;
  var addDep = function (matches, dep) {
    self.addDependency(dep);
  };
  each(_finders, function (re) {
    factory.replace(re, addDep);
  });
  this.emit('investigate', this, factory);
  modus.events.emit('investigate', this, factory);
};

// Run the registered factory.
Module.prototype._runFactory = function () {
  if (!this._factory) return;
  var self = this;
  // Create or get the current env.
  this._namespace = this.getNamespace();
  // Run the factory.
  if (this._factory.length <= 0) {
    this._factory.call(this._namespace);
  } else {
    this._factory.call(this._namespace, function (err) {
      if (err)
        self.emit('error', err);
      else
        self.emit('done', null, self);
    });
  }
  // Cleanup.
  delete this._factory;
};

// Run an AMD-style factory
Module.prototype._runFactoryAMD = function () {
  if (!this._factory) return;
  var self = this;
  var deps = this.getDependencies();
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
        var env = getNamespace(dep);
        if (env.hasOwnProperty('default'))
          mods.push(env['default']);
        else
          mods.push(env);
      }
    }
  });
  if (!usingExports) 
    amdNamespace = this._factory.apply(this, mods) || {};
  else 
    this._factory.apply(this, mods);

  // Export the env
  if (typeof amdNamespace === 'function')
    amdNamespace['default'] = amdNamespace;
  this._namespace = amdNamespace;
  // Cleanup.
  delete this._factory;
};
