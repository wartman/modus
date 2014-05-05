Modus.namespace('fixtures').module('plugin', function (plugin) {
  
  plugin.body(function (plugin) {
    Modus.plugin('fixtures.plugin', function (req, next, error) {
      Modus.publish(req.getRequest().obj, 'plugin done');
      next();
    });
  });

});