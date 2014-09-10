modus.main({
  maps: {
    'jquery': '../../../node_modules/jquery/dist/jquery.min'
  }
}, function () {
  this.imports('.tester').as('test');
  this.test();
});