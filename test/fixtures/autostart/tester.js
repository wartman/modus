module(function () {
  this.imports('$').from('jquery');
  this.default = function () {
    $('#target').html('All good');
  };
});