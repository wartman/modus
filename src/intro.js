//!
// Modus @VERSION
//
// Copyright 2014
// Released under the MIT license
//
// Date: @DATE

(function (factory) {

  var global = {};

  if (typeof module === "object" && typeof module.exports === "object") {
    // For CommonJS environments.
    global = module.exports;
  } else if (typeof window !== "undefined") {
    global = window;
  }
  
  factory(global);

}(function (global, undefined) {

"use strict"

// The main modus namespace
var Modus = global.Modus = {};

// Save the current version.
Modus.VERSION = '@VERSION';