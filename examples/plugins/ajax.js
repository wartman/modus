Modus.namespace('plugins').module('ajax', function (ajax) {

  ajax.imports('bower_components/jquery/dist/jquery.min.js').global('$');

  ajax.body(function (ajax) {
    Modus.plugin('plugins.ajax', function (request, next, error) {
      $.ajax({
        // When importing this module, you'll pass a path, not
        // an object name.
        url: Modus.config('root') + request
        // Likely you'll want to include more configuration then this!
      }).done(function (data) {
        // Get rid of the extension and turn this into an object name.
        // If Modus.Import gets a path, it'll convert it into a module name
        // and attempt to find a module first, so naming the module
        // this way will prevent the plugin from running more then
        // once per file.
        var module = request.substring(0, request.lastIndexOf('.')).replace(/\//g, '.');
        // Use 'Modus.publish' to export the data to a Modus.module
        // You'll need to do this for the plugin to work.
        Modus.publish(module, data);
        // Run the next item.
        next();
      }, error);
    });
  });

});