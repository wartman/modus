
// Modus
// =====

// Environment helpers
// -------------------

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
      .replace('*', "([^\\/|^$]+?)") 
      // escapes
      .replace(/\//g, '\\/')
      .replace(/\./g, "\\.")
      .replace(/\$/g, '\\$')
      + '$'
  );
  Modus.options.map[path].push(provides);
};

// Simple error wrapper.
Modus.err = function (error) {
  throw new Error(error);
};

// Get a mapped path
var getMappedPath = Modus.getMappedPath = function (module, root) {
  root = root || Modus.config('root');
  var src = (isPath(module))? module : module.replace(/\./g, '/');
  each(Modus.config('map'), function (maps, pathPattern) {
    each(maps, function (map) {
      module.replace(map, function (matches, many, single) {
        src = pathPattern;
        if (!single) {
          single = many;
          many = false;
        }
        if (many) src = src.replace('**', many);
        if (single) src = src.replace('*', single)
      });
    });
  });
  src = (src.indexOf('.js') < 0 && !isServer())
    ? root + src + '.js'
    : root + src;
  return src;
};

// Make sure all names are correct.
var normalizeModuleName = Modus.normalizeModuleName = function (name) {
  if(isPath(name)) {
    // Strip extensions
    if (name.indexOf('.') > 0) {
      name = name.substring(0, name.indexOf('.'));
    }
    name = name.replace(/\/\\/g, '.');
  }
  return name;
};

// Try to get a global export from a script.
var getMappedGlobal = Modus.getMappedGlobal = function (path) {
  if (Modus.options.map.hasOwnProperty(path)) {
    return root[Modus.options.map[path]] || false;
  }
  return false;
};

// Check if a module has been loaded.
var moduleExists = Modus.moduleExists = function (name) {
  name = normalizeModuleName(name);
  if (Modus.env.hasOwnProperty(name)) return true;
  return false;
};

// Get a module from the env.
var getModule = Modus.getModule = function (name) {
  name = normalizeModuleName(name);
  return Modus.env[name];
}

// Primary API
// -----------

// Module factory.
//
// example:
//    Modus.module('foo.bar', function (bar) {
//      // code
//    })
Modus.module = function (name, factory, options) {
  options = options || {};
  var module = new Modus.Module(name, factory, options);
  module.enable();
  return module;
};

// Syntactic sugar for namespaces.
//
// example:
//    Modus.namespace('Foo', function (Foo) {
//      Foo.module('Bar', function (Bar) {...}); // Defines 'Foo/Bar'
//    });
//    // Or:
//    Modus.namespace('Foo/Bar').module('Bin', function (Bin) { ... });
Modus.namespace = function (namespace, factory) {
  if (factory) return Modus.module(namespace, factory);
  var options = {namespace: namespace};
  return {
    module: function (name, factory) {
      return Modus.module(name, options, factory);
    },
    publish: function (name, value) {
      return Modus.publish(name, options, value);
    }
  };
};

// Shortcut to export a single value as a module.
Modus.publish = function (name, value, options) {
  return Modus.module(name, options, function (module) {
    module.default = value;
  });
};