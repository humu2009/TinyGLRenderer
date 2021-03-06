TinyGLRenderer
==============

TinyGLRenderer is an experimental renderer for [Three.js](https://github.com/mrdoob/three.js) 3D graphic library. It utilize [TinyGL.js](https://github.com/humu2009/tinygl.js), which implements a subset of OpenGL 1.1 API, for transform, lighting and primitive rasterization. The aim of this project is to develop an alternative render backend for Three.js that works with or without WebGL, as well as providing working examples to introduce the usage of TinyGL.js and promote its development.

Usage
-----

To let TinyGLRenderer work with Three.js, first the `tinyglrenderer.js` should be included together with the `three.js` or `three.min.js`:

```html
<script type="text/javascript" src="three.js"></script>
<script type="text/javascript" src="tinyglrenderer.js"></script>
```

Then initialize the renderer instance just like that for Three.js's built-in ones:

```js
var renderer = new THREE.TinyGLRenderer();
```

And now our TinyGLRenderer works as a compatible renderer for Three.js.

Examples
--------

[![Birds](http://humu2009.github.io/TinyGLRenderer/screenshots/birds.jpg)](http://humu2009.github.io/TinyGLRenderer/runnables/examples/tinygl_geometry_birds.html)
[![Earth](http://humu2009.github.io/TinyGLRenderer/screenshots/earth.jpg)](http://humu2009.github.io/TinyGLRenderer/runnables/examples/tinygl_geometry_earth.html)
[![Horse](http://humu2009.github.io/TinyGLRenderer/screenshots/horse.jpg)](http://humu2009.github.io/TinyGLRenderer/runnables/examples/tinygl_morphtargets_horse.html)
[![Panorama](http://humu2009.github.io/TinyGLRenderer/screenshots/panorama.jpg)](http://humu2009.github.io/TinyGLRenderer/runnables/examples/tinygl_geometry_panorama.html)
[![Assimp](http://humu2009.github.io/TinyGLRenderer/screenshots/assimp.jpg)](http://humu2009.github.io/TinyGLRenderer/runnables/examples/tinygl_loader_assimp2json.html)
[![Large Mesh](http://humu2009.github.io/TinyGLRenderer/screenshots/lucy.jpg)](http://humu2009.github.io/TinyGLRenderer/runnables/examples/tinygl_geometry_large_mesh.html)

[see more ...](https://github.com/humu2009/TinyGLRenderer/wiki/Examples)

Requirements
------------

[Canvas](http://caniuse.com/#feat=canvas) and [Typed Arrays](http://caniuse.com/#feat=typedarrays) are required to make TinyGLRenderer work correctly.
