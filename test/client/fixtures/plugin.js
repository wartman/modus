Modus.namespace('fixtures').module('plugin', function (plugin) {
  
  plugin.body(function (plugin) {
    Modus.plugin('fixtures.plugin', function (module, next, error) {
      Modus.publish(module, 'plugin done');
      next();
    });
  });

});