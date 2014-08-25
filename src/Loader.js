// modus.Loader
// ------------
// Handles all loading behind the scenes.
var Loader = modus.Loader = function () {
  this._visited = {};
};

var _catchError = function (e) {
  throw e;
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
Loader.prototype.addVisit = function (src, resolver) {
  this._visited[src] = wait(resolver);
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
  next = next || function () {};
  error = error || _catchError;
  var self = this;
  var promise;
  if (moduleName instanceof Array) {
    promise = whenEach(moduleName, function (item, res, rej) {
      self.load(item).then(res, rej);
    });
  } else if (isServer()) {
    promise = this.loadServer(moduleName);
  } else {
    promise = this.loadClient(moduleName);
  }
  if (next) promise.then(next, error);
  return promise;
};

// Load a module when in a browser context.
Loader.prototype.loadClient = function (moduleName) {
  var self = this;
  var src = getMappedPath(moduleName);
  var visit = this.getVisit(src);
  var script;

  if (!visit) {
    script = this.newScript(moduleName, src);
    visit = this.addVisit(src, function (res, rej) {
      self.insertScript(script, function () {
        // Handle anon modules.
        var mod = modus.getLastModule();
        if (mod) mod.registerModule(moduleName);
        res();
      });
    });
  }

  return visit;
};

// Load a module when in a Nodejs context.
Loader.prototype.loadServer = function (moduleName) {
  var src = getMappedPath(moduleName);
  var visit = this.getVisit(src);

  if (!visit) {
    visit = this.addVisit(src, function (res, rej) {
      try {
        require('./' + src);
        // Handle anon modules.
        var mod = modus.getLastModule();
        if (mod) mod.registerModule(moduleName);
        res();
      } catch(e) {
        rej(e);
      } 
    });
  }
  
  return visit;
};
