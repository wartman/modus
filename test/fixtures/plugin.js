Modus.module('fixtures/plugin', function (plugin) {
  
  plugin.body(function (plugin) {
    Modus.plugin('fixtures/plugin', function (req, next, error) {
      Modus.publish(req.getNormalizedRequest(), 'plugin done');
      next();
    });
  });

});