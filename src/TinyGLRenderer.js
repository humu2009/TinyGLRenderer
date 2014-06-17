/**
 * @preserve
 *
 * The MIT License
 *
 * Copyright (c) 2014 Humu <humu2009@gmail.com>
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

/**
 * @class TinyGLRenderer
 *
 * TinyGL.js based 3D renderer for Three.js.
 */
THREE.TinyGLRenderer = function ( parameters ) {

	console.log( 'THREE.WebGLRenderer', THREE.REVISION );

	parameters = parameters || {};

	var _this = this;

	var _canvas = parameters.canvas !== undefined ? parameters.canvas : document.createElement( 'canvas' );

	var _gl = _canvas.getContext('experimental-tinygl'/*, {driver: 'webgl'}*/);
	if (!_gl)
		throw 'Error creating TinyGL context.';

	var MAX_LIGHTS = Math.min( 8, _gl.getIntegerv( _gl.MAX_LIGHTS )[0] );

	var ZERO4 = [0, 0, 0, 0];

	var _clearColor = new THREE.Color( 0x000000 );
	var _clearAlpha = 0;

	var _viewport = {
		x: 0, 
		y: 0, 
		w: _canvas.width, 
		h: _canvas.height
	};

	var _viewMatrix = new THREE.Matrix4();
	var _projectionMatrix = new THREE.Matrix4();
	var _viewProjectionMatrix = new THREE.Matrix4();

	var _frustum = new THREE.Frustum();

	var _renderData = {
		meshes:  [], 
		lines:   [], 
		sprites: [], 
		lights:  []
	};

	var _ambientColor = new THREE.Color;

	var _activeMorphInfluences = [];

	var _color = new THREE.Color;
	var _dir = new THREE.Vector3;
	var _position = new THREE.Vector3;
	var _vertex0 = new THREE.Vector3;
	var _vertex1 = new THREE.Vector3;
	var _vertex2 = new THREE.Vector3;
	var _normal0 = new THREE.Vector3;
	var _normal1 = new THREE.Vector3;
	var _normal2 = new THREE.Vector3;

	var toColor4 = function(color, arr) {
		if ( arr === undefined )
			return [color.r, color.g, color.b, 1];
		
		arr[0] = color.r; arr[1] = color.g; arr[2] = color.b; arr[3] = 1;
		return arr;
	};

	var collectObjects = function(object) {
		if ( object.visible === false )
			return;

		if ( object instanceof THREE.Light )
			_renderData.lights.push( object );
		else if ( object instanceof THREE.Mesh || object instanceof THREE.Line ) {
			if ( object.frustumCulled === false || _frustum.intersectsObject( object ) === true ) {
				if ( object instanceof THREE.Mesh )
					_renderData.meshes.push( object );
				else
					_renderData.lines.push( object );
			}
		} else if ( object instanceof THREE.Sprite )
			_renderData.sprites.push( object );

		for ( var i = 0, l = object.children.length; i < l; i ++ ) {
			collectObjects( object.children[ i ] );
		}
	};

	var walkGraph = function(root) {
		_renderData.meshes.length  = 0;
		_renderData.lines.length   = 0;
		_renderData.sprites.length = 0;
		_renderData.lights.length  = 0;

		collectObjects(root);
	};

	var applyLights = function(lights) {
		//ASSERT: View matrix must has been set correctly before calling applyLights()!
		_gl.matrixMode( _gl.MODELVIEW );

		_ambientColor.set( 0 );

		var lightPos = _gl.LIGHT0;
		var lightEnd = _gl.LIGHT0 + MAX_LIGHTS;
		for (var li=0, ll=lights.length; li<ll && lightPos<lightEnd; li++) {
			var light = lights[li];

			if ( light instanceof THREE.AmbientLight ) {
				_ambientColor.add( light.color );
			} else if ( ( light instanceof THREE.DirectionalLight ) || 
						( light instanceof THREE.PointLight ) || 
						( light instanceof THREE.SpotLight ) ) {
				_gl.pushMatrix();
				_gl.multMatrixf( light.matrixWorld.toArray() );

				if ( light instanceof THREE.DirectionalLight ) {
					_position.getPositionFromMatrix( light.matrixWorld );
					_dir.getPositionFromMatrix( light.target.matrixWorld );
					_dir.sub( _position ).negate().normalize();
					//if ( _dir.lengthManhattan() > 0 ) {
						_color.copy( light.color );
						_color.multiplyScalar( light.intensity );

						_gl.lightfv( lightPos, _gl.AMBIENT, [0, 0, 0, 1] );
						_gl.lightfv( lightPos, _gl.DIFFUSE, toColor4( _color ) );
						_gl.lightfv( lightPos, _gl.SPECULAR, toColor4( _color ) );
						_gl.lightfv( lightPos, _gl.POSITION, [_dir.x, _dir.y, _dir.z, 0] );
					//}
				} else if ( light instanceof THREE.PointLight ) {
					_position.getPositionFromMatrix( light.matrixWorld );
					_color.copy( light.color );
					_color.multiplyScalar( light.intensity );

					_gl.lightfv( lightPos, _gl.AMBIENT, [0, 0, 0, 1] );
					_gl.lightfv( lightPos, _gl.DIFFUSE, toColor4( _color ) );
					_gl.lightfv( lightPos, _gl.SPECULAR, toColor4( _color ) );
					_gl.lightfv( lightPos, _gl.POSITION, [_position.x, _position.y, _position.z, 1] );
					//FIXME: Three.js's lighing attenuation formula (linear attenuation) is very different from that of OpenGL 1.1.
					//       We just disable attenuation temporarily. But any better solution?
					//
					_gl.lightf(  lightPos, _gl.LINEAR_ATTENUATION, 0 );

				} else if ( light instanceof THREE.SpotLight ) {
					_position.getPositionFromMatrix( light.matrixWorld );
					_dir.getPositionFromMatrix( light.target.matrixWorld );
					_dir.sub( _position ).negate().normalize();
					_color.copy( light.color );
					_color.multiplyScalar( light.intensity );

					_gl.lightfv( lightPos, _gl.AMBIENT, [0, 0, 0, 1] );
					_gl.lightfv( lightPos, _gl.DIFFUSE, toColor4( _color ) );
					_gl.lightfv( lightPos, _gl.SPECULAR, toColor4( _color ) );
					_gl.lightfv( lightPos, _gl.POSITION, [_position.x, _position.y, _position.z, 1] );
					_gl.lightfv( lightPos, _gl.SPOT_DIRECTION, [_dir.x, _dir.y, _dir.z] );
					_gl.lightf(  lightPos, _gl.SPOT_CUTOFF, light.angle );
					_gl.lightf(  lightPos, _gl.SPOT_EXPONENT, light.exponent );
					//FIXME: Three.js's lighing attenuation formula (linear attenuation) is very different from that of OpenGL 1.1.
					//       We just disable attenuation temporarily. Any better solution?
					//
					_gl.lightf( lightPos, _gl.LINEAR_ATTENUATION, 0 );
				}

				_gl.popMatrix();

				_gl.enable( lightPos++ );
			}

			_this.info.render.lights++;				
		}

		while ( lightPos < lightEnd ) {
			_gl.disable( lightPos++ );
		}

		if ( lights.length > 0 ) {
			_gl.lightModelfv( _gl.LIGHT_MODEL_AMBIENT, toColor4( _ambientColor ) );

			_gl.enable( _gl.LIGHTING );
		}
	};

	var applyMaterial = function(material, lighting) {
		// depth test
		//
		if ( material.depthTest === true )
			_gl.enable( _gl.DEPTH_TEST );
		else
			_gl.disable( _gl.DEPTH_TEST );

		// which side should be rendered
		var side = _gl.FRONT;

		// face culling
		//
		switch ( material.side ) {
		case THREE.FrontSide:
			side = _gl.FRONT;
			_gl.enable(_gl.CULL_FACE);
			_gl.cullFace(_gl.BACK);
			break;
		case THREE.BackSide:
			side = _gl.BACK;
			_gl.enable(_gl.CULL_FACE);
			_gl.cullFace(_gl.FRONT);
			break;
		case THREE.DoubleSide:
			side = _gl.FRONT_AND_BACK;
			_gl.disable(_gl.CULL_FACE);
			break;
		default:
			break;
		}

		// polygon filling mode
		//
		if ( !material.wireframe )
			_gl.polygonMode( side, _gl.FILL );
		else
			_gl.polygonMode( side, _gl.LINE );

		// shading mode
		//
		if ( material.shading !== undefined ) {
			switch ( material.shading ) {
			case THREE.SmoothShading:
				_gl.shadeModel( _gl.SMOOTH );
				break;
			case THREE.FlatShading:
				_gl.shadeModel( _gl.FLAT );
				break;
			case THREE.NoShading:
			default:
				break;
			}
		}

		// basic color
		//
		if ( material instanceof THREE.MeshBasicMaterial ) {
			var color = material.color;
			_gl.color3f( color.r, color.g, color.b );
		}

		// textures
		//
		if ( material.map ) {
			// compile texture
			if ( !isGLTextureReady( material.map ) && 
				 material.map.image && (material.map.image.width > 0) && 
				 ( material.map.mapping instanceof THREE.UVMapping ) ) {
				createGLTexture( material.map );
			}

			// prepare texture
			if ( isGLTextureReady( material.map ) ) {
				// update texture if necessary
				if ( material.map.needsUpdate ) {
					updateGLTexture( material.map );
				}

				// enable and bind texture
				_gl.enable( _gl.TEXTURE_2D );
				_gl.bindTexture( _gl.TEXTURE_2D, material.map._tgl.texId );
			} else
				_gl.disable( _gl.TEXTURE_2D );
		}

		// lighting
		//
		if ( lighting ) {
			if ( material instanceof THREE.MeshBasicMaterial ) {
				setMatIllumCoefficients( side, ZERO4, ZERO4, toColor4( material.color ), ZERO4, [1] );
			} else if ( material instanceof THREE.MeshLambertMaterial ) {
				setMatIllumCoefficients( side, toColor4( material.ambient ), toColor4( material.color ), 
										 toColor4( material.emissive ), ZERO4, [1] );
			} else if ( material instanceof THREE.MeshPhongMaterial ) {
				setMatIllumCoefficients( side, toColor4( material.ambient ), toColor4( material.color ), 
										 toColor4( material.emissive ), toColor4( material.specular ), 
										 [material.shininess] );
			}
		}
	};

	var isGLTextureReady = function(texture) {
		return ( texture._tgl !== undefined ) && ( texture._tgl.texId !== undefined );
	};

	var createGLTexture = function(texture) {
		if ( texture._tgl === undefined )
			texture._tgl = {};

		if ( texture._tgl.texId === undefined ) {
			texture._tgl.texId = _gl.genTextures(1)[0];

			_gl.pixelStorei( _gl.UNPACK_FLIP_Y_TINYGL, texture.flipY ? true : false );

			_gl.bindTexture( _gl.TEXTURE_2D, texture._tgl.texId );
			if ( (texture instanceof THREE.Texture) || (texture instanceof THREE.DataTexture) )
				_gl.texImage2D( _gl.TEXTURE_2D, 0, 3, _gl.RGB, _gl.UNSIGNED_BYTE, texture.image );

			_gl.texParameteri( _gl.TEXTURE_2D, _gl.TEXTURE_MIN_FILTER, _gl.NEAREST );
			_gl.texParameteri( _gl.TEXTURE_2D, _gl.TEXTURE_MAG_FILTER, _gl.NEAREST );
			_gl.texParameteri( _gl.TEXTURE_2D, _gl.TEXTURE_WRAP_S, _gl.REPEAT );
			_gl.texParameteri( _gl.TEXTURE_2D, _gl.TEXTURE_WRAP_T, _gl.REPEAT );
			_gl.bindTexture( _gl.TEXTURE_2D, null );

			texture.needsUpdate = false;
			texture.addEventListener( 'dispose', onTextureDispose );

			_this.info.memory.textures++;
		}
	};

	var updateGLTexture = function(texture) {
		// Is GL texture not created yet? 
		if ( texture._tgl === undefined || texture._tgl.texId === undefined ) {
			createGLTexture( texture );
			return;
		}

		/*
		 * Update texture content.
		 */

		_gl.pixelStorei( _gl.UNPACK_FLIP_Y_TINYGL, texture.flipY ? true : false );

		_gl.bindTexture( _gl.TEXTURE_2D, texture._tgl.texId );
		if ( (texture instanceof THREE.Texture) || (texture instanceof THREE.DataTexture) )
			_gl.texImage2D( _gl.TEXTURE_2D, 0, 3, _gl.RGB, _gl.UNSIGNED_BYTE, texture.image );

		// consume the update flag
		texture.needsUpdate = false;
	};

	var deleteGLTexture = function(texture) {
		if ( texture._tgl !== undefined && texture._tgl.texId !== undefined ) {
			_gl.deleteTextures( 1, [texture._tgl.texId] );
			texture._tgl = undefined;

			_this.info.memory.textures--;
		}
	};

	var onTextureDispose = function( evt ) {
		var texture = evt.target;
		texture.removeEventListener( 'dispose', onTextureDispose );
		deleteGLTexture( texture );
	};

	var setMatIllumCoefficients = function(side, ambient, diffuse, emissive, specular, shininess) {
		_gl.materialfv( side, _gl.AMBIENT, ambient );
		_gl.materialfv( side, _gl.DIFFUSE, diffuse );
		_gl.materialfv( side, _gl.EMISSION, emissive );
		_gl.materialfv( side, _gl.SPECULAR, specular );
		_gl.materialfv( side, _gl.SHININESS, shininess );
	};

	var hasTextureMapping = function(geometry, material) {
		//NOTE: we do not deal with multi-texturing since TinyGL does not support this feature
		var uv0s = geometry.faceVertexUvs[0];
		return ( material.map && isGLTextureReady( material.map ) && 
				( uv0s.length > 0 ) && ( uv0s.length == geometry.faces.length ) );
	};

	var updateMorphing = function(mesh) {
		var influenceSum = 0;
		_activeMorphInfluences.length = 0;

		if ( mesh.morphTargetBase === -1 ) {
			var influence;
			var influences = mesh.morphTargetInfluences;
			for (var i=0, il=influences.length; i<il; i++) {
				influence = influences[i];
				if ( influence > 0 ) {
					influenceSum += influence;
					_activeMorphInfluences.push( [i, influence] );
				}
			}
			for (var i=0, il=_activeMorphInfluences.length; i<il; i++) {
				_activeMorphInfluences[i][1] /= influenceSum;
			}
		} else {
			//TODO:
		}

		// Compute morph normals (for both faces and vertices) if it is specified to.
		// Morph normals are computed only once for a mesh in most cases.
		if ( mesh.material.morphNormals && mesh.geometry.morphNormals.length === 0 )
			mesh.geometry.computeMorphNormals();

		return _activeMorphInfluences.length > 0;
	};

	var getMorphedPosition = function(morphTargets, vertexIndex, result) {
		result.set( 0, 0, 0 );

		var target, position;
		for (var i=0, il=_activeMorphInfluences.length; i<il; i++) {
			var influenceParam = _activeMorphInfluences[i];
			var targetIndex = influenceParam[0];
			var targetInfluence = influenceParam[1];

			target = morphTargets[ targetIndex ];
			if ( target === undefined )
				continue;

			position = target.vertices[ vertexIndex ];
			result.x += targetInfluence * position.x;
			result.y += targetInfluence * position.y;
			result.z += targetInfluence * position.z;
		}

		return result;
	};

	var getMorphedFaceNormal = function(morphNormals, faceIndex, result, normalize) {
		result.set( 0, 0, 0 );

		var target, normal;
		for (var i=0, il=_activeMorphInfluences.length; i<il; i++) {
			var influenceParam = _activeMorphInfluences[i];
			var targetIndex = influenceParam[0];
			var targetInfluence = influenceParam[1];

			target = morphNormals[ targetIndex ];
			if ( target === undefined )
				continue;

			normal = target.faceNormals[ faceIndex ];
			result.x += targetInfluence * normal.x;
			result.y += targetInfluence * normal.y;
			result.z += targetInfluence * normal.z;
		}

		return ( normalize !== false ) ? result.normalize() : result;
	};

	var getMorphedVertexNormals = function(morphNormals, faceIndex, result0, result1, result2, normalize) {
		result0.set( 0, 0, 0 );
		result1.set( 0, 0, 0 );
		result2.set( 0, 0, 0 );

		var target, normal;
		for (var i=0, il=_activeMorphInfluences.length; i<il; i++) {
			var influenceParam = _activeMorphInfluences[i];
			var targetIndex = influenceParam[0];
			var targetInfluence = influenceParam[1];

			target = morphNormals[ targetIndex ];
			if ( target === undefined )
				continue;

			var faceVertexNormals = target.vertexNormals[ faceIndex ];

			normal = faceVertexNormals.a;
			result0.x += targetInfluence * normal.x;
			result0.y += targetInfluence * normal.y;
			result0.z += targetInfluence * normal.z;

			normal = faceVertexNormals.b;
			result1.x += targetInfluence * normal.x;
			result1.y += targetInfluence * normal.y;
			result1.z += targetInfluence * normal.z;

			normal = faceVertexNormals.c;
			result2.x += targetInfluence * normal.x;
			result2.y += targetInfluence * normal.y;
			result2.z += targetInfluence * normal.z;
		}

		if ( normalize !== false ) {
			result0.normalize();
			result1.normalize();
			result2.normalize();
		}
	};


	this.domElement = _canvas;

	this.devicePixelRatio = parameters.devicePixelRatio !== undefined
				? parameters.devicePixelRatio
				: self.devicePixelRatio !== undefined
					? self.devicePixelRatio
					: 1;

	this.autoClear = true;

	this.info = {

		memory: {
			textures: 0
		}, 

		render: {
			lights:   0, 
			vertices: 0, 
			faces:    0
		}

	};

	this.supportsVertexTextures = function() {
		return false;
	};

	this.setFaceCulling = function(cullFace, frontFaceDirection) {
		if ( cullFace === THREE.CullFaceNone )
			_gl.disable( _gl.CULL_FACE );
		else {
			if ( frontFaceDirection === THREE.FrontFaceDirectionCW )
				_gl.frontFace( _gl.CW );
			else
				_gl.frontFace( _gl.CCW );

			if ( cullFace === THREE.CullFaceBack )
				_gl.cullFace( _gl.BACK );
			else if ( cullFace === THREE.CullFaceFront )
				_gl.cullFace( _gl.FRONT );
			else
				_gl.cullFace( _gl.FRONT_AND_BACK );

			_gl.enable( _gl.CULL_FACE );
		}
	};

	this.setClearColor = function(color, alpha) {
		_clearColor.set( color );
		_clearAlpha = alpha !== undefined ? alpha : 1;

		_gl.clearColor( _clearColor.r, _clearColor.g, _clearColor.b, _clearAlpha );
	};

	this.setClearColorHex = function(hex, alpha) {
		console.warn( 'DEPRECATED: .setClearColorHex() is being removed. Use .setClearColor() instead.' );
		this.setClearColor( hex, alpha );
	};

	this.getMaxAnisotropy = function() {
		return 0;
	};

	this.setSize = function(width, height, updateStyle) {
		_canvas.width = width * this.devicePixelRatio;
		_canvas.height = height * this.devicePixelRatio;

		if ( this.devicePixelRatio !== 1 && updateStyle !== false ) {
			_canvas.style.width = width + 'px';
			_canvas.style.height = height + 'px';
		}

		this.setViewport(0, 0, _canvas.width, _canvas.height);
	};

	this.setViewport = function(x, y, width, height) {
		_viewport.x = x !== undefined ? x : 0;
		_viewport.y = y !== undefined ? y : 0;
		_viewport.w = width !== undefined ? width : _canvas.width;
		_viewport.h = height !== undefined ? height : _canvas.height;

		_gl.viewport(0, 0, _canvas.width, _canvas.height);
	};

	this.clear = function(color, depth, stencil) {
		var flags = 0;
		if (color === undefined || color)
			flags |= _gl.COLOR_BUFFER_BIT;
		if (depth === undefined || depth)
			flags |= _gl.DEPTH_BUFFER_BIT;
		if (stencil === undefined || stencil)
			flags |= _gl.STENCIL_BUFFER_BIT;

		_gl.clear(flags);
	};

	this.render = function(scene, camera) {
		if ( (camera instanceof THREE.Camera) === false ) {
			console.error( 'THREE.CanvasRenderer.render: camera is not an instance of THREE.Camera.' );
			return;
		}

		if ( this.autoClear === true )
			this.clear();

		this.info.render.lights = 0;
		this.info.render.vertices = 0;
		this.info.render.faces = 0;

		if ( scene.autoUpdate === true )
			scene.updateMatrixWorld();
		if ( camera.parent === undefined )
			camera.updateMatrixWorld();

		_viewMatrix.copy( camera.matrixWorldInverse.getInverse( camera.matrixWorld ) );
		_projectionMatrix.copy( camera.projectionMatrix );
		_viewProjectionMatrix.multiplyMatrices( camera.projectionMatrix, _viewMatrix );

		_frustum.setFromMatrix( _viewProjectionMatrix );

		// walk down scene graph, collecting render objects
		walkGraph(scene);

		_gl.viewport( _viewport.x, _viewport.y, _viewport.w, _viewport.h );

		_gl.matrixMode( _gl.PROJECTION );
		_gl.loadIdentity();
		_gl.multMatrixf( _projectionMatrix.toArray() );

		_gl.matrixMode( _gl.MODELVIEW );
		_gl.loadIdentity();
		_gl.multMatrixf( _viewMatrix.toArray() );

		// setup lights if at all
		//
		var useLighting = _renderData.lights.length > 0;
		if ( useLighting )
			applyLights( _renderData.lights );
		else
			_gl.disable( _gl.LIGHTING );

		// render meshes
		//
		for (var oi=0, ol=_renderData.meshes.length; oi<ol; oi++) {
			var mesh = _renderData.meshes[oi];
			var geometry = mesh.geometry;
			var modelMatrix = mesh.matrixWorld;

			var vertices = geometry.vertices;
			var faces = geometry.faces;
			var faceVertexUvs = geometry.faceVertexUvs;

			var isFaceMaterial = mesh.material instanceof THREE.MeshFaceMaterial;
			var objectMaterials = isFaceMaterial === true ? mesh.material : null;

			var useMorphing = false;

			if ( isFaceMaterial === false ) {
				if ( !mesh.material )
					continue;
				else {
					applyMaterial( mesh.material, useLighting );

					// compute vertex normals if they are not prepared yet
					if ( mesh.material.shading === THREE.SmoothShading && 
						 geometry.faces.length > 0 && geometry.faces[0].vertexNormals.length === 0 ) {
						geometry.computeVertexNormals();
					}

					if ( mesh.material.morphTargets && mesh.morphTargetBase ) {
						useMorphing = updateMorphing( mesh );
					}
				}
			}

			_gl.pushMatrix();
			_gl.multMatrixf( modelMatrix.toArray() );

			var face;
			var v0, v1, v2;
			var fuvs = faceVertexUvs[0];
			var fn;
			var vns;
			var n0, n1, n2;
			var vcs;
			var c0, c1, c2;
			var uvs;
			var uv0, uv1, uv2;
			for (var fi=0, fl=faces.length; fi<fl; fi++) {
				face = faces[fi];
				fn   = face.normal;
				vns  = face.vertexNormals;
				vcs  = face.vertexColors;

				var material = isFaceMaterial === true ? objectMaterials.materials[ face.materialIndex ] : mesh.material;
				if ( material === undefined )
					continue;

				// update statistics
				this.info.render.vertices += 3;
				this.info.render.faces++;

				if ( isFaceMaterial === true )
					applyMaterial( material, useLighting );

				var useVertexNormal = ( material.shading === THREE.SmoothShading ) && ( vns.length >= 3 );
				var useVertexColor  = ( material.vertexColors == THREE.VertexColors ) && ( vcs.length >= 3 );

				if ( useMorphing ) {
					v0 = getMorphedPosition( geometry.morphTargets, face.a, _vertex0 );
					v1 = getMorphedPosition( geometry.morphTargets, face.b, _vertex1 );
					v2 = getMorphedPosition( geometry.morphTargets, face.c, _vertex2 );

				} else {
					v0 = vertices[face.a];
					v1 = vertices[face.b];
					v2 = vertices[face.c];
				}

				if ( useLighting ) {
					// apply face normal
					if ( !useVertexNormal ) {
						if ( useMorphing && material.morphNormals ) {
							getMorphedFaceNormal( geometry.morphNormals, fi, _normal0 );
							_gl.normal3f( _normal0.x, _normal0.y, _normal0.z );
						} else
							_gl.normal3f( fn.x, fn.y, fn.z );
					}
				}

				_gl.begin(_gl.TRIANGLES);
				if ( hasTextureMapping( geometry, material ) ) {
					uvs = fuvs[fi];
					if ( uvs !== undefined ) {
						uv0 = uvs[0];
						uv1 = uvs[1];
						uv2 = uvs[2];

						if ( useLighting && useVertexNormal ) {
							/*
							 * Smooth shading + Texturing
							 */
							if ( useMorphing && material.morphNormals ) {
								getMorphedVertexNormals( geometry.morphNormals, fi, _normal0, _normal1, _normal2 );
								n0 = _normal0;
								n1 = _normal1;
								n2 = _normal2;
							} else {
								n0 = vns[0];
								n1 = vns[1];
								n2 = vns[2];
							}

							_gl.texCoord2f( uv0.x, uv0.y );
							_gl.normal3f( n0.x, n0.y, n0.z );
							_gl.vertex3f( v0.x, v0.y, v0.z );
							_gl.texCoord2f( uv1.x, uv1.y );
							_gl.normal3f( n1.x, n1.y, n1.z );
							_gl.vertex3f( v1.x, v1.y, v1.z );
							_gl.texCoord2f( uv2.x, uv2.y );
							_gl.normal3f( n2.x, n2.y, n2.x );
							_gl.vertex3f( v2.x, v2.y, v2.z );

						} else {
							/*
							 * (Flat shading +) Texturing
							 */
							_gl.texCoord2f( uv0.x, uv0.y );
							_gl.vertex3f( v0.x, v0.y, v0.z );
							_gl.texCoord2f( uv1.x, uv1.y );
							_gl.vertex3f( v1.x, v1.y, v1.z );
							_gl.texCoord2f( uv2.x, uv2.y );
							_gl.vertex3f( v2.x, v2.y, v2.z );
						}
					}
				} else if ( material.vertexColors === THREE.FaceColors ) {
					c0 = face.color;
					_gl.color3f( c0.r, c0.g, c0.b );

					if ( useLighting && useVertexNormal ) {
						/*
						 * Smooth shading + Per face color
						 */
						if ( useMorphing && material.morphNormals ) {
							getMorphedVertexNormals( geometry.morphNormals, fi, _normal0, _normal1, _normal2 );
							n0 = _normal0;
							n1 = _normal1;
							n2 = _normal2;
						} else {
							n0 = vns[0];
							n1 = vns[1];
							n2 = vns[2];
						}

						_gl.normal3f( n0.x, n0.y, n0.z );
						_gl.vertex3f( v0.x, v0.y, v0.z );
						_gl.normal3f( n1.x, n1.y, n1.z );
						_gl.vertex3f( v1.x, v1.y, v1.z );
						_gl.normal3f( n2.x, n2.y, n2.z );
						_gl.vertex3f( v2.x, v2.y, v2.z );

					} else {
						/*
						 * (Flat shading +) Per face color
						 */
						_gl.vertex3f( v0.x, v0.y, v0.z );
						_gl.vertex3f( v1.x, v1.y, v1.z );
						_gl.vertex3f( v2.x, v2.y, v2.z );
					}
				} else if ( useVertexColor ) {
					c0 = vcs[0];
					c1 = vcs[1];
					c2 = vcs[2];

					if ( useLighting && useVertexNormal ) {
						/*
						 * Smooth shading + Per vertex color
						 */
						if ( useMorphing && material.morphNormals ) {
							getMorphedVertexNormals( geometry.morphNormals, fi, _normal0, _normal1, _normal2 );
							n0 = _normal0;
							n1 = _normal1;
							n2 = _normal2;
						} else {
							n0 = vns[0];
							n1 = vns[1];
							n2 = vns[2];
						}

						_gl.color3f( c0.r, c0.g, c0.b );
						_gl.normal3f( n0.x, n0.y, n0.z );
						_gl.vertex3f( v0.x, v0.y, v0.z );
						_gl.color3f( c1.r, c1.g, c1.b );
						_gl.normal3f( n1.x, n1.y, n1.z );
						_gl.vertex3f( v1.x, v1.y, v1.z );
						_gl.color3f( c2.r, c2.g, c2.b );
						_gl.normal3f( n2.x, n2.y, n2.z );
						_gl.vertex3f( v2.x, v2.y, v2.z );

					} else {
						/*
						 * (Flat shading +) Per vertex color
						 */
						_gl.color3f( c0.r, c0.g, c0.b );
						_gl.vertex3f( v0.x, v0.y, v0.z );
						_gl.color3f( c1.x, c1.y, c1.z );
						_gl.vertex3f( v1.x, v1.y, v1.z );
						_gl.color3f( c2.r, c2.g, c2.b );
						_gl.vertex3f( v2.x, v2.y, v2.z );
					}
				} else {
					if ( useLighting && useVertexNormal ) {
						/*
						 * Smooth shading + Basic material color
						 */
						if ( useMorphing && material.morphNormals ) {
							getMorphedVertexNormals( geometry.morphNormals, fi, _normal0, _normal1, _normal2 );
							n0 = _normal0;
							n1 = _normal1;
							n2 = _normal2;
						} else {
							n0 = vns[0];
							n1 = vns[1];
							n2 = vns[2];
						}

						_gl.normal3f( n0.x, n0.y, n0.z );
						_gl.vertex3f( v0.x, v0.y, v0.z );
						_gl.normal3f( n1.x, n1.y, n1.z );
						_gl.vertex3f( v1.x, v1.y, v1.z );
						_gl.normal3f( n2.x, n2.y, n2.z );
						_gl.vertex3f( v2.x, v2.y, v2.z );

					} else {
						/*
						 * (Flat shading +) Basic material color
						 */
						_gl.vertex3f( v0.x, v0.y, v0.z );
						_gl.vertex3f( v1.x, v1.y, v1.z );
						_gl.vertex3f( v2.x, v2.y, v2.z );
					}
				}
				_gl.end();
			}
			
			_gl.popMatrix();
		}

		// Do not illuminate lines and sprites
		//
		_gl.disable( _gl.LIGHTING );

		// render lines
		//
		for (var oi=0, ol=_renderData.lines.length; oi<ol; oi++) {
			var line = _renderData.lines[oi];
			var geometry = line.geometry;
			var modelMatrix = line.matrixWorld;

			var vertices = geometry.vertices;
			var colors   = geometry.colors;
			var material = line.material;

			if ( material === undefined )
				continue;

			var useVertexColor = ( material.vertexColors === true ) && ( colors.length === vertices.length );
			if ( !useVertexColor ) {
				_color.copy( material.color );
				_gl.color3f( _color.r, _color.g, _color.b );
			}

			_gl.pushMatrix();
			_gl.multMatrixf( modelMatrix.toArray() );

			_gl.begin( line.type === THREE.LinePieces ? _gl.LINES : _gl.LINE_STRIP );

			var v, c;
			for (var vi=0, vl=vertices.length; vi<vl; vi++) {
				v = vertices[vi];

				// update statistics
				this.info.render.vertices++;

				if ( useVertexColor ) {
					c = colors[vi];
					_gl.color3f( c.r, c.g, c.b );
				}
				_gl.vertex3f( v.x, v.y, v.z );
			}

			_gl.end();

			_gl.popMatrix();
		}

		// render sprites
		//
		for (var si=0, sl=_renderData.sprites.length; si<sl; si++) {
			var sprite = _renderData.sprites[si];

			//not implemented yet
		}

		_gl.flush();

		_gl.swapBuffers();
	};

};
