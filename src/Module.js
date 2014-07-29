// modus.Module
// ------------
// The core of modus, Modules allow you to spread code across
// several files.
var Module = modus.Module = function (name, factory, options) {
  this.options = defaults({
    namespace: false,
    moduleName: null,
    throwErrors: true,
    // If true, the factory will not be run.
    compiling: false,
    // If true, you'll need to manualy emit 'done' before
    // the module will be marked as 'enabled'
    wait: false,
    hooks: {}
  }, options);
  var self = this;
  // If the factory has more then one argument, this module
  // depends on some sort of async operation.
  if (factory && factory.length >= 2) 
    this.options.wait = true;
  if (this.options.wait) {
    // We only want to wait until 'done' is emited, then
    // return to the usual behavior.
    this.once('done', function () {
      self.options.wait = false;
    });
  }
  this.env = {};
  this._isDisabled = false;
  this._isEnabled = false;
  this._isEnabling = false;
  this._deps = [];
  this._listeners = {};
  this._factory = factory;
  // Parse the name.
  this._parseName(name);
  // Register self with modus
  modus.env[this.getFullName()] = this;
  this._registerHooks();
};

// Extend the event emitter.
Module.prototype = new EventEmitter();
Module.prototype.constructor = Module;

// Get the name of the module, excluding the namespace.
Module.prototype.getName = function () {
  return this.options.moduleName;
};

// Get the full name of the module, including the namespace.
Module.prototype.getFullName = function () {
  if(!this.options.namespace || !this.options.namespace.length)
    return this.options.moduleName;
  return this.options.namespace + '.' + this.options.moduleName;
};

// Callback that waits for a modules to emit a 'done' or 'error'
// event.
var _onModuleDone = function (dep, next, error) {
  if (moduleExists(dep)) {
    var mod = getModule(dep);
    mod.once('done', function () { nextTick(next) });
    mod.once('error', function () { nextTick(error) });
    mod.enable();
  } else if (getMappedGlobal(dep)) {
    next();
  } else {
    error('Could not load dependency: ' + dep);
  }
};

// Callback to run after the last dependency is loaded.
var _onFinal = function () {
  this._isEnabling = false;
  this._isEnabled = true;
  if(!this.options.compiling) this._runFactory();
  this.emit('enable.after');
  if(!this.options.wait) this.emit('done');
};

// Enable this module.
Module.prototype.enable = function() {
  if (this._isDisabled || this._isEnabling) return;
  if (this._isEnabled) {
    if (!this.options.wait) this.emit('done');
    return;
  }
  // Ensure we don't try to enable this module twice.
  this._isEnabling = true;
  this.emit('enable.before');
  this._investigate();
  var onFinal = bind(_onFinal, this);
  var self = this;
  var loader = modus.Loader.getInstance();
  if (this._deps.length <= 0) return onFinal();
  eachAsync(this._deps, {
    each: function (dep, next, error) {
      if (moduleExists(dep)) {
        _onModuleDone(dep, next, error);
      } else {
        // Try to find the module.
        loader.load(dep, function () {
          _onModuleDone(dep, next, error);
        }, error);
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

// Create an instance of `modus.Import`. Arguments passed here
// will be passed to `modus.Import#imports`.
//
//    foo.imports('Bar', 'Bin').from('app.bar');
//
Module.prototype.imports = function (/*...*/) {
  var imp = new modus.Import(this);
  imp.imports.apply(imp, arguments);
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

// You can add hooks by passing them to the 'options'
// arg in the `modus.Module` constructor. Currently available
// hooks are:
//
//    build: function (raw) <- Used by the builder to allow custom
//                             compiling. Should return a string that will
//                             be used in the final, compiled script.
//
Module.prototype._registerHooks = function () {
  var hooks = this.options.hooks;
  var self = this;
  each(hooks, function (cb, name) {
    self.once(name, cb);
  }); 
};

// RegExp to find imports.
var _findDeps = /\.from\([\'|\"]([\s\S]+?)[\'|\"]\)/g;

// Use RegExp to find any imports this module needs, then add
// them to the imports stack.
Module.prototype._investigate = function () {
  var factory = this._factory.toString();
  var self = this;
  factory.replace(_findDeps, function (matches, dep) {
    // Check if this is using a namespace shortcut
    if (dep.indexOf('.') === 0)
      dep = self.options.namespace + dep;
    self._deps.push(dep);
  });
  this.emit('investigate');
  modus.events.emit('module.investigate', this);
};

// Run the registered factory.
Module.prototype._runFactory = function () {
  if (!this._factory) return;
  var self = this;
  // Bind helpers to the env.
  this.emit('factory.before');
  this.env.imports = bind(this.imports, this);
  // Run the factory.
  if (this._factory.length <= 1) {
    this._factory(this.env);
  } else {
    this._factory(this.env, function (err) {
      if (err)
        self.emit('error', err);
      else
        self.emit('done');
    });
  }
  // Cleanup the env.
  this.once('done', function () {
    delete self.env.imports;
    // delete self.env.emit;
    delete self._factory;
  });
  this.emit('factory.after');
};
