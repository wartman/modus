// Modus.runtime
// =============
// A minimal implementation of Modus for compiled projects.

var Modus = {};

Modus.env = {};

// Define a module.
Modus.module = function (name, factory) {
  var mod = Modus.env[name] = {
    env: {},
    ran: false
  };
  var exports = function (items) {
    for (var key in items) {
      mod.env[key] = items[key];
    }
  };
  mod.enable = function () {
    factory(Modus.imports, exports);
    mod.ran = true;
  }
};

// Import a module from the env.
Modus.imports = function (name) {
  if (!Modus.env.hasOwnProperty(name)) return {};
  var mod = Modus.env[name];
  if (!mod.ran) mod.enable();
  return mod.env;
};

// Start the main module
Modus.main = function (name) {
  Modus.env[name].enable();
};