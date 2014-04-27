(function () {
/* namespaces */
var app = this.app = {};
var fixtures = this.fixtures = {};
fixtures.stress = {};
var foo = this.foo = {};
fixtures.file = {};
fixtures.stress.item = {};

/* modules */
/*!
 * This is an example of a license header.
 *
 * Copyright would go here.
 * Released under the MIT license
 */

(function(global){
  global.shim = "shimmed";
})(this);
fixtures.file.txt = (function anonymous() {
  return 'loaded'
})();
foo.mapped = (function () {
  return "mapped";
})();
fixtures.stress.three = (function (){
    return {
      Three: "three"
    };
  })();
fixtures.stress.two = (function (){
    return {
      Two: "two"
    };
  })();
fixtures.stress.item.foo = (function (){
  return "Foo";
})();
fixtures.stress.one = (function (){
    return {
      One: "one",
      Foo: fixtures.stress.item.foo
    };
  })();
app.main = (function (){
    return "the main file";
  })();

}).call(this);