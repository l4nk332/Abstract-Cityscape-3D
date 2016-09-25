'use strict';
/* globals THREE: false, Stats: false, dat: false, AudioContext: false, tinycolor: false */

// ================
// Global Functions
// ================
function initStats() {
	var stats = new Stats();
	stats.setMode(0);
	stats.domElement.style.position = 'absolute';
	stats.domElement.style.left = '0px';
	stats.domElement.style.top = '0px';
	document.getElementById("Stats-output").appendChild(stats.domElement);
	return stats;
}

function keyPressFunctions(event) {
	event.preventDefault();
	if (event.keyCode == 49) {
		camMode = "orbit";
	}
	else if (event.keyCode == 50) {
		camMode = "fly";
	}
	else if (event.keyCode == 51) {
		camMode = "orbitManual";
	}

	if (event.keyCode == 48) {
		if (audio.paused) {
			audio.play();
		} else {
			audio.pause();
		}
	}
}

function getAverageVolume(array) {
	var values = 0;
	var average;
	var length = array.length;

	for (var i = 0; i < length; i++) {
		values += array[i];
	}

	average = Math.floor(values / length);
	return average;
}

function getColor(currentVolume) {
	// For wide range
	var scale = Math.min(Math.floor((currentVolume*540)/256), 360);
	// For normal range
	//var scale = Math.min(Math.floor((currentVolume*360)/256), 360);
	var color = "hsl("+scale+", 100%, 50%)";
	return color;
}

function incrementStructureCount() {
	structureCount++;
}

// ================
// Global Variables
// ================
var orbitCamera;
var orbitManual;
var flyCamera;
var renderer;
var camMode = "orbit";
var structureCount = 0;
var audio, audioCtx, audioSrc, analyser, frequencyData, musicOn = false;

function init() {
	// ===================
	// Audio Context Setup
	// ===================

	audioCtx = new AudioContext();
	audio = document.getElementById("myAudio");
	audioSrc = audioCtx.createMediaElementSource(audio);
	analyser = audioCtx.createAnalyser();
	audioSrc.connect(analyser);
	audioSrc.connect(audioCtx.destination);
	analyser.smoothingTimeConstant = 0.3;
	analyser.fftSize = 512;
	// freqBinCount tells how many values you will recieve from analyser
	frequencyData = new Uint8Array(analyser.frequencyBinCount);

	// ===============
	// THREE.js Set-up
	// ===============
	orbitCamera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 300000);
	orbitManual = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 300000);
	flyCamera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 300000);

	renderer = new THREE.WebGLRenderer();
	renderer.setClearColor(new THREE.Color(0x000000));
	renderer.setSize(window.innerWidth, window.innerHeight);

	var stats = initStats();

	// =====================
	// Helper Objects
	// =====================
	var UTILS = {
		randomValue: function(max=10, min=5) {
			return Math.floor(Math.max(Math.random() * max, min));
		},
		randomRGBA: function() {
			return "rgba(" +
				this.randomValue(255) + ", " +
				this.randomValue(255) + ", " +
				this.randomValue(255) + ", 1)";
		}
	};

	var TEXTURES = {
		// concrete: new THREE.TextureLoader().load("assets/textures/concrete_wall.png"),
		concrete: new THREE.ImageUtils.loadTexture("assets/textures/concrete_wall.png"),
		particle: (function() {
			var type = "particle";
			var width = 16;
			var height = 16;
			var canvas = document.createElement('canvas');
			canvas.width = width;
			canvas.height = height;
			var context = canvas.getContext('2d');
			var gradient = context.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, width / 2);
			gradient.addColorStop(0, 'rgba(255,255,255,1)');
			gradient.addColorStop(0.2, 'rgba(0,255,255,1)');
			gradient.addColorStop(0.4, 'rgba(0,0,64,1)');
			gradient.addColorStop(1, 'rgba(0,0,0,1)');
			context.fillStyle = gradient;
			context.fillRect(0, 0, width, height);
			var texture = new THREE.Texture(canvas);
			texture.needsUpdate = true;
			return texture;
		})(),
		// stars: new THREE.TextureLoader().load("assets/textures/stars.jpg")
		stars: new THREE.ImageUtils.loadTexture("assets/textures/stars.jpg"),
		randomParticle: function() {
			var type = "randomParticle";
			var width = 16;
			var height = 16;
			var canvas = document.createElement('canvas');
			canvas.width = width;
			canvas.height = height;
			var context = canvas.getContext('2d');
			var gradient = context.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, width / 2);
			gradient.addColorStop(0, 'rgba(255,255,255,1)');
			gradient.addColorStop(0.2, UTILS.randomRGBA());
			gradient.addColorStop(0.4, UTILS.randomRGBA());
			gradient.addColorStop(1, 'rgba(0,0,0,1)');
			context.fillStyle = gradient;
			context.fillRect(0, 0, width, height);
			var texture = new THREE.Texture(canvas);
			texture.needsUpdate = true;
			return texture;
		}
	};

	// ========
	// OOP Code
	// ========
	var ParticleCloud = function ParticleCloud(geometry) {
		this.type = "particleCloud";
		this.geometry = geometry;
		// Moves pivot point to bottom
		//this.geometry.applyMatrix(new THREE.Matrix4().makeTranslation(0, (this.geometry.parameters.height)/2, 0));
		this.texture = TEXTURES.particle;
		this.material = new THREE.PointCloudMaterial({
			color: 0xffffff,
			size: 3,
			transparent: true,
			blending: THREE.AdditiveBlending,
			map: this.texture
		});
		this.mesh = new THREE.PointCloud(this.geometry, this.material);
		this.mesh.sortParticles = true;
	};

	var Sky = function (radius) {
		this.type = "sky";
		this.geometry = new THREE.Geometry();

		this.geometryA = new THREE.DodecahedronGeometry(radius, 3);
		this.meshA = new THREE.Mesh(this.geometryA);
		this.meshA.updateMatrix();
		this.geometry.merge(this.geometryA, this.meshA.matrix);

		this.geometryB = new THREE.DodecahedronGeometry(radius, 3);
		this.meshB = new THREE.Mesh(this.geometryB);
		this.meshB.rotation.x += Math.PI/5;
		this.meshB.rotation.y += Math.PI/5;
		this.meshB.rotation.z += Math.PI/5;
		this.meshB.updateMatrix();
		this.geometry.merge(this.geometryB, this.meshB.matrix);

		this.geometryC = new THREE.DodecahedronGeometry(radius, 3);
		this.meshC = new THREE.Mesh(this.geometryC);
		this.meshC.rotation.x += Math.PI/7;
		this.meshC.rotation.y += Math.PI/7;
		this.meshC.rotation.z += Math.PI/7;
		this.meshC.updateMatrix();
		this.geometry.merge(this.geometryC, this.meshC.matrix);


		this.texture = TEXTURES.stars;
		this.texture = TEXTURES.particle;
		this.material = new THREE.PointCloudMaterial({
			color: 0xffffff,
			size: 30,
			transparent: true,
			blending: THREE.AdditiveBlending,
			map: this.texture
		});
		this.mesh = new THREE.PointCloud(this.geometry, this.material);
		this.mesh.sortParticles = true;
	};

	Sky.prototype.surround = function (object) {
		var offsetX = object.size / 4;
		var offsetY = object.size / 4;
		this.mesh.position.set(offsetX, 0, offsetY);
	};

	var City = function (size, numberOfBoroughs) {
		this.size = size;
		this.numberOfBoroughs = numberOfBoroughs;
		this.scene = new THREE.Scene();
		this.entities = {};
		this.landscape = new Landscape(this.size, this.size);
		this.add(this.landscape);
	};

	City.prototype.add = function (object) {
		if (!this.entities.hasOwnProperty(object.type)) {
			this.entities[object.type] = [];
		}
		this.entities[object.type].push(object);
		this.scene.add(object.mesh);
	};

	City.prototype.generateGrid = function () {
		for (var i = 0; i < this.numberOfBoroughs; i++) {
			for (var j = 0; j < this.numberOfBoroughs; j++) {
				var boroughSize = this.size/this.numberOfBoroughs;
				var maxBlockScale;
				var blockSize;

				if ((i === 0 && j === 0) || (i === 0 && j === this.numberOfBoroughs-1) || (i === this.numberOfBoroughs-1 && j === 0) || (i === this.numberOfBoroughs-1 && j === this.numberOfBoroughs-1)) {
					// Corner
					maxBlockScale = 3;
					blockSize = boroughSize/8;
				} else if ((i === (this.numberOfBoroughs/2)-1) && (j === (this.numberOfBoroughs/2)-1) ||
						(i === (this.numberOfBoroughs/2)) && (j === (this.numberOfBoroughs/2)) ||
						(i === (this.numberOfBoroughs/2)) && (j === (this.numberOfBoroughs/2)-1) ||
						(i === (this.numberOfBoroughs/2)-1) && (j === (this.numberOfBoroughs/2))) {
					// Center
					maxBlockScale = 5;
					blockSize = boroughSize/4;
				}
				// else if ((i === (this.numberOfBoroughs-1)/2) && (j === (this.numberOfBoroughs-1)/2)) {
				// 	// Cross
				// 	maxBlockScale = 4;
				// 	blockSize = boroughSize/6;
				// }
				else {
					maxBlockScale = 1;
					blockSize = boroughSize/8;
				}

				var borough = new Borough(boroughSize, blockSize, blockSize/3, blockSize*maxBlockScale, blockSize/3);
				borough.generateGrid();
				borough.position(i*borough.size/2, 0, j*borough.size/2);
				this.add(borough);
			}
		}
	};

	var Borough = function (size, blockSize, maxBuildingWidth, maxBuildingHeight, maxBuildingDepth) {
		this.size = size;
		this.blockSize = blockSize;
		this.numberOfBlocks = (this.size) / this.blockSize / 2;
		this.type = "borough";
		this.maxBuildingWidth = maxBuildingWidth;
		this.maxBuildingHeight = maxBuildingHeight;
		this.maxBuildingDepth = maxBuildingDepth;
		this.geometry = new THREE.Geometry();
		this.material = new THREE.MeshLambertMaterial({map: TEXTURES.concrete});
	};

	Borough.prototype.generateBlock = function () {
		var block = new Block(this.blockSize, this.maxBuildingWidth, this.maxBuildingHeight, this.maxBuildingDepth);
		block.fillSpace();
		return block;
	};

	Borough.prototype.generateGrid = function () {
		for (var i = 0; i < this.numberOfBlocks; i++) {
			for (var j = 0; j < this.numberOfBlocks; j++) {
				var block = this.generateBlock();
				block.position(2 * i * block.size/2, 0, 2 * j * block.size/2);
				block.mesh.updateMatrix();
				this.geometry.merge(block.geometry, block.mesh.matrix);
				this.mesh = new THREE.Mesh(this.geometry, this.material);
			}
		}
	};

	Borough.prototype.position = function (x, y, z) {
		this.mesh.position.x = x;
		this.mesh.position.y = y;
		this.mesh.position.z = z;
	};

	var Block = function Block(size, maxBuildingWidth, maxBuildingHeight, maxBuildingDepth) {
		if (size < maxBuildingWidth || size < maxBuildingDepth) {
			throw new Error("Block size must be less than building width/depth");
		}
		this.type = "block";
		this.size = size;
		this.maxBuildingWidth = maxBuildingWidth;
		this.maxBuildingHeight = maxBuildingHeight;
		this.maxBuildingDepth = maxBuildingDepth;
		this.remainingX = this.size;
		this.remainingZ = this.size;
		this.geometry = new THREE.Geometry();
	};

	Block.prototype.generateBuilding = function () {
		var buildingWidth = UTILS.randomValue(this.maxBuildingWidth, this.maxBuildingWidth / 5);
		var buildingDepth = UTILS.randomValue(this.maxBuildingDepth, this.maxBuildingDepth / 5);
		var buildingHeight = UTILS.randomValue(this.maxBuildingHeight, this.maxBuildingHeight / 5);
		var structure = new Structure(buildingWidth, buildingHeight, buildingDepth);
		var building = new Building(structure);
		return building;
	};

	Block.prototype.canPlace = function (building, axis) {
		if (axis === "x") {
			return building.width <= this.remainingX;
		}
		if (axis === "z") {
			return building.depth <= this.remainingZ;
		}
	};

	Block.prototype.place = function (building) {
		var xOffset = building.width / 2;
		var zOffset = building.depth / 2;
		var xPos = this.size - this.remainingX + xOffset;
		var zPos = this.size - this.remainingZ + zOffset;
		building.mesh.translateX(xPos);
		building.mesh.translateZ(zPos);

		building.mesh.updateMatrix();
		this.geometry.merge(building.geometry, building.mesh.matrix);

		this.mesh = new THREE.Mesh(this.geometry);
	};

	Block.prototype.fillSpace = function () {
		var initialBuilding = this.generateBuilding();
		var building = initialBuilding;
		var deepestBuilding = building;
		while (this.canPlace(deepestBuilding, "z")) {
			while (this.canPlace(building, "x")) {
				if (building.depth > deepestBuilding.depth) {
					deepestBuilding = building;
				}
				this.place(building);
				this.remainingX -= building.width;
				building = this.generateBuilding();
			}
			this.remainingX = this.size;
			this.remainingZ -= deepestBuilding.depth;
		}
	};

	Block.prototype.position = function (x, y, z) {
		this.mesh.position.x = x;
		this.mesh.position.y = y;
		this.mesh.position.z = z;
	};

	var Landscape = function Landscape(width, depth) {
		this.width = width/2;
		this.depth = depth/2;
		this.type = "landscape";
		this.geometry = new THREE.PlaneBufferGeometry(this.width, this.depth, 20, 20);
		//this.materialA = new THREE.MeshLambertMaterial({color: 0x0000ff, wireframe:true, wireframeLinewidth: 2});
		this.material = new THREE.MeshBasicMaterial({color: 0xdddddd, opacity: 0.7, transparent: true});
		//this.materials = [this.materialA, this.materialB];
		//this.mesh = new THREE.SceneUtils.createMultiMaterialObject(this.geometry, this.materials);
		this.mesh = new THREE.Mesh(this.geometry, this.material);
		// Set landscape flat at (0, 0, 0)
		this.mesh.rotation.x = -0.5 * Math.PI;
		this.mesh.position.x = this.width / 2;
		this.mesh.position.y = 0;
		this.mesh.position.z = this.depth / 2;
	};

	var Structure = function Structure(width, height, depth) {
		incrementStructureCount();
		this.width = width;
		this.height = height || Math.max(Math.ceil(Math.random() * 15), 5);
		this.depth = depth;
		this.types = ["box", "cylinder"];
		this.type = this.types[UTILS.randomValue(this.types.length, 0)];
		var randVal = Math.random();

		// if (this.type === "box") {
		if (randVal < 0.7) {
			// BoxGeometry Structure
			this.geometry = new THREE.BoxGeometry(this.width, this.height, this.depth);
			// Moves pivot point to bottom of the cube instead of its center
			this.geometry.applyMatrix(new THREE.Matrix4().makeTranslation(0, this.height / 2, 0));
			// Removes bottom face (optimization to avoid wasteful render)
			this.geometry.faces.splice(6, 1);
		}

		// else if (this.type === "cylinder") {
		else if (randVal >= 0.7) {
			// CylinderGeometry Structure
			let radiusTop = Math.min(this.width, this.depth);
			let radiusBottom = Math.max(this.width, this.depth);
			// To prevent overlap
			this.width = radiusBottom;
			this.depth = radiusBottom;
			let radiusSegments = UTILS.randomValue(5, 3);
			this.geometry = new THREE.CylinderGeometry(radiusTop, radiusBottom, this.height, radiusSegments);
			this.geometry.applyMatrix(new THREE.Matrix4().makeTranslation(0, this.height / 2, 0));
			// Need to remove bottom face of cylinder geometry
		}

		else {
			throw new Error("Invalid structure type...");
		}

		this.mesh = new THREE.Mesh(this.geometry);
	};

	var Building = function (structure) {
		this.type = "building";
		this.width = structure.width;
		this.height = structure.height;
		this.depth = structure.depth;

		this.geometry = new THREE.Geometry();

		structure.mesh.scale.set(0.5, 1, 0.5);
		structure.mesh.updateMatrix();
		this.geometry.merge(structure.geometry, structure.mesh.matrix);

		this.mesh = new THREE.Mesh(this.geometry);
	};

	Building.prototype.position = function (x, y, z) {
		var offsetX = this.width / 2;
		var offsetZ = this.depth / 2;
		this.mesh.position.x = x + offsetX;
		this.mesh.position.y = y;
		this.mesh.position.z = z + offsetZ;
	};

	// ==================
	// OOP Initialization
	// ==================
	var city = new City(3000, 12);
	var sky = new Sky(2000);
	sky.surround(city);
	city.add(sky);
	city.generateGrid();

	// ======
	// Lights
	// ======
	var hemiLight = new THREE.HemisphereLight(0x0000ff, 0x00ff00, 0.6);
	hemiLight.position.set(0, 500, 0);
	city.scene.add(hemiLight);

	var pointLight = new THREE.PointLight(0xf0e48a, 2, 350);
	pointLight.position.set(750, -15, 750);
	city.scene.add(pointLight);
	var sphereSize = 5;
	var pointLightHelper = new THREE.PointLightHelper( pointLight, sphereSize );
	city.scene.add( pointLightHelper );

	var spotLightA = new THREE.SpotLight(0xffff00);
	spotLightA.position.set(-50, 100, -50);
	var spotATarget = new THREE.Object3D();
	spotATarget.position.set(50, 0, 50);
	spotLightA.target = spotATarget;
	city.scene.add(spotATarget);
	city.scene.add(spotLightA);

	var spotLightB = new THREE.SpotLight(0xff0000);
	spotLightB.position.set(-50, 100, 1550);
	var spotBTarget = new THREE.Object3D();
	spotBTarget.position.set(50, 0, 1450);
	spotLightB.target = spotBTarget;
	city.scene.add(spotBTarget);
	city.scene.add(spotLightB);

	var spotLightC= new THREE.SpotLight(0x00ff00);
	spotLightC.position.set(1550, 100, 1550);
	var spotCTarget = new THREE.Object3D();
	spotCTarget.position.set(1450, 0, 1450);
	spotLightC.target = spotCTarget;
	city.scene.add(spotCTarget);
	city.scene.add(spotLightC);

	var spotLightD = new THREE.SpotLight(0x0000ff);
	spotLightD.position.set(1550, 100, -50);
	var spotDTarget = new THREE.Object3D();
	spotDTarget.position.set(1450, 0, 50);
	spotLightD.target = spotDTarget;
	city.scene.add(spotDTarget);
	city.scene.add(spotLightD);

	// =======
	// Cameras
	// =======
	orbitCamera.position.x = -200;
	orbitCamera.position.y = 200;
	orbitCamera.position.z = 200;
	var orbitControls = new THREE.OrbitControls(orbitCamera, renderer.domElement);
	orbitControls.autoRotate = true;
	orbitControls.center.set(city.landscape.mesh.position.x, 50, city.landscape.mesh.position.z);

	orbitManual.position.x = -200;
	orbitManual.position.y = 200;
	orbitManual.position.z = 200;
	var orbitManualControls = new THREE.OrbitControls(orbitManual, renderer.domElement);
	orbitManualControls.autoRotate = false;
	orbitManualControls.center.set(city.landscape.mesh.position.x, 50, city.landscape.mesh.position.z);

	flyCamera.position.x = 0;
	flyCamera.position.y = 300;
	flyCamera.position.z = 0;
	flyCamera.lookAt(new THREE.Vector3(city.size / 2, 0, city.size / 2));
	var flyControls = new THREE.FlyControls(flyCamera, renderer.domElement);
	flyControls.movementSpeed = 100;
	flyControls.domElement = document.querySelector("#WebGL-output");
	flyControls.rollSpeed = Math.PI/14;
	flyControls.autoForward = false;
	flyControls.dragToLook = false;


	// ========
	// Controls
	// ========
	var controls = new function () { // jshint ignore: line
		// Hemi light controls
		this.hemisphere = true;
		this.hemiColor = 0xe2dede;
		this.hemiSkyColor = 0xcdc9c9;
		this.hemiIntensity = 0.6;
		// PointLight Controls
		this.point = true;
		this.pointColor = 0xf0e48a;
		this.pointIntesity = 2;
		this.pointDistance = 350;
		this.pointDecay = 1;
		this.pointX = 750;
		this.pointY = -15;
		this.pointZ = 750;
		// SpotLight A
		this.spotA = true;
		this.spotAColor = 0xffff00;
		this.spotAIntesity = 2.6;
		this.spotADistance = 1500;
		this.spotADecay = 2;
		this.spotAAngle = Math.PI/2;
		this.spotAPenumbra = 0;
		this.spotAX = -50;
		this.spotAY = 75;
		this.spotAZ = -50;
		// SpotLight B
		this.spotB = true;
		this.spotBColor = 0xff0000;
		this.spotBIntesity = 2.6;
		this.spotBDistance = 1500;
		this.spotBDecay = 2;
		this.spotBAngle = Math.PI/2;
		this.spotBPenumbra = 0;
		this.spotBX = -50;
		this.spotBY = 75;
		this.spotBZ = 1550;
		// SpotLight C
		this.spotC = true;
		this.spotCColor = 0x00ff00;
		this.spotCIntesity = 2.6;
		this.spotCDistance = 1500;
		this.spotCDecay = 2;
		this.spotCAngle = Math.PI/2;
		this.spotCPenumbra = 0;
		this.spotCX = 1550;
		this.spotCY = 75;
		this.spotCZ = 1550;
		// SpotLight D
		this.spotD = true;
		this.spotDColor = 0x0000ff;
		this.spotDIntesity = 2.6;
		this.spotDDistance = 1500;
		this.spotDDecay = 2;
		this.spotDAngle = Math.PI/2;
		this.spotDPenumbra = 0;
		this.spotDX = 1550;
		this.spotDY = 75;
		this.spotDZ = -50;
	}; // jshint ignore: line

	var gui = new dat.GUI();

	var hemiFolder = gui.addFolder("Hemisphere Light");
	hemiFolder.add(controls, 'hemisphere').onChange(function (e) {
		if (!e) {
			hemiLight.intensity = 0;
		} else {
			hemiLight.intensity = controls.hemiIntensity;
		}
	});
	hemiFolder.addColor(controls, 'hemiColor').onChange(function (e) {
		hemiLight.groundColor = new THREE.Color(e);
	});
	hemiFolder.addColor(controls, 'hemiSkyColor').onChange(function (e) {
		hemiLight.color = new THREE.Color(e);
	});
	hemiFolder.add(controls, 'hemiIntensity', 0, 5).onChange(function (e) {
		hemiLight.intensity = e;
	});

	var pointFolder = gui.addFolder("Point Light");
	pointFolder.add(controls, 'point').onChange(function(e) {
		if (!e) {
			pointLight.intensity = 0;
		} else {
			pointLight.intensity = controls.pointIntesity;
		}
	});
	pointFolder.addColor(controls, 'pointColor').onChange(function(e) {
		pointLight.color = new THREE.Color(e);
	});
	pointFolder.add(controls, 'pointIntesity', 0, 20).onChange(function(e) {
		pointLight.intensity = e;
	});
	pointFolder.add(controls, 'pointDistance', 0, 1500).onChange(function(e) {
		pointLight.distance = e;
	});
	pointFolder.add(controls, 'pointDecay', 0, 10).onChange(function(e) {
		pointLight.decay = e;
	});
	pointFolder.add(controls, 'pointX', 0, 1500).onChange(function(e) {
		pointLight.position.set(e, controls.pointY, controls.pointZ);
	});
	pointFolder.add(controls, 'pointY', -30, 150).onChange(function(e) {
		pointLight.position.set(controls.pointX, e, controls.pointZ);
	});
	pointFolder.add(controls, 'pointZ', 0, 1500).onChange(function(e) {
		pointLight.position.set(controls.pointX, controls.pointY, e);
	});

	var spotAFolder = gui.addFolder("Spot Light A");
	spotAFolder.add(controls, 'spotA').onChange(function(e) {
		if (!e) {
			spotLightA.intensity = 0;
		} else {
			spotLightA.intensity = controls.spotAIntesity;
		}
	});
	spotAFolder.addColor(controls, 'spotAColor').onChange(function(e) {
		spotLightA.color = new THREE.Color(e);
	});
	spotAFolder.add(controls, 'spotAIntesity', 0, 20).onChange(function(e) {
		spotLightA.intensity = e;
	});
	spotAFolder.add(controls, 'spotADistance', 0, 1500).onChange(function(e) {
		spotLightA.distance = e;
	});
	spotAFolder.add(controls, 'spotADecay', 0, 10).onChange(function(e) {
		spotLightA.decay = e;
	});
	spotAFolder.add(controls, 'spotAAngle', 0, Math.PI/2).onChange(function(e) {
		spotLightA.angle = e;
	});
	spotAFolder.add(controls, 'spotAPenumbra', 0, 1).onChange(function(e) {
		spotLightA.penumbra = e;
	});
	spotAFolder.add(controls, 'spotAX', -100, 1600).onChange(function(e) {
		spotLightA.position.set(e, controls.spotAY, controls.spotAZ);
	});
	spotAFolder.add(controls, 'spotAY', -30, 150).onChange(function(e) {
		spotLightA.position.set(controls.spotAX, e, controls.spotAZ);
	});
	spotAFolder.add(controls, 'spotAZ', -100, 1600).onChange(function(e) {
		spotLightA.position.set(controls.spotAX, controls.spotAY, e);
	});

	var spotBFolder = gui.addFolder("Spot Light B");
	spotBFolder.add(controls, 'spotB').onChange(function(e) {
		if (!e) {
			spotLightB.intensity = 0;
		} else {
			spotLightB.intensity = controls.spotAIntesity;
		}
	});
	spotBFolder.addColor(controls, 'spotBColor').onChange(function(e) {
		spotLightB.color = new THREE.Color(e);
	});
	spotBFolder.add(controls, 'spotBIntesity', 0, 20).onChange(function(e) {
		spotLightB.intensity = e;
	});
	spotBFolder.add(controls, 'spotBDistance', 0, 1500).onChange(function(e) {
		spotLightB.distance = e;
	});
	spotBFolder.add(controls, 'spotBDecay', 0, 10).onChange(function(e) {
		spotLightB.decay = e;
	});
	spotBFolder.add(controls, 'spotBAngle', 0, Math.PI/2).onChange(function(e) {
		spotLightB.angle = e;
	});
	spotBFolder.add(controls, 'spotBPenumbra', 0, 1).onChange(function(e) {
		spotLightB.penumbra = e;
	});
	spotBFolder.add(controls, 'spotBX', -100, 1600).onChange(function(e) {
		spotLightB.position.set(e, controls.spotBY, controls.spotBZ);
	});
	spotBFolder.add(controls, 'spotBY', -30, 150).onChange(function(e) {
		spotLightB.position.set(controls.spotBX, e, controls.spotBZ);
	});
	spotBFolder.add(controls, 'spotBZ', -100, 1600).onChange(function(e) {
		spotLightB.position.set(controls.spotBX, controls.spotBY, e);
	});

	var spotCFolder = gui.addFolder("Spot Light C");
	spotCFolder.add(controls, 'spotC').onChange(function(e) {
		if (!e) {
			spotLightC.intensity = 0;
		} else {
			spotLightC.intensity = controls.spotAIntesity;
		}
	});
	spotCFolder.addColor(controls, 'spotCColor').onChange(function(e) {
		spotLightC.color = new THREE.Color(e);
	});
	spotCFolder.add(controls, 'spotCIntesity', 0, 20).onChange(function(e) {
		spotLightC.intensity = e;
	});
	spotCFolder.add(controls, 'spotCDistance', 0, 1500).onChange(function(e) {
		spotLightC.distance = e;
	});
	spotCFolder.add(controls, 'spotCDecay', 0, 10).onChange(function(e) {
		spotLightC.decay = e;
	});
	spotCFolder.add(controls, 'spotCAngle', 0, Math.PI/2).onChange(function(e) {
		spotLightC.angle = e;
	});
	spotCFolder.add(controls, 'spotCPenumbra', 0, 1).onChange(function(e) {
		spotLightC.penumbra = e;
	});
	spotCFolder.add(controls, 'spotCX', -100, 1600).onChange(function(e) {
		spotLightC.position.set(e, controls.spotCY, controls.spotCZ);
	});
	spotCFolder.add(controls, 'spotCY', -30, 150).onChange(function(e) {
		spotLightC.position.set(controls.spotCX, e, controls.spotCZ);
	});
	spotCFolder.add(controls, 'spotCZ', -100, 1600).onChange(function(e) {
		spotLightC.position.set(controls.spotCX, controls.spotCY, e);
	});

	var spotDFolder = gui.addFolder("Spot Light D");
	spotDFolder.add(controls, 'spotD').onChange(function(e) {
		if (!e) {
			spotLightD.intensity = 0;
		} else {
			spotLightD.intensity = controls.spotAIntesity;
		}
	});
	spotDFolder.addColor(controls, 'spotDColor').onChange(function(e) {
		spotLightD.color = new THREE.Color(e);
	});
	spotDFolder.add(controls, 'spotDIntesity', 0, 20).onChange(function(e) {
		spotLightD.intensity = e;
	});
	spotDFolder.add(controls, 'spotDDistance', 0, 1500).onChange(function(e) {
		spotLightD.distance = e;
	});
	spotDFolder.add(controls, 'spotDDecay', 0, 10).onChange(function(e) {
		spotLightD.decay = e;
	});
	spotDFolder.add(controls, 'spotDAngle', 0, Math.PI/2).onChange(function(e) {
		spotLightD.angle = e;
	});
	spotDFolder.add(controls, 'spotDPenumbra', 0, 1).onChange(function(e) {
		spotLightD.penumbra = e;
	});
	spotDFolder.add(controls, 'spotDX', -100, 1600).onChange(function(e) {
		spotLightD.position.set(e, controls.spotDY, controls.spotDZ);
	});
	spotDFolder.add(controls, 'spotDY', -30, 150).onChange(function(e) {
		spotLightD.position.set(controls.spotDX, e, controls.spotDZ);
	});
	spotDFolder.add(controls, 'spotDZ', -100, 1600).onChange(function(e) {
		spotLightD.position.set(controls.spotDX, controls.spotDY, e);
	});

	console.log(structureCount);
	// ==============
	// Render Section
	// ==============
	var clock = new THREE.Clock();

	// add the output of the renderer to the html element
	document.getElementById("WebGL-output").appendChild(renderer.domElement);

	// call the render function
	renderer.render(city.scene, orbitCamera);
	//renderer.render(city.scene, flyCamera);

	function renderScene() {
		stats.update();
		sky.mesh.rotation.x += 0.0003;
		sky.mesh.rotation.y += 0.0005;
		sky.mesh.rotation.z += 0.0003;

		sky.mesh.material.map = TEXTURES.randomParticle();
		sky.mesh.material.map.needsUpdate = true;

		var delta = clock.getDelta();

		if (camMode === "orbit") {
			orbitCamera.lookAt(new THREE.Vector3(city.size / 4, 0, city.size / 4));
			orbitControls.update(delta);
			renderer.render(city.scene, orbitCamera);
		}

		else if (camMode === "orbitManual") {
			orbitManual.lookAt(new THREE.Vector3(city.size / 4, 0, city.size / 4));
			orbitManualControls.update(delta);
			renderer.render(city.scene, orbitManual);
		}

		else if (camMode === "fly") {
			flyControls.update(delta);
			renderer.clear();
			renderer.render(city.scene, flyCamera);
		}

		// Audio Code
		// ==========
		if (!audio.paused) {
			// update data in frequencyData
			analyser.getByteFrequencyData(frequencyData);
			// render frame based on values in frequencyData
			var currentVolume = getAverageVolume(frequencyData);
			//console.log(currentVolume);
			var mainColor = tinycolor(getColor(currentVolume));
			var complementTetradColors = mainColor.complement().tetrad();
			var pointLightColor = mainColor.toHexString();
			var spotLightAColor = complementTetradColors[0].toHexString();
			var spotLightBColor = complementTetradColors[1].toHexString();
			var spotLightCColor = complementTetradColors[2].toHexString();
			var spotLightDColor = complementTetradColors[3].toHexString();

			//console.log(color);
			hemiLight.intensity = 0;
			pointLight.color = new THREE.Color(pointLightColor);
			spotLightA.color = new THREE.Color(spotLightAColor);
			spotLightB.color = new THREE.Color(spotLightBColor);
			spotLightC.color = new THREE.Color(spotLightCColor);
			spotLightD.color = new THREE.Color(spotLightDColor);
			//pointLight.color = new THREE.Color(Math.floor(Math.random()*2), Math.floor(Math.random()*2), Math.floor(Math.random()*2));
			//document.body.style.backgroundColor = color;
			// document.body.style.backgroundColor = "rgb("+[currentVolume, currentVolume, currentVolume].join(",") +")";
		}

		requestAnimationFrame(renderScene);
	}
	renderScene();

}


// ===============
// Event Listeners
// ===============
window.onload = init;

window.addEventListener('resize', function () {
	orbitCamera.aspect = window.innerWidth / window.innerHeight;
	orbitCamera.updateProjectionMatrix();
	orbitManual.aspect = window.innerWidth / window.innerHeight;
	orbitManual.updateProjectionMatrix();
	flyCamera.aspect = window.innerWidth / window.innerHeight;
	flyCamera.updateProjectionMatrix();
	renderer.setSize(window.innerWidth, window.innerHeight);
});

window.addEventListener("keypress", keyPressFunctions);
