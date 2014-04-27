modus('fixtures.stress.one')
  .imports('fixtures.stress.item.foo')
  .exports(function(){
    return {
      One: "one",
      Foo: fixtures.stress.item.foo
    };
  });