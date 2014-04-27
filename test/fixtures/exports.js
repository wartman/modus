modus('fixtures.exports')
  .imports('fixtures.foo')
  .exports(function(){
    return {
      Foo: fixtures.foo,
      Bar: "Bar"
    };
  });