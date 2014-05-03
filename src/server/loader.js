if (isServer()) {

  // Make Modus GLOBAL so it can run in each context.
  // This basically makes Modus a wrapper for 'require'.
  // This isn't a best practice, but Modus modules have to
  // run in both browser and node contexts, so using 
  // 'module.exports' is out.
  GLOBAL.Modus = Modus;

  Modus.load = function (module, next, error) {
    var path = getMappedPath(module, Modus.config('root'));
    var src = path.src;
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

}