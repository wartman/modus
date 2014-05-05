Modus.namespace('plugins').module('ajax', function (ajax) {

  ajax.imports('bower_components/jquery/dist/jquery.min.js').global('$');

  ajax.body(function (ajax) {
    Modus.plugin('plugins.ajax', function (req, next, error) {
      // 'req' is an instance of 'Modus.Import'. We can use it 
      // to get the current request:
      var request = req.getRequest();
      // This returns an object with the properties 'obj' and 'src'.
      // 'src' is a path we can use to with http, while 'obj' is
      // useable as a Modus Module name.
      $.ajax({
        url: request.src
        // Likely you'll want to include more configuration then this!
      }).done(function (data) {
        // Make the imported data available in Modus by 'publishing' it.
        // We use the 'obj' property here to name it.
        Modus.publish(request.obj, data);
        // Run the next item.
        next();
      }, error);
    });
  });

});


Modus.namespace('app').module('foo', function (foo) {

  // Load a file using the new plugin with the 'using' method.
  // You can alias this import like you would with any other.
  // If you don't alias this import, you could access it
  // as 'foo.some.data.file'.
  foo.imports('some/data/file.json').using('plugins.ajax').as('file');

  foo.exports(function (foo) {
    // do something with 'foo.file'
    return foo.file;
  });

});