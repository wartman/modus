// Modus.Module
// ============

// Module states
var MODULE_STATE = {
  PENDING: 0,
  WORKING: 1,
  LOADED: 2,
  READY: 3,
  ENABLED: 4,
  DISABLED: -1
};

// The core of Modus. Modules are where all dependency
// management happens.
var Module = Modus.Module = function (name) {
  var self = this;
  this._state = MODULE_STATE.PENDING;
  this.imports = [];
  this.env = {};
  this.factory = function () {};
  this._name = "";
  this._wait = new Wait();
  // Register the Module
  if (name) this.defines(name);
};

// Register the Module. If a name is not provided
// to the constructor, this method MUST be called somewhere
// in the package definition.
Module.prototype.defines = function (name) {
  // Set this Module's name.
  this._name = name;
  // Register in the Modus.env
  Modus.env[name] = this;
};

// Run the package, gathering all imports and defining
// all exports.
Module.prototype.enable = function () {
  if (this.isDisabled() || this.isWorking()) return;
  if (this.isPending()) {
    this._importDependencies();
  } else if (this.isEnabled()) {
    this._wait.resolve();
  }
};

// Disable this package
Module.prototype.disable = function (reason) {
  this.isDisabled(true);
  this._wait.reject(reason);
};

// Gather all imports.
Module.prototype._importDependencies = function () {
  if (this.isDisabled() || this.isWorking()) return;
  var queue = [];
  var self = this;
  each(this.imports, function (item) {
    if (item.imported === true || Modus.env.hasOwnProperty(item.id)) return;
    item.imported = true;
    queue.push(item);
  });
  if (queue.length > 0) {
    this.isWorking(true);
    eachWait(queue, function getImports (item, next, error) {
      // Wait for a package to load its deps before continuing,
      // and ensure that an object is defined before continuing.
      var check = function () {
        var name = item.id;
        // if (isPath(name)) name = getObjectByPath(name, {stripExt:true});
        if (Modus.env.hasOwnProperty(name)) {
          Modus.env[name].done(next, error);
          Modus.env[name].enable();
        // } else {
        //   if (getObjectByName(name)) {
        //     next();
        //   } else {
        //     error('A dependency was not loaded: ' + name);
        //   }
        }
      };
      // Load the item, either with a plugin or the default method.
      // if (item.plugin) {
      //   if ('function' === typeof item.plugin) {
      //     item.plugin(item.id, check, error);
      //   } else {
      //     Modus.plugin(item.plugin, item.id, check, error);
      //   }
      // } else {
        Modus.Loader.load(item.id, check, error);
      // }
    })
    .done(function () {
      self.isLoaded(true);
      self._define();
    }, function (reason) {
      self.disable(reason);
    });
  } else {
    this.isLoaded(true);
    self._define();
  }
};

Module.prototype.exports = function (items) {
  this.env = extend(this.env, items);
};

Module.prototype.done = function (next, error) {
  this._wait.done(next, error);
};

Module.prototype._define = function () {
  this.factory(Modus.imports, bind(this.exports, this));
  this.isEnabled(true);
  // Set this as done!
  this._wait.resolve();
};

// State methods
each(['Enabled', 'Ready', 'Working', 'Loaded', 'Pending', 'Disabled'], function (state) {
  var modState = MODULE_STATE[state.toUpperCase()];
  Module.prototype['is' + state] = function(set){
    if(set) this._state = modState;
    return this._state === modState;
  } 
});