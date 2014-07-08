Modus
=====

*Modus* is under heavy development. Feel free to download it and screw around, but be aware that
unstable is an understatement at the moment.

How about some code?
--------------------
Modus uses a super simple, java-style import syntax:

```JavaScript
import app.baz; // Available as 'baz' in this module.
import lib.library as ban; // Use 'as' to avoid any naming conflicts.

// Use an imported module:
var bar = baz.baritize('bar');

// Exporting something is as simple as this:
var foo = 'foo';
export {foo};
```

Because this is all done with AJAX, it isn't suitable for live projects. Ideally,
it should be thought of as a compiler that can also load things into the browser
as a handy development helper.

Please wait until the build functionality is ready before trying
to use Modus.