// modus.errors
// ------------
// Handy errors

// Module not found error
modus.ModuleNotFoundError = function (message) {
  this.message = "Cound not find module: " + message;
};
modus.ModuleNotFound.prototype = new Error();
modus.ModuleNotFound.prototype.constructor = modus.ModuleNotFound;