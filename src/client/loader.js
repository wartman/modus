if (isClient()) {

  // A collection of previously visited scripts.
  // Used to ensure that scripts are only requested once.
  var visited = {};

  // Test for the load event the current browser supports.
  var onLoadEvent = (function (){
    var testNode = document.createElement('script')
    if (testNode.attachEvent){
      return function(script, wait){
        script.attachEvent('onreadystatechange', function () {
          if(/complete|loaded/.test(script.readyState)){
            wait.resolve();
          }
        });
        // Can't handle errors with old browsers.
      }
    }
    return function(script, wait){
      script.addEventListener('load', function (e) {
        wait.resolve();
      }, false);
      script.addEventListener('error', function (e) {
        wait.reject();
      }, false);
    }
  })();

  // Load a script. This can only be used for JS files, 
  // if you want to load a text file or do some other AJAX
  // request you'll need to write a plugin (see the 'examples'
  // folder for inspiration).
  Modus.load = function (module, next, error) {

    if (module instanceof Array) {
      eachThen(module, function (item, next, error) {
        Modus.load(item, next, error);
      }, next, error);
      return;
    }

    var src = getMappedPath(module, Modus.config('root'));

    // If the script is already loading, add the callback
    // to the queue and don't load it again.
    if (visited.hasOwnProperty(src)) {
      visited[src].done(next, error);
      return;
    }

    // Set up script
    var script = document.createElement('script');
    script.type = 'text/javascript';
    script.charset = 'utf-8';
    script.async = true;
    script.setAttribute('data-module', module);
    script.src = src;

    // Add to DOM
    var entry = document.getElementsByTagName('script')[0];
    entry.parentNode.insertBefore(script, entry);

    // Add event listener
    visited[src] = new Wait();
    visited[src].done(next, error);
    onLoadEvent(script, visited[src]);
  };

}