// Modus
// =====
//
// The primary API

// Create the main namespace.
var Modus = root.Modus = {};

Modus.env = {};

// Config options for Modus.
Modus.options = {
  root: '',
  map: {}
};

var getMappedPath = Modus.getMappedPath = function(path) {
  // more: gotta handle path maps.
  path = Modus.config('root') + path.replace(/\./g, '/') + '.js';
  return path;
};

// Set or get a Modus config option.
Modus.config = function (key, val) {
  if ( "object" === typeof key ) {
    for ( var item in key ) {
      Modus.config(item, key[item]);
    }
    return;
  }
  if(arguments.length < 2){
    return ("undefined" === typeof Modus.options[key])? false : Modus.options[key];
  }
  if ( 'map' === key ) {
    return Modus.map(val);
  }
  Modus.options[key] = val;
  return Modus.options[key];
};

// Import a module from the env.
Modus.imports = function (name) {
  if (!Modus.env.hasOwnProperty(name)) {
    throw new Error('Module was not found: ' + name);
    return {};
  }
  return Modus.env[name].env;
};

// Run the main module.
Modus.main = function (name, next, error) {
  error = error || function (e) {
    throw e;
  }
  Modus.Loader.load(name).done(function (mod) {
    mod.enable();
    mod.done(next, error)
  }, error);
};

// Figure out what we're running Modus in.
var checkEnv = function () {
  if (typeof module === "object" && module.exports) {
    Modus.config('environment', 'node');
  } else {
    Modus.config('environment', 'client');
  }
};

// Are we running Modus on a server?
var isServer = Modus.isServer = function () {
  if (!Modus.config('environment')) checkEnv();
  return Modus.config('environment') === 'node'
    || Modus.config('environment') === 'server';
};

// Are we running Modus on a client?
var isClient = Modus.isClient =  function () {
  if (!Modus.config('environment')) checkEnv();
  return Modus.config('environment') != 'node'
    && Modus.config('environment') != 'server';
};