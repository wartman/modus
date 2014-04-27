'use strict';

var grunt = require('grunt');
var sorter = require('../src/sorter');

exports.sorter_test = {
  test_sort: function (test) {
    var sorted = sorter({
      'a' : ['b', 'c'],
      'b' : ['c'],
      'c' : ['d'],
      'd' : [],
      'f' : ['d', 'a']
    });

    test.deepEqual(sorted, ['d', 'c', 'b', 'a', 'f'], 'Sorted according to deps');
    test.done();
  }
}