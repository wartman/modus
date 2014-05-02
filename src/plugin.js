
// --------------------
// Modus plugin

// Registered plugins.
Modus.plugins = {};

// Visted items
var pluginsVisited = {};

// Define or get a plugin.
//
// example:
//    // Define a plugin
//    Modus.plugin('foo', function(request, nexy, error) {
//      // code
//      // Always call next or error, or Modus will stall.
//      next();
//    });
//    // getting a plugin:
//    var plugin = Modus.plugin('foo');
//    plugin('foo.bar', next, error);
//    // Shortcut to run a plugin:
//    Modus.plugin('foo', 'foo.bar', next, error);
//    // Importing using a plugin:
//    module.imports('foo.bar').using('foo');
//
// You can wrap a plugin in a Modus Module and import it
// simply by passing the plugin name to 'imports([item]).using([plugin])'
//
// example:
//
//    // In 'plugins/foo.js':
//    Modus.namespace('plugins').module('foo', function(foo) {
//      foo.body(function (foo) {
//        // Note that you don't export anything: just define a
//        // plugin here.
//        // IMPORTANT: The plugin name MUST BE the same as the
//        // wrapping module or it will not work.
//        Modus('plugins.foo', function(request, next, error) {
//          // code
//          next(); 
//        });
//    });
//
//    // Using the plugin with 'imports':
//    // ... module code ...
//    module.imports('foo.bin').using('plugins.foo');
//
// Note that Modus wraps your plugins in a Wait for you, meaning
// your plugins should run only one time for each request.
Modus.plugin = function (plugin, request, next, error) {
  if ("function" === typeof request) {
    Modus.plugins[plugin] = request;
    return Modus.plugins[plugin];
  }
  if (!Modus.plugins.hasOwnProperty(plugin)) return false;
  var runner = function (request, next, error) {
    if (pluginsVisited[request]) {
      pluginsVisited[request].done(next, error);
      return;
    }
    var wait = pluginsVisited[request] = new Wait();
    wait.done(next, error);
    Modus.plugins[plugin](request, function (value) {
      wait.resolve(value);
    }, function (reason) {
      wait.reject(reason);
    });
  };
  if (request) {
    runner(request, next, error);
  }
  return runner;
};