require('../');
require('../lib/build');

Modus.config('root', 'test/');
var build = new Modus.Build({
  main: 'fixtures.build.main',
  dest: __dirname + '/tmp/tmp.js'
});