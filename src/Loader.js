// modus.Loader
// ------------
// Handles all loading behind the scenes.
var Loader = modus.Loader = function () {
  this._visited = {};
};

// Used to store a singleton of Loader.
var _loaderInstance = null;

// Get the Loader singleton.
Loader.getInstance = function () {
  if (!_loaderInstance)
    _loaderInstance = new Loader();
  return _loaderInstance;
};

// Get a visited src, if one exists.
Loader.prototype.getVisit = function (src) {
  return this._visited[src] || false;
};

// Add a new visit.
Loader.prototype.addVisit = function (src) {
  this._visited[src] = new EventEmitter();
  return this._visited[src];
};

// Create a script node.
Loader.prototype.newScript = function (moduleName, src) {
  var script = document.createElement("script");
  script.type = 'text/javascript';
  script.charset = 'utf-8';
  script.async = true;
  script.setAttribute('data-module', moduleName);
  script.src = src;
  return script;
};

// Instert a script node into the DOM, and add an event listener.
Loader.prototype.insertScript = function (script, next) {
  var head = document.getElementsByTagName("head")[0] || document.documentElement;
  head.insertBefore(script, head.firstChild).parentNode;
  if (next) {
    // If a callback is provided, use an event listener.
    var done = false;
    script.onload = script.onreadystatechange = function() {
      if (!done && (!this.readyState ||
          this.readyState === "loaded" || this.readyState === "complete") ) {
        done = true;
        next();
        // Handle memory leak in IE
        script.onload = script.onreadystatechange = null;
      }
    };
  }
};

// Start loading a module. This method will detect the environment
// (server or client) and act appropriately.
Loader.prototype.load = function (moduleName, next, error) {
  var self = this;
  if (moduleName instanceof Array) {
    eachAsync(moduleName, {
      each: function (item, next, error) {
        self.load(item, next, error);
      },
      onFinal: next,
      onError: error
    });
    return;
  }
  if (isClient())
    this.loadClient(moduleName, next, error);
  else
    this.loadServer(moduleName, next, error);
}

// Load a module when in a browser context.
Loader.prototype.loadClient = function (moduleName, next, error) {
  var src = getMappedPath(moduleName, modus.config('root'));
  var visit = this.getVisit(src);
  var script;

  if (visit) {
    visit.once('done', next);
    visit.once('error', error);
    return;
  }

  script = this.newScript(moduleName, src);
  visit = this.addVisit(src);
  visit.once('done', next);
  visit.once('error', error);

  this.insertScript(script, function () {
    visit.emit('done');
  });
};

// Load a module when in a Nodejs context.
Loader.prototype.loadServer = function (moduleName, next, error) {
  try {
    require(src);
    nextTick(function () {
      next();
    });
  } catch(e) {
    nextTick(function () {
      error(e);
    });
  } 
};
