modus.config({
  maps: {
    'jquery': '../../../node_modules/jquery/dist/jquery.min'
  }
});

mod('main', function () {
  this.imports('test').from('.tester');
  this.test();
});