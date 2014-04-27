modus.config({
  root: 'test/',
  main: 'app.main',
  shim: {
    'shim': {
      map: 'fixtures/shim/no-deps.js',
      imports: false
    }
  },
  map: {
    'fixtures/map/mapped.js': ['foo.*']
  }
});

modus('app.main', function (imports, exports) {
  imports('fixtures.stress.one');
  imports('fixtures.stress.two');
  imports('fixtures.stress.three');
  imports('foo.mapped');
  imports('txt!fixtures.file.txt');
  imports('shim');
  exports(function(){
    return "the main file";
  });
});