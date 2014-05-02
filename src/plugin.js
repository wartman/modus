
// --------------------
// Modus plugin

Modus.plugins = {};

Modus.plugin = function (plugin, request, next, error) {
  if ("function" === typeof request) {
    Modus.plugins[plugin] = request;
    return Modus.plugins[plugin];
  }
  if (!Modus.plugins.hasOwnProperty(plugin)) return false;
  if (request) Modus.plugins[plugin](request, next, error);
  return Modus.plugins[plugin];
};