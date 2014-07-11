Modus.module('plugins.ajax', function (ajax) {

  // Assume we've already shimmed a copy of jquery:
  ajax.imports('$').from('plugins.jquery');

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


Modus.module('app.foo', function (foo) {

  // Load a file using the new plugin with the 'using' method.
  // You can alias this import like you would with any other.
  foo.imports({'some/data/file.json':'file'}).using('plugins.ajax');

  // foo.file should now be the thing you've imported.
  foo.bar = foo.file;

});