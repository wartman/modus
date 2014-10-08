module(function () {
  this.imports('jquery');
  var self = this;
  this.default = function () {
    self.jquery('#target').html('All good');
  };
});