/*!
  Modus @VERSION
  
  Copyright 2014
  Released under the MIT license
  
  Date: @DATE
*/

(function (factory) {

  if ('undefined' !== typeof __root) {
    factory(__root);
  } else if (typeof module === "object" && typeof module.exports === "object") {
    // For CommonJS environments.
    factory(global);
    module.exports = global.modus;
  } else if ('undefined' !== typeof window) {
    factory(window);
  }

}(function (root, undefined) {

"use strict"

// The main modus namespace
var modus = {};

// Save the current version.
modus.VERSION = '@VERSION';

// Save the previous value of root.modus
var _previousModus = root.modus;

// export modus
root.modus = modus;
