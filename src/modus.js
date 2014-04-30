
// --------------------
// Modus

// 'env' holds the actual modules and namespaces.
Modus.env = {};

// 'managers' holds the classes used to manage namespaces.
Modus.managers = {};

// 'shims' holds references to shimmed modules.
Modus.shims = {};

// Holds various loader plugins.
Modus.plugins = {};

// Config options for Modus.
Modus.options = {
  root: '',
  map: {},
  shim: {}
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
  } else if ( 'shim' === key ) {
    return Modus.shim(val);
  }
  Modus.options[key] = val;
  return Modus.options[key];
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

// Shim a module. This will work with any module that returns
// something in the global scope.
Modus.shim = function (name, options) {
  if ("object" === typeof name){
    for ( var item in name ) {
      Modus.shim(item, name[item]);
    }
    return;
  }
  options = options || {}; 
  if (options.map) {
    Modus.map(options.map, name);
  }
  Modus.shims[name] = options;
};

// Aliases to environment helpers.
Modus.isServer = isServer;
Modus.isClient = isClient;

// Namespace factory.
Modus.namespace = function (name, factory) {
  var namespace;
  if (getObjectByName(name, Modus.managers)) {
    namespace = getObjectByName(name, Modus.managers);
  } else {
    namespace = new Modus.Namespace({
      namespaceName: name
    });
    createObjectByName(name, namespace, Modus.managers);
  }
  if (factory) {
    factory(namespace);
    namespace.run();
  }
  return namespace;
};

// Module factory. Will create a new module in the 'root' namespace.
Modus.module = function (name, factory) {
  return Modus.namespace('root').module(name, factory);
};

// Load a request.
Modus.load = function (plugin, module, next) {
  if (!Modus.plugins.hasOwnProperty(plugin)) {
    next(Error('Plugin does not exist: ' + plugin));
    return;
  }
  Modus.plugins[plugin].run(module, next);
};