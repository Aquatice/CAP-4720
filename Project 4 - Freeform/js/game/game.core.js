/* game.core.js - Dragon Game
/* December 15, 2015
/* COP 4720 - Computer Graphics */

window.game = window.game || {};

window.game.core = function () {
	var _game = {
		player: {
			// Player Entity
			model: null,
			mesh: null,
			shape: null,
			rigidBody: null,
			orientationConstraint: null,
			// Player mass
			mass: 3,
			// Jumping stuff, height and on ground
			isGrounded: false,
			jumpHeight: 38,
			// Player speed
			speed: 1.5,
			speedMax: 45,
			// Player rotation
			rotationSpeed: 0.007,
			rotationSpeedMax: 0.04,
			rotationRadians: new THREE.Vector3(0, 0, 0),
			rotationAngleX: null,
			rotationAngleY: null,
			// Deceleration & Acceleration
			damping: 0.9,
			rotationDamping: 0.8,
			acceleration: 0,
			rotationAcceleration: 0,
			playerCoords: null,
			cameraCoords: null,
			cameraOffsetH: 240,
			cameraOffsetV: 140,
			// Enum for acceleration and deceleration
			playerAccelerationValues: {
				position: {
					acceleration: "acceleration",
					speed: "speed",
					speedMax: "speedMax"
				},
				rotation: {
					acceleration: "rotationAcceleration",
					speed: "rotationSpeed",
					speedMax: "rotationSpeedMax"
				}
			},
			// Keyboard config for game.events.js
			controlKeys: {
				forward: "w",
				backward: "s",
				left: "a",
				right: "d",
				fire: "x"
			},
			create: function() {
				// Creates a physics material to be used with other objects
				_cannon.playerPhysicsMaterial = new CANNON.Material("playerMaterial");

				// Create a play character (the dragon)
				_game.player.model = _three.createModel(window.game.models.player, 12, [
					new THREE.MeshLambertMaterial({ color: 0xff6600, shading: THREE.FlatShading }),
					new THREE.MeshLambertMaterial({ color: 0xff6600, shading: THREE.FlatShading }),
				]);
				
				// Creates the shape mesh and body
				_game.player.shape = new CANNON.Box(_game.player.model.halfExtents);
				_game.player.rigidBody = new CANNON.RigidBody(_game.player.mass, _game.player.shape, _cannon.createPhysicsMaterial(_cannon.playerPhysicsMaterial));
				_game.player.rigidBody.position.set(0, 0, 50);
				_game.player.mesh = _cannon.addVisual(_game.player.rigidBody, null, _game.player.model.mesh);

				// Prevents too much rotation
				_game.player.rigidBody.postStep = function() {
					_game.player.rigidBody.angularVelocity.z = 0;
					_game.player.updateOrientation();
				};

				// Collision event listener for jumping
				_game.player.rigidBody.addEventListener("collide", function(event) {
					// Only jump if the player is grounded
					if (!_game.player.isGrounded) {
						// Raycast for ground collision checking
						_game.player.isGrounded = (new CANNON.Ray(_game.player.mesh.position, new CANNON.Vec3(0, 0, -1)).intersectBody(event.contact.bi).length > 0);
					}
				});
			},
			update: function() {
				// Game logic
				_game.player.processUserInput();
				_game.player.accelerate();
				_game.player.rotate();
				_game.player.updateCamera();
				// Checks for OOB
				_game.player.checkGameOver();
			},
			updateCamera: function() {
				// Calculate camera coordinates
				_game.player.cameraCoords = window.game.helpers.polarToCartesian(_game.player.cameraOffsetH, _game.player.rotationRadians.z);

				// Apply camera coordinates to camera position
				_three.camera.position.x = _game.player.mesh.position.x + _game.player.cameraCoords.x;
				_three.camera.position.y = _game.player.mesh.position.y + _game.player.cameraCoords.y;
				_three.camera.position.z = _game.player.mesh.position.z + _game.player.cameraOffsetV;
				
				// Snap to the player
				_three.camera.lookAt(_game.player.mesh.position);
			},
			updateAcceleration: function(values, direction) {
				// Distinguish between directional acceleration
				if (direction === 1) {
					// Forward and right
					if (_game.player[values.acceleration] > -_game.player[values.speedMax]) {
						if (_game.player[values.acceleration] >= _game.player[values.speedMax] / 2) {
							_game.player[values.acceleration] = -(_game.player[values.speedMax] / 4);
						} else {
							_game.player[values.acceleration] -= _game.player[values.speed];
						}
					} 
					else {
						_game.player[values.acceleration] = -_game.player[values.speedMax];
					}
				}
				// Backward and left
				else {
					if (_game.player[values.acceleration] < _game.player[values.speedMax]) {
						if (_game.player[values.acceleration] <= -(_game.player[values.speedMax] / 2)) {
							_game.player[values.acceleration] = _game.player[values.speedMax] / 4;
						} else {
							_game.player[values.acceleration] += _game.player[values.speed];
						}
					} else {
						_game.player[values.acceleration] = _game.player[values.speedMax];
					}
				}
			},
			breatheFire: function()
			{
				_threexSparks	= new THREE.Sparks({
					maxParticles	: 400,
					counter		: new SPARKS.SteadyCounter(300)
				});

				// setup the emitter
				var emitter	= _threexSparks.emitter();

				var initColorSize	= function()
				{
					this.initialize = function( emitter, particle )
					{
						particle.target.color().setHSV(.1, .9, 1);
						particle.target.size(150);
					};
				};


				emitter.addInitializer(new initColorSize());
				emitter.addInitializer(new SPARKS.Position( new SPARKS.PointZone( new THREE.Vector3(0,0,0) ) ) );
				emitter.addInitializer(new SPARKS.Lifetime(0,0.25));
				emitter.addInitializer(new SPARKS.Velocity(new SPARKS.PointZone(new THREE.Vector3(0,250,00))));

				emitter.addAction(new SPARKS.Age());
				emitter.addAction(new SPARKS.Move());
				emitter.addAction(new SPARKS.RandomDrift(1000,0,1000));
				emitter.addAction(new SPARKS.Accelerate(0,-200,0));

			},
			processUserInput: function() {
				// Jump
				if (_events.keyboard.pressed["space"]) {
					_game.player.jump();
				}
				
				// MOVEMENTS AND ACTIONS
				if (_events.keyboard.pressed[_game.player.controlKeys.fire])
				{
					_game.player.breatheFire(_game.player.playerAccelerationValues.poistion, 1)
				}

				if (_events.keyboard.pressed[_game.player.controlKeys.forward]) {
					_game.player.updateAcceleration(_game.player.playerAccelerationValues.position, 1);
				}

				if (_events.keyboard.pressed[_game.player.controlKeys.backward]) {
					_game.player.updateAcceleration(_game.player.playerAccelerationValues.position, -1);
				}

				if (_events.keyboard.pressed[_game.player.controlKeys.right]) {
					_game.player.updateAcceleration(_game.player.playerAccelerationValues.rotation, 1);
				}

				if (_events.keyboard.pressed[_game.player.controlKeys.left]) {
					_game.player.updateAcceleration(_game.player.playerAccelerationValues.rotation, -1);
				}
			},
			accelerate: function() {
				// Calculate player coordinates
				_game.player.playerCoords = window.game.helpers.polarToCartesian(_game.player.acceleration, _game.player.rotationRadians.z);
				
				// And set velocity
				_game.player.rigidBody.velocity.set(_game.player.playerCoords.x, _game.player.playerCoords.y, _game.player.rigidBody.velocity.z);

				if (!_events.keyboard.pressed[_game.player.controlKeys.forward] && !_events.keyboard.pressed[_game.player.controlKeys.backward]) {
					_game.player.acceleration *= _game.player.damping;
				}
			},
			rotate: function() {
				// Camera rotates around the z-axis
				_cannon.rotateOnAxis(_game.player.rigidBody, new CANNON.Vec3(0, 0, 1), _game.player.rotationAcceleration);

				// Damping
				if (!_events.keyboard.pressed[_game.player.controlKeys.left] && !_events.keyboard.pressed[_game.player.controlKeys.right]) {
					_game.player.rotationAcceleration *= _game.player.rotationDamping;
				}
			},
			jump: function() {
				// Just jump if there's collision between player and object below
				if (_cannon.getCollisions(_game.player.rigidBody.index) && _game.player.isGrounded) {
					_game.player.isGrounded = false;
					_game.player.rigidBody.velocity.z = _game.player.jumpHeight;
				}
			},
			updateOrientation: function() {
				_game.player.rotationRadians = new THREE.Euler().setFromQuaternion(_game.player.rigidBody.quaternion);
				
				// Round the angles
				_game.player.rotationAngleX = Math.round(window.game.helpers.radToDeg(_game.player.rotationRadians.x));
				_game.player.rotationAngleY = Math.round(window.game.helpers.radToDeg(_game.player.rotationRadians.y));

				// Prevent the player from being upside down.
				if ((_cannon.getCollisions(_game.player.rigidBody.index) &&
					((_game.player.rotationAngleX >= 90) ||
						(_game.player.rotationAngleX <= -90) ||
						(_game.player.rotationAngleY >= 90) ||
						(_game.player.rotationAngleY <= -90)))
					)
				{
					_game.player.rigidBody.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 0, 1), _game.player.rotationRadians.z);
				}
			},
			// DESTROYS EVERYHING IF OOB
			checkGameOver: function () {
				if (_game.player.mesh.position.z <= -800) {
					_game.destroy();
				}
			}
		},
		level: {
			create: function() {
				// Create a solid material for everytyhing in the world (except spheres of course)
				_cannon.solidMaterial = _cannon.createPhysicsMaterial(new CANNON.Material("solidMaterial"), 0, 0.1);
				
				// Create the floor
				var floorSize = 800;
				var floorHeight = 20;
				
				var texture = THREE.ImageUtils.loadTexture('images/fancygrass.jpg');
				var textureBrick = THREE.ImageUtils.loadTexture('images/platformbrick.jpg');
				
				// Attempts the skybox call, but this has yet to prove successful
				_cannon.addBox();
		
				texture.needsUpdate = true;

				// Walls
				_cannon.createRigidBody({
					shape: new CANNON.Box(new CANNON.Vec3(floorSize, floorSize, floorHeight)),
					mass: 0,
					position: new CANNON.Vec3(0, 0, -floorHeight),
					meshMaterial: new THREE.MeshLambertMaterial(({map:texture}), .4, .2 ),
					physicsMaterial: _cannon.solidMaterial
				});
				_cannon.createRigidBody({
					shape: new CANNON.Box(new CANNON.Vec3(floorSize, 10, 60)),
					mass: 0,
					position: new CANNON.Vec3(0, -800, 30 - 1 ),
					meshMaterial: new THREE.MeshLambertMaterial(({map:textureBrick}), .4, .2 ),
					physicsMaterial: _cannon.solidMaterial
				});
				_cannon.createRigidBody({
					shape: new CANNON.Box(new CANNON.Vec3(floorSize, 10, 60)),
					mass: 0,
					position: new CANNON.Vec3(0, 800, 30 - 1 ),
					meshMaterial: new THREE.MeshLambertMaterial(({map:textureBrick}), .4, .2 ),
					physicsMaterial: _cannon.solidMaterial
				});
				_cannon.createRigidBody({
					shape: new CANNON.Box(new CANNON.Vec3(10, floorSize, 60)),
					mass: 0,
					position: new CANNON.Vec3(-800, 0, 30 - 1 ),
					meshMaterial: new THREE.MeshLambertMaterial(({map:textureBrick}), .4, .2 ),
					physicsMaterial: _cannon.solidMaterial
				});
				_cannon.createRigidBody({
					shape: new CANNON.Box(new CANNON.Vec3(10, floorSize, 60)),
					mass: 0,
					position: new CANNON.Vec3(800, 0, 30 - 1 ),
					meshMaterial: new THREE.MeshLambertMaterial(({map:textureBrick}), .4, .2 ),
					physicsMaterial: _cannon.solidMaterial
				});

				// All of this block generation could definitely be done procedurally 
				// Block l 
				_cannon.createRigidBody({
					shape: new CANNON.Box(new CANNON.Vec3(30, 30, 30)),
					mass: 0,
					position: new CANNON.Vec3(-240, -200, 30 - 1),
					meshMaterial: new THREE.MeshLambertMaterial(({map:textureBrick}), .4, .2 ),
					physicsMaterial: _cannon.solidMaterial
				});
				_cannon.createRigidBody({
					shape: new CANNON.Box(new CANNON.Vec3(30, 30, 30)),
					mass: 0,
					position: new CANNON.Vec3(-300, -200, 30 - 1),
					meshMaterial: new THREE.MeshLambertMaterial(({map:textureBrick}), .4, .2 ),
					physicsMaterial: _cannon.solidMaterial
				});
				_cannon.createRigidBody({
					shape: new CANNON.Box(new CANNON.Vec3(30, 30, 30)),
					mass: 0,
					position: new CANNON.Vec3(-240, -260, 30 - 1),
					meshMaterial: new THREE.MeshLambertMaterial(({map:textureBrick}), .4, .2 ),
					physicsMaterial: _cannon.solidMaterial
				});
				_cannon.createRigidBody({
					shape: new CANNON.Box(new CANNON.Vec3(30, 30, 30)),
					mass: 0,
					position: new CANNON.Vec3(-300, -140, 30 - 1),
					meshMaterial: new THREE.MeshLambertMaterial(({map:textureBrick}), .4, .2 ),
					physicsMaterial: _cannon.solidMaterial
				});
				_cannon.createRigidBody({
					shape: new CANNON.Box(new CANNON.Vec3(30, 30, 30)),
					mass: 0,
					position: new CANNON.Vec3(-240, -140, 30 - 1),
					meshMaterial: new THREE.MeshLambertMaterial(({map:textureBrick}), .4, .2 ),
					physicsMaterial: _cannon.solidMaterial
				});
				_cannon.createRigidBody({
					shape: new CANNON.Box(new CANNON.Vec3(30, 30, 30)),
					mass: 0,
					position: new CANNON.Vec3(-180, -140, 30 - 1),
					meshMaterial: new THREE.MeshLambertMaterial(({map:textureBrick}), .4, .2 ),
					physicsMaterial: _cannon.solidMaterial
				});

				// Block 2
				_cannon.createRigidBody({
					shape: new CANNON.Box(new CANNON.Vec3(30, 30, 30)),
					mass: 0,
					position: new CANNON.Vec3(-300, -260, 30),
					meshMaterial: new THREE.MeshLambertMaterial(({map:textureBrick}), .4, .2 ),
					physicsMaterial: _cannon.solidMaterial
				});
				_cannon.createRigidBody({
					shape: new CANNON.Box(new CANNON.Vec3(30, 30, 30)),
					mass: 0,
					position: new CANNON.Vec3(-300, -260, 90),
					meshMaterial: new THREE.MeshLambertMaterial(({map:textureBrick}), .4, .2 ),
					physicsMaterial: _cannon.solidMaterial
				});
				
				// Block 3
				_cannon.createRigidBody({
					shape: new CANNON.Box(new CANNON.Vec3(30, 30, 30)),
					mass: 0,
					position: new CANNON.Vec3(-180, -200, 30),
					meshMaterial: new THREE.MeshLambertMaterial(({map:textureBrick}), .4, .2 ),
					physicsMaterial: _cannon.solidMaterial
				});
				_cannon.createRigidBody({
					shape: new CANNON.Box(new CANNON.Vec3(30, 30, 30)),
					mass: 0,
					position: new CANNON.Vec3(-180, -200, 90),
					meshMaterial: new THREE.MeshLambertMaterial(({map:textureBrick}), .4, .2 ),
					physicsMaterial: _cannon.solidMaterial
				});
				_cannon.createRigidBody({
					shape: new CANNON.Box(new CANNON.Vec3(30, 30, 30)),
					mass: 0,
					position: new CANNON.Vec3(-180, -200, 150),
					meshMaterial: new THREE.MeshLambertMaterial(({map:textureBrick}), .4, .2 ),
					physicsMaterial: _cannon.solidMaterial
				});

				// Block 4
				_cannon.createRigidBody({
					shape: new CANNON.Box(new CANNON.Vec3(30, 30, 30)),
					mass: 0,
					position: new CANNON.Vec3(-120, -140, 30),
					meshMaterial: new THREE.MeshLambertMaterial(({map:textureBrick}), .4, .2 ),
					physicsMaterial: _cannon.solidMaterial
				});
				_cannon.createRigidBody({
					shape: new CANNON.Box(new CANNON.Vec3(30, 30, 30)),
					mass: 0,
					position: new CANNON.Vec3(-120, -140, 90),
					meshMaterial: new THREE.MeshLambertMaterial(({map:textureBrick}), .4, .2 ),
					physicsMaterial: _cannon.solidMaterial
				});
				_cannon.createRigidBody({
					shape: new CANNON.Box(new CANNON.Vec3(30, 30, 30)),
					mass: 0,
					position: new CANNON.Vec3(-120, -140, 150),
					meshMaterial: new THREE.MeshLambertMaterial(({map:textureBrick}), .4, .2 ),
					physicsMaterial: _cannon.solidMaterial
				});
				_cannon.createRigidBody({
					shape: new CANNON.Box(new CANNON.Vec3(30, 30, 30)),
					mass: 0,
					position: new CANNON.Vec3(-120, -140, 210),
					meshMaterial: new THREE.MeshLambertMaterial(({map:textureBrick}), .4, .2 ),
					physicsMaterial: _cannon.solidMaterial
				});

				// Block 5
				_cannon.createRigidBody({
					shape: new CANNON.Box(new CANNON.Vec3(30, 30, 30)),
					mass: 0,
					position: new CANNON.Vec3(-60, -80, 30),
					meshMaterial: new THREE.MeshLambertMaterial(({map:textureBrick}), .4, .2 ),
					physicsMaterial: _cannon.solidMaterial
				});
				_cannon.createRigidBody({
					shape: new CANNON.Box(new CANNON.Vec3(30, 30, 30)),
					mass: 0,
					position: new CANNON.Vec3(-60, -80, 90),
					meshMaterial: new THREE.MeshLambertMaterial(({map:textureBrick}), .4, .2 ),
					physicsMaterial: _cannon.solidMaterial
				});
				_cannon.createRigidBody({
					shape: new CANNON.Box(new CANNON.Vec3(30, 30, 30)),
					mass: 0,
					position: new CANNON.Vec3(-60, -80, 150),
					meshMaterial: new THREE.MeshLambertMaterial(({map:textureBrick}), .4, .2 ),
					physicsMaterial: _cannon.solidMaterial
				});
				_cannon.createRigidBody({
					shape: new CANNON.Box(new CANNON.Vec3(30, 30, 30)),
					mass: 0,
					position: new CANNON.Vec3(-60, -80, 210),
					meshMaterial: new THREE.MeshLambertMaterial(({map:textureBrick}), .4, .2 ),
					physicsMaterial: _cannon.solidMaterial
				});
				_cannon.createRigidBody({
					shape: new CANNON.Box(new CANNON.Vec3(30, 30, 30)),
					mass: 0,
					position: new CANNON.Vec3(-60, -80, 270),
					meshMaterial: new THREE.MeshLambertMaterial(({map:textureBrick}), .4, .2 ),
					physicsMaterial: _cannon.solidMaterial
				});
				
				_cannon.createRigidBody({
					shape: new CANNON.Box(new CANNON.Vec3(30, 30, 30)),
					mass: 2,
					position: new CANNON.Vec3(10, 10, 30),
					meshMaterial: new THREE.MeshLambertMaterial(({map:textureBrick}), .4, .2 ),
					physicsMaterial: _cannon.solidMaterial
				});
				
				// WHYYYYYYYYYYY
				_cannon.createRigidBody({
					shape: new CANNON.Sphere(new CANNON.Vec3(30,30,30)),
					mass: 1,
					position: new CANNON.Vec3(20, 30, 100),
					meshMaterial: new THREE.MeshLambertMaterial(({map:textureBrick}), .4, .2 ),
					physicsMaterial: _cannon.solidMaterial
				});
				
				//var grid = new THREE.GridHelper(floorSize, floorSize / 10);
				//grid.position.z = 0.5;
				//grid.rotation.x = window.game.helpers.degToRad(90);
				//_three.scene.add(grid);
			}
		},
		init: function(options) {
			_game.initComponents(options);

			_game.player.create();
			_game.level.create();

			_game.loop();
		},
		destroy: function() {
			// Annihilate the game world
			window.cancelAnimationFrame(animationFrameLoop);
			
			// Destroy everything and set it back up
			_cannon.destroy();
			_cannon.setup();
			_three.destroy();
			_three.setup();

			// Copy the initial player and level objects from the first run
			_game.player = window.game.helpers.cloneObject(gameDefaults.player);
			_game.level = window.game.helpers.cloneObject(gameDefaults.level);

			// And recreate everything again!
			_game.player.create();
			_game.level.create();

			_game.loop();
		},
		// The rendering loop
		loop: function() {
			animationFrameLoop = window.requestAnimationFrame(_game.loop);

			_cannon.updatePhysics();
			_game.player.update();

			_three.render();
		},
		// Initialize everything within the window
		initComponents: function (options) {
			_events = window.game.events();
			_three = window.game.three();
			_cannon = window.game.cannon();
			ui = window.game.ui();

			
			// Setup lights for THREE.js
			_three.setupLights = function () {
				var hemiLight = new THREE.HemisphereLight(window.game.static.colors.white, window.game.static.colors.white, 0.6);
				hemiLight.position.set(0, 0, -1);
				_three.scene.add(hemiLight);

				var pointLight = new THREE.PointLight(window.game.static.colors.white, 0.2);
				pointLight.position.set(0, 0, 500);
				_three.scene.add(pointLight);
				
				// Shadow casting light
				var spotLight = new THREE.SpotLight(window.game.static.colors.white);
				spotLight.position.set(1100, 1100, 200);
				
				spotLight.castShadow = true;
				spotLight.shadowDarkness = 0.5;
				
				spotLight.shadowMapWidth = 1024;
				spotLight.shadowMapHeight = 1024;
				
				spotLight.shadowCameraNear = 250;
				spotLight.shadowCameraFar = 3000;
				spotLight.shadowCameraFov = 70;
				
				_three.scene.add(spotLight);
			};

			_three.init(options);
			_cannon.init(_three);
			ui.init();
			_events.init();
			
			
			// Enable shadows for THREE.js
			_three.renderer.shadowMapEnabled = true;
			_three.renderer.shadowMapType = THREE.PCFSoftShadowMap;

		}
	};

	var _events;
	var _three;
	var _cannon;
	var ui;
	var animationFrameLoop;
	var gameDefaults = {
		player: window.game.helpers.cloneObject(game.player),
		level: window.game.helpers.cloneObject(game.level)
	};

	return _game;
};