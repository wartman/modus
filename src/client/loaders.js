if (Modus.isClient()) {

  var visited = {};

  var onLoadEvent = (function (){
    var testNode = document.createElement('script')
    if (testNode.attachEvent){
      return function(node, wait){
        var self = this;
        this.done(next, err);
        node.attachEvent('onreadystatechange', function () {
          if(node.readyState === 'complete'){
            wait.resolve();
          }
        });
        // Can't handle errors with old browsers.
      }
    }
    return function(node, wait){
      node.addEventListener('load', function (e) {
        wait.resolve();
      }, false);
      node.addEventListener('error', function (e) {
        wait.reject();
      }, false);
    }
  })();

  Modus.plugins.script = new Modus.Loader(function (module, cb) {
    var src = Modus.config('root') + ( this._getMappedPath(module)
      || module.replace(/\./g, '/') + '.js' );
    var error = function (e) { cb(e); };

    if (visited.hasOwnProperty(src)) {
      visited[src].done(cb, error);
      return;
    }

    var node = document.createElement('script')
      , head = document.getElementsByTagName('head')[0];

    node.type = 'text/javascript';
    node.charset = 'utf-8';
    node.async = true;
    node.setAttribute('data-module', module);

    visited[src] = new Wait();
    visited[src].done(cb, error);

    onLoadEvent(node, visited[src]);

    node.src = src;
    head.appendChild(node);
  });

  Modus.plugins.file = new Modus.Loader(function(file, cb) {

    var src = Modus.config('root') + ( this._getMappedPath(module)
      || module.replace(/\./g, '/') + '.' + this.options.type );
    var error = function (e) { cb(e); };
    var next = function (data) {
      Modus.module(file, function (file) {
        file.exports('contents', function (contents) {
          contents = data;
        });
        file.wait.done(next, error);
      });
    };

    if(visited.hasOwnProperty(src)){
      visited[src].done(next, error);
      return;
    }

    visited[src] = new Wait();
    visited[src].done(next, error);

    if (global.XMLHttpRequest) {
      var request = new XMLHttpRequest();
    } else { // code for IE6, IE5
      var request = new ActiveXObject("Microsoft.XMLHTTP");
    }

    request.onreadystatechange = function(){
      if(4 === this.readyState){
        if(200 === this.status){
          visited[src].resolve(this.responseText);
        } else {
          visited[src].reject(this.status);
        }
      }
    }

    request.open('GET', src, true);
    request.send();
  });

}