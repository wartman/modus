// Constants to determine the module's state
var MODULE_STATE = {
  DISABLED: -1,
  PENDING: 0,
  ENABLING: 1,
  READY: 2,
};

// Module
// ======
// The core of modus, `Module` handles dependency management.
var Module = function (name, factory, modusInstance) {
  this._modus = modusInstance || root.modus; // Default to the root instance.
  this._dependencies = [];
  this._exports = {};
  this._env = {};
  this._state = MODULE_STATE.PENDING;
  this
    .setName(name)
    .setFactory(factory);
};

inherits(Module, EventEmitter);

Module.prototype.setName = function (name) {
  if (name) {
    name = path.normalize(name);
    this._name = path.isAbsolute(name) ? name : path.resolve(name); 
  }
  return this;
};

Module.prototype.getName = function() {
  return this._name;
};

Module.prototype.getParentDir = function() {
  return path.resolve(this.getName(), '../');
};

Module.prototype.setFactory = function (factory) {
  this._factory = factory;
  return this;
};

Module.prototype.getFactory = function() {
  return this._factory;
};

Module.prototype.runFactory = function(next) {
  var env = this.createEnv();
  if (this._factory.length === 2) {
    this._factory.call(env, env, next);
  } else {
    this._factory.call(env, env);
    next(null);
  }
  return this;
};

// RegExps to find dependencies.
var _importRegExp = [
  /\.from\(\s*["']([^'"\s]+)["']\s*\)/g,
  /\.imports\(\s*["']([^'"\s]+)["']\s*\)(?!\.from)/g,
  // /require\s*\(\s*["']([^'"\s]+)["']\s*\)/g
];

// RegExp to remove comments, ensuring that we don't try to
// import things that have been commented out.
var _commentRegExp = /(\/\*([\s\S]*?)\*\/|([^:]|^)\/\/(.*)$)/mg;

Module.prototype.findDependencies = function () {
  if (!this._factory) return this._dependencies;
  var _this = this;
  var factory = this._factory.toString().replace(_commentRegExp, '');
  each(_importRegExp, function (re) {
    factory.replace(re, function (matches, dep) {
      _this.addDependency(dep);
    });
  });
  return this._dependencies;
};

Module.prototype.addDependency = function (name) {
  this._dependencies.push(name);
  return this;
};

Module.prototype.getDependencies = function () {
  return this._dependencies;
};

// Get the exports list, cloning it so it won't be
// modified.
Module.prototype.getExports = function () {
  return clone(this._exports);
};

Module.prototype.createEnv = function () {
  this._env.imports = this.createImporter();
  this._env.exports = this.createExporter();
  return this._env;
};

Module.prototype.applyToEnv = function(props, relativePath) {
  var fullPath = path.resolve(this.getParentDir(), relativePath);
  var mod = this._modus.getModule(fullPath);
  if (!mod) return; // Probably mishandling a property request.
  var modExports = mod.getExports();
  var _this = this;
  if (props instanceof Array) {
    each(props, function (prop) {
      _this._env[prop] = modExports[prop];
    });
  } else {
    _this._env[props] = modExports['default'] || modExports;
  }
};

// Create an `imports` function for use inside the module environment.
Module.prototype.createImporter = function () {
  var _this = this;
  return function (/* ...args */) {
    var props = Array.prototype.slice.call(arguments, 0);
    var alias, retValue;
    if (props[0] instanceof Array) props = props[0];
    if (props.length === 1) {
      // Auto-create the name.
      var modPath = props[0];
      alias = modPath.split('/').pop();
      retValue = _this._env[alias];
      _this.applyToEnv(alias, modPath);
    }

    return {

      from: function (modPath) {
        if (alias) _this._env[alias] = retValue;
        console.log('Loading', modPath);
        _this.applyToEnv(props, modPath);
      },

      as: function (newAlias) {
        if (alias) _this._env[alias] = retValue;
        _this.applyToEnv(newAlias, modPath);
      }

    }
  }
};

Module.prototype.createExporter = function () {
  var _this = this;
  return function (name, target) {

    if (arguments.length === 1) {
      _this._exports['default'] = arguments[0]
    } else {
      _this._exports[name] = target;
    }

    return {
      as: function (name) {
        _this._exports[name] = target
      }
    }
  }
};

// Run the factory
Module.prototype.enable = function () {
  if (this._state === MODULE_STATE.READY) {
    this.emit('ready');
    return;
  }
  if (this._state !== MODULE_STATE.PENDING) return;
  var _this = this;
  var onReady = function (err) {
    if (err) {
      _this._state = MODULE_STATE.DISABLED;
      _this.emit('disabled');
      return;
    }
    _this._state = MODULE_STATE.READY;
    _this.emit('ready');
  }
  var deps = this.findDependencies();
  if (!deps.length) {
    this._state = MODULE_STATE.ENABLING;
    this.runFactory(onReady);
    return;
  } else {
    this._state = MODULE_STATE.ENABLING;
    this._modus.loadModules(this.getParentDir(), deps, function (err) {
      if (!err) _this.runFactory(onReady);
    });
  }
};
