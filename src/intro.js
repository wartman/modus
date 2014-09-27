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
    factory(exports);
    module.exports = exports.modus;
  } else if ('undefined' !== typeof window) {
    factory(window);
  }

}(function (root, undefined) {

"use strict"
