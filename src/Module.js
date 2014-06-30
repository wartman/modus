
// Modus.Module
// ------------
// The core of Modus.

var Module = Modus.Module = function (name, options, factory) {
  this.options = defaults({
    namespace: false,
    moduleName: null,
    throwErrors: true,
    wait: false,
    hooks: {}
  }, options);
  this.env = {};
  this._isDisabled = false;
  this._isEnabled = false;
  this._isEnabling = false;
  this._deps = [];
  this._listeners = {};
  this._factory = factory;
  // Parse the name.
  this._parseName(name);
  // Register self with Modus
  Modus.env[this.getFullName()] = this;
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

// Helper that waits for a modules to emit a 'done' or 'error'
// event.
var _onModuleDone = function (dep, next, error) {
  if (moduleExists(dep)) {
    var mod = getModule(dep);
    mod.once('done', next);
    mod.once('error', error);
    mod.enable();
  } else if (getMappedGlobal(dep)) {
    next();
  } else {
    error('Could not load dependency: ' + dep);
  }
};

// Enable this module.
Module.prototype.enable = function() {
  if (this._isDisabled || this._isEnabling) return;
  if (this._isEnabled) {
    this.emit('done');
    return;
  }
  // Ensure we don't try to enable this module twice.
  this._isEnabling = true;
  this.emit('enable.before');
  this._investigate();
  var onFinal = bind(function () {
    this._isEnabling = false;
    this._isEnabled = true;
    if(!this.options.wait) this._runFactory();
    this.emit('enable.after');
    this.emit('done');
  }, this);
  var self = this;
  if (this._deps.length <= 0) return onFinal();
  eachAsync(this._deps, {
    each: function (dep, next, error) {
      if (moduleExists(dep)) {
        _onModuleDone(dep, next, error);
      } else if (getMappedGlobal(dep)) {
        next();
      } else {
        // Try to find the module.
        Modus.load(dep, function () {
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

Module.prototype.disable = function (reason) {
  this._isDisabled = true;
  this.emit('error');
  if (this.options.throwErrors && reason instanceof Error) {
    throw reason;
  } else if (this.options.throwErrors) {
    throw new Error(reason);
  }
};

// Import dependencies.
Module.prototype.imports = function (/*...*/) {
  var imp = new Modus.Import(this);
  imp.imports.apply(imp, arguments);
  return imp;
};

// Get the namespace from the passed name.
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

Module.prototype._registerHooks = function () {
  var hooks = this.options.hooks;
  var self = this;
  each(hooks, function (cb, name) {
    self.once(name, cb);
  });
};

var _findDeps = /\.from\([\'|\"]([\s\S]+?)[\'|\"]\)/g;

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
};

Module.prototype._runFactory = function () {
  if (!this._factory) return;
  // Bind helpers to the env.
  this.emit('factory.before');
  this.env.imports = bind(this.imports, this);
  if (this.options.wait) this.env.emit = bind(this.emit, this);
  this._factory(this.env);
  // Cleanup the env.
  delete this.env.imports;
  delete this.env.emit;
  delete this._factory;
  this.emit('factory.after');
};
