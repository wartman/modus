
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
Modus.plugin = function (plugin, request, next, error) {
  if ("function" === typeof request && !(request instanceof Modus.Import)) {
    Modus.plugins[plugin] = request;
    return Modus.plugins[plugin];
  }
  if (!Modus.plugins.hasOwnProperty(plugin)) return false;
  if (request) {
    Modus.plugins[plugin](request, next, error);
  }
  return Modus.plugins[plugin];
};