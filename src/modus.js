// Modus API
// =========
var Modus = function (loader) {
  this._config = {
    'auto enable': true,
    'root path': window ? window.location.origin : ''
  };
  this._modules = {};
  // Default to the ScriptLoader.
  this._loader = loader || new ScriptLoader();
};

inherits(Modus, EventEmitter);

// Modify the configuration of Modus.
Modus.prototype.config = function (key, value) {
  var attrs = key;
  if ('object' != typeof key) {
    attrs = {};
    attrs[key] = value;
  }
  each(attrs, function (value, key) {
    this._config[key] = value;
  }, this);
  return this;
};

Modus.prototype.getConfig = function(key) {
  return this._config[key];
};

// Create a new module.
Modus.prototype.createModule = function (name, factory) {
  if (!factory) {
    factory = name;
    name = null;
  }
  var mod = new Module(name, factory, this);
  console.log('creating', name);
  if (name) this.addModule(mod.getName(), mod);
  if (this._config['auto enable'] && name) 
    mod.enable();
  else
    this._lastModule = mod;
  return mod;
};

Modus.prototype.addModule = function(name, mod) {
  this._modules[name] = mod;
  return this;
};

Modus.prototype.getModule = function (name) {
  return this._modules[name];
};

Modus.prototype.getLastAddedModule = function () {
  var mod = this._lastModule;
  delete this._lastModule;
  return mod;
};

// Using the current 'Loader', require all provided modules
// then run `cb` once all emit a `ready` event.
Modus.prototype.loadModules = function (relPath, paths, cb) {
  console.log('loading', paths);
  if (!cb) {
    cb = paths;
    paths = relPath;
    relPath = this.getConfig('root path');
  }
  if (!relPath) relPath = this.getConfig('root path');
  if (!(paths instanceof Array)) paths = [paths];
  var progress = paths.length;
  var loader = this._loader;
  var _this = this;
  // Keep running until `progress` is 0.
  var onReady = function () {
    progress -= 1;
    console.log(progress);
    if (progress <= 0) cb(null);
  };
  each(paths, function (modPath) {
    var fullPath = path.resolve(relPath, modPath);
    var mod = this.getModule(fullPath);
    if (mod) {
      mod.once('ready', onReady).enable();
    } else {
      loader.load(fullPath, function (err, modName) {
        console.log(err, modName);
        if (err) throw err;
        mod = _this.getModule(fullPath);
        if (!mod) {
          // Handle anon modules.
          mod = _this.getLastAddedModule();
          if (!mod) throw new Error('No module loaded for path ' + fullPath);
          mod.setName(fullPath);
          console.log('anon mod found', mod.getName());
          _this.addModule(mod.getName(), mod);
        }
        mod.once('ready', onReady).enable();
      })
    }
  }, this);
};
