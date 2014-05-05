
// --------------------
// Modus

// --------------------
// Environment helpers

// 'env' holds modules and namespaces.
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
  var path = {};
  if (isPath(module)) {
    path.obj = getObjectByPath(module, {stripExt:true});
    path.src = module;
  } else {
    path.obj = module;
    path.src = getPathByObject(module) + '.js';
  }
  each(Modus.config('map'), function (maps, pathPattern) {
    each(maps, function (map) {
      if (map.test(path.obj)){
        path.src = pathPattern;
        var matches = map.exec(path.obj);
        // NOTE: The following doesn't take ordering into account.
        // Could pose an issue for paths like: 'foo/*/**.js'
        // Think more on this. Could be fine as is! Not sure what the use cases are like.
        if (matches.length > 2) {
          path.src = path.src
            .replace('**', matches[1].replace(/\./g, '/'))
            .replace('*', matches[2]);
        } else if (matches.length === 2) {
          path.src = path.src.replace('*', matches[1]);
        }
      }
    });
  });
  if (isServer()) {
    // strip '.js' from the path.
    path.src = path.src.replace('.js', '');
  }
  // Add root.
  path.src = root + path.src;
  return path;
}

// --------------------
// Primary API

// (This stuff works, but could use some refactoring)

// Helper to ensure that a module exists for every level
// of a namespace.
var ensureNamespaces = function (name) {
  if (!name.indexOf('.')) return;
  var cur = Modus.env[name];
  var parts = name.split('.');
  if(! (cur instanceof Modus.Module)) {
    cur = new Modus.Module({
      namespace: parts[0],
      name: false
    });
  }
  for (var part; part = parts.shift(); ) {
    if(cur.modules[part] instanceof Modus.Module){
      cur = cur.modules[part];
    } else {
      cur.module(part);
      cur = cur.modules[part];
    }
  }
};

// Namespace factory.
Modus.namespace = function (name, factory) {
  var namespace;
  var modulePath = getModulePath(name);
  if (name.indexOf('.')) {
    var namespace = getObjectByName(modulePath, Modus.env);
    if (!namespace) {
      ensureNamespaces(name);
      var namespace = getObjectByName(modulePath, Modus.env);
    }
  }
  if (! (namespace instanceof Modus.Module)) {
    namespace = new Modus.Module({
      namespace: name,
      name: false
    });
    createObjectByName(modulePath, namespace, Modus.env);
  }
  if (factory) {
    factory(namespace);
    namespace.run();
  }
  return namespace;
};

// Module factory. Will create a new module in the 'root' namespace.
Modus.module = function (name, factory) {
  var namespace = 'root';
  var moduleName = name;
  if (name.indexOf('.') >= 0) {
    namespace = name.substring(0, name.lastIndexOf('.'));
    moduleName = name.substring(name.lastIndexOf('.') + 1);
  }
  return Modus.namespace(namespace).module(moduleName, factory);
};

// Shortcut to export a single value as a module.
Modus.publish = function (name, value) {
  return Modus.module(name, function (module) {
    module.exports(value);
  });
};