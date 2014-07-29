// modus
// =====

// Environment helpers
// -------------------

// 'env' holds modules.
modus.env = {};

// Config options for modus.
modus.options = {
  root: '',
  map: {}
};

// Set or get a modus config option.
modus.config = function (key, val) {
  if ( "object" === typeof key ) {
    for ( var item in key ) {
      modus.config(item, key[item]);
    }
    return;
  }
  if(arguments.length < 2){
    return ("undefined" === typeof modus.options[key])? false : modus.options[key];
  }
  if ( 'map' === key ) {
    return modus.map(val);
  }
  modus.options[key] = val;
  return modus.options[key];
};

// Figure out what we're running modus in.
var checkEnv = function () {
  if (typeof module === "object" && module.exports) {
    modus.config('environment', 'node');
  } else {
    modus.config('environment', 'client');
  }
};

// Are we running modus on a server?
var isServer = modus.isServer = function () {
  if (!modus.config('environment')) checkEnv();
  return modus.config('environment') === 'node'
    || modus.config('environment') === 'server';
};

// Are we running modus on a client?
var isClient = modus.isClient =  function () {
  if (!modus.config('environment')) checkEnv();
  return modus.config('environment') != 'node'
    && modus.config('environment') != 'server';
};

// Map modules to a given path.
//
// example:
//    modus.map('lib/foo.js', ['foo.bar', 'foo.bin']);
//    // You can also map a file to a base namespace
//    modus.map('lib/foo.js', ['foo.*']);
//    // The following will now load lib/foo.js:
//    module.import('foo.bar');
//
modus.map = function (path, provides) {
  // TODO: This method needs some love.
  if ("object" === typeof path){
    for ( var item in path ) {
      modus.map(item, path[item]);
    }
    return;
  }
  if (!modus.options.map[path]) {
    modus.options.map[path] = [];
  }
  if (provides instanceof Array) {
    each(provides, function (item) {
      modus.map(path, item);
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
  modus.options.map[path].push(provides);
};

// Simple error wrapper.
modus.err = function (error) {
  throw new Error(error);
};

// Get a mapped path
var getMappedPath = modus.getMappedPath = function (module, root) {
  root = root || modus.config('root');
  var src = (isPath(module))? module : module.replace(/\./g, '/');
  each(modus.config('map'), function (maps, pathPattern) {
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
var normalizeModuleName = modus.normalizeModuleName = function (name) {
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
var getMappedGlobal = modus.getMappedGlobal = function (path) {
  if (modus.options.map.hasOwnProperty(path)) {
    return root[modus.options.map[path]] || false;
  }
  return false;
};

// Check if a module has been loaded.
var moduleExists = modus.moduleExists = function (name) {
  name = normalizeModuleName(name);
  if (modus.env.hasOwnProperty(name)) return true;
  return false;
};

// Get a module from the env.
var getModule = modus.getModule = function (name) {
  name = normalizeModuleName(name);
  return modus.env[name];
}

// Primary API
// -----------

// Module factory.
//
// example:
//    modus.module('foo.bar', function (bar) {
//      // code
//    });
//
modus.module = function (name, factory, options) {
  options = options || {};
  var module = new modus.Module(name, factory, options);
  nextTick(bind(module.enable, module)  );
  return module;
};

// Syntactic sugar for namespaces.
//
// example:
//    modus.namespace('Foo', function (Foo) {
//      Foo.module('Bar', function (Bar) {...}); // Defines 'Foo/Bar'
//    });
//    // Or:
//    modus.namespace('Foo/Bar').module('Bin', function (Bin) { ... });
//
modus.namespace = function (namespace, factory) {
  if (factory) return modus.module(namespace, factory);
  var options = {namespace: namespace};
  return {
    module: function (name, factory) {
      return modus.module(name, options, factory);
    },
    publish: function (name, value) {
      return modus.publish(name, options, value);
    }
  };
};

// Shortcut to export a single value as a module.
modus.publish = function (name, value, options) {
  return modus.module(name, options, function (module) {
    module.default = value;
  });
};
