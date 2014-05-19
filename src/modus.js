
// --------------------
// Modus

// --------------------
// Environment helpers

// 'env' holds modules.
Modus.env = {};

// Config options for Modus.
Modus.options = {
  root: '',
  map: {}
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

// Map modules to a given path.
//
// example:
//    Modus.map('lib/foo.js', ['foo.bar', 'foo.bin']);
//    // You can also map a file to a base namespace
//    Modus.map('lib/foo.js', ['foo.*']);
//    // The following will now load lib/foo.js:
//    module.import('foo.bar');
//
Modus.map = function (path, provides) {
  // TODO: This method needs some love.
  if ("object" === typeof path){
    for ( var item in path ) {
      Modus.map(item, path[item]);
    }
    return;
  }
  if (!Modus.options.map[path]) {
    Modus.options.map[path] = [];
  }
  if (provides instanceof Array) {
    each(provides, function (item) {
      Modus.map(path, item);
    });
    return;
  }
  provides = new RegExp ( 
    provides
      // ** matches any number of segments (will only use the first)
      .replace('**', "([\\s\\S]+?)")
      // * matches a single segment (will only use the first)
      .replace('*', "([^\\.|^$]+?)") 
      // escapes
      .replace(/\./g, "\\.")
      .replace(/\$/g, '\\$')
      + '$'
  );
  Modus.options.map[path].push(provides);
};

// Get a mapped path
var getMappedPath = Modus.getMappedPath = function (module, root) {
  root = root || Modus.config('root');
  var src = module;
  each(Modus.config('map'), function (maps, pathPattern) {
    each(maps, function (map) {
      if (map.test(module)){
        src = pathPattern;
        var matches = map.exec(module);
        if (matches.length > 2) {
          src = src
            .replace('**', matches[1])
            .replace('*', matches[2]);
        } else if (matches.length === 2) {
          src = src.replace('*', matches[1]);
        }
      }
    });
  });
  if (src.indexOf('.js') < 0 && !isServer()) {
    src += '.js';
  }
  // Add root.
  src = root + src;
  return src;
};

// Make sure all names are correct.
var normalizeModuleName = Modus.normalizeModuleName = function (name) {
  // Strip extensions
  if (name.indexOf('.') > 0) {
    name = name.substring(0, name.indexOf('.'));
  }
  // More???
  return name;
};

// Check if a module has been loaded.
var moduleExists = Modus.moduleExists = function (name) {
  console.log(name);
  name = normalizeModuleName(name);
  if (Modus.env.hasOwnProperty(name)) return true;
  return false;
};

// --------------------
// Primary API

// Module factory.
Modus.module = function (name, factory) {
  var module = new Modus.Module(name, {});
  if (factory) {
    factory(module);
    module.run();
  }
  return module;
};

// Shortcut to export a single value as a module.
Modus.publish = function (name, value) {
  return Modus.module(name, function (module) {
    module.exports(value);
  });
};