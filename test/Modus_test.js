if (Modus.isServer()) var assert = require('assert');

describe('Modus', function () {

  describe('#Module', function () {

  });

  describe('#Loader', function () {

    describe('#parse', function () {

      it('parses imports', function () {
        var mod = Modus.Loader.parse('import tests.foo;', 'tests.parse.imports');
        expect(mod.factory.toString()).to.equal("function anonymous(__import__, __export__\n/**/) {\nvar foo = __import__('tests.foo');\n\n}");
      });

      it('parses aliased imports', function () {
        var mod = Modus.Loader.parse('import tests.foo as ban;', 'tests.parse.aliasedImports');
        expect(mod.factory.toString()).to.equal("function anonymous(__import__, __export__\n/**/) {\nvar ban = __import__('tests.foo');\n\n}");
      });

      it('parses namespaced imports', function () {
        var mod = Modus.Loader.parse('import .foo;', 'tests.parse.imports');
        expect(mod.factory.toString()).to.equal("function anonymous(__import__, __export__\n/**/) {\nvar foo = __import__('tests.parse.foo');\n\n}");
      });

      it('parses exports', function () {
        var mod = Modus.Loader.parse("var foo='foo';export {foo}", 'tests.parse.exports');
        expect(mod.factory.toString()).to.equal("function anonymous(__import__, __export__\n/**/) {\nvar foo='foo';__export__({foo:foo});\n\n}")
      });

    });

  });

  describe('Stress Test', function () {

    it('works', function (done) {

      Modus.config('root', '');
      Modus.main('fixtures.main', function () {
        // tests
        done();
      }, function (e) {
        throw e;
        done();
      });

    });

  });

});