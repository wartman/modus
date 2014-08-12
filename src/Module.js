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
    namespace: false,
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

  this._env = {};
  this._isDisabled = false;
  this._isEnabled = false;
  this._isEnabling = false;
  this._deps = [];
  this._listeners = {};
  this._isAnon = true;
  
  this.setFactory(factory);
  this.register(name)
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
    modus.env[this.getFullName()] = this;
  }
};

// Get the name of the module, excluding the namespace.
Module.prototype.getName = function () {
  return this.options.moduleName;
};

// Get the module's namespace
Module.prototype.getNamespace = function () {
  return this.options.namespace;
};

// Get the full name of the module, including the namespace.
Module.prototype.getFullName = function () {
  if(!this.options.namespace || !this.options.namespace.length)
    return this.options.moduleName;
  return this.options.namespace + '.' + this.options.moduleName;
};

// API method to add a dependency.
Module.prototype.addDependency = function (dep) {
  if (dep instanceof Array)
    this._deps = this._deps.concat(dep);
  else
    this._deps.push(dep);
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

// API method to get the module's environment.
Module.prototype.getEnv = function () {
  return this._env || {};
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

// Create an instance of `Import`. Arguments passed here
// will be passed to `Import#imports`.
//
//    this.imports(['Bar', 'Bin']).from('app.bar');
//
Module.prototype.imports = function (componets) {
  var imp = new Import(this);
  imp.imports(componets);
  return imp;
};

// Parse a string into a module name and namespace.
Module.prototype._parseName = function (name) {
  var namespace = this.options.namespace || '';
  name = normalizeModuleName(name);
  if (name.indexOf('.') > 0) {
    if (namespace.length) namespace += '.';
    namespace += name.substring(0, name.lastIndexOf('.'));
    name = name.substring(name.lastIndexOf('.') + 1);
  }
  this.options.moduleName = name;
  this.options.namespace = namespace;
};

// RegExp to find imports.
var _findDeps = /\.from\([\'|\"]([\s\S]+?)[\'|\"]\)/g;

// Use RegExp to find any imports this module needs, then add
// them to the imports stack.
Module.prototype._investigate = function () {
  if (!this._factory) return;
  var factory = this._factory.toString();
  var self = this;
  factory.replace(_findDeps, function (matches, dep) {
    // Check if this is using a namespace shortcut
    if (dep.indexOf('.') === 0)
      dep = self.options.namespace + dep;
    self.addDependency(dep);
  });
  this.emit('investigate', this);
  modus.events.emit('module.investigate', this);
};

// Run the registered factory.
Module.prototype._runFactory = function () {
  if (!this._factory) return;
  var self = this;
  // Bind helpers to the env.
  this._env.imports = bind(this.imports, this);
  // Run the factory.
  if (this._factory.length <= 0) {
    this._factory.call(this._env);
  } else {
    this._factory.call(this._env, function (err) {
      if (err)
        self.emit('error', err);
      else
        self.emit('done', null, self);
    });
  }
  // Cleanup the env.
  this.once('done', function () {
    delete self._env.imports;
    delete self._factory;
  });
};

// Run an AMD-style factory
Module.prototype._runFactoryAMD = function () {
  if (!this._factory) return;
  var self = this;
  var deps = this.getDependencies();
  var mods = [];
  var usingExports = false;
  each(deps, function (dep) {
    if (dep === 'exports') {
      mods.push(self._env);
      usingExports = true;
    } else {
      dep = normalizeModuleName(dep);
      if (moduleExists(dep)) 
        mods.push(getModule(dep).getEnv());
    }
  });
  if (!usingExports) 
    this._env = this._factory.apply(this, mods) || {};
  else 
    this._factory.apply(this, mods)
  this.once('done', function () {
    delete self._factory;
  });
};
