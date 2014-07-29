require('../');
require('../lib/build');

modus.config('root', 'test/');
var build = new modus.Build({
  main: 'fixtures.build.main',
  dest: __dirname + '/tmp/tmp.js'
});