define(['fixtures/amd/one', 'fixtures/amd/two'], function (one, two) {
  return {
    one: one.one,
    two: two.two,
    hasDeps: 'hasDeps'
  };
});