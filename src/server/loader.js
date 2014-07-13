if (isServer()) {

  // Make Modus GLOBAL so it can run in each context.
  // This basically makes Modus a wrapper for 'require'.
  // This isn't a best practice, but Modus modules have to
  // run in both browser and node contexts, so using 
  // 'module.exports' is out.
  GLOBAL.Modus = Modus;

  Modus.load = function (module, next, error) {
    if (module instanceof Array) {
      eachAsync(module, {
        each: function (item, next, error) {
          Modus.load(item, next, error);
        },
        onFinal: next,
        onError: error
      });
      return;
    }
    var src = getMappedPath(module, Modus.config('root'));
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