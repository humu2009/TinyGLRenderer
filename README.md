TinyGLRenderer
==============

TinyGLRenderer is an experimental renderer for [Three.js](https://github.com/mrdoob/three.js) 3D graphic library. It utilize [TinyGL.js](https://github.com/humu2009/tinygl.js), which implements a subset of OpenGL 1.1 API, for transform, lighting and primitive reaterization.

Usage
-----

To let TinyGLRenderer work with Three.js, first the `tinyglrenderer.js` should be included together with the `three.js` or `three.min.js`:

```html
<script type="text/javascript" src="three.js"></script>
<script type="text/javascript" src="`tinyglrenderer.js"></script>
```

Then initialize the renderer instance just like that for Three.js's built-in renderers:

```js
var renderer = new THREE.TinyGLRenderer();
```

And now our TinyGLRenderer works as a valid render backend for Three.js.

Examples
--------

Requirements
------------

[Canvas](http://caniuse.com/#feat=canvas) and [Typed Arrays](http://caniuse.com/#feat=typedarrays) are required to make TinyGLRenderer work correctly.
