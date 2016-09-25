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

	if (event.keyCode == 57) {
		if (hemiLight.intensity === 0) {
			hemiLight.intensity = 0.6;
		} else {
			hemiLight.intensity = 0;
		}
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
var hemiLight;
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

	renderer = new THREE.WebGLRenderer({alpha: true, antialias: true});
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
		},
		lensFlare: {
			flare0: THREE.ImageUtils.loadTexture("assets/textures/lensflare/lensflare0.png"),
			flareColor: new THREE.Color(0xfc70aa),
			flare3: THREE.ImageUtils.loadTexture("assets/textures/lensflare/lensflare3.png")
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
		//this.material = new THREE.MeshLambertMaterial({map: TEXTURES.concrete});
		this.material = new THREE.MeshPhongMaterial({color: 0xb9c9d2, emissive: 0x000000, specular: 0xe6e6e6, shininess: 100});
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

	// ===============
	// Lights & Flares
	// ===============
	// hemiLight defined globally
	hemiLight = new THREE.HemisphereLight(0xcd165a, 0x630ccf, 0.6);
	hemiLight.position.set(0, 500, 0);
	city.scene.add(hemiLight);

	var pointLight = new THREE.PointLight(0xf0e48a, 2, 350);
	pointLight.decay = 1;
	pointLight.position.set(750, -15, 750);
	city.scene.add(pointLight);

	var flareLight = new THREE.PointLight(0x7d8cfe, 0.7, 350, 2);
	flareLight.position.set(750, 225, 750);
	city.scene.add(flareLight);
	// var sphereSize = 5;
	// var pointLightHelper = new THREE.PointLightHelper( flareLight, sphereSize );
	//city.scene.add( pointLightHelper );
	var lensFlare = new THREE.LensFlare(TEXTURES.lensFlare.flare0, 350, 0, THREE.AdditiveBlending, TEXTURES.flareColor);
	lensFlare.add(TEXTURES.lensFlare.flare3, 60, 0.6, THREE.AdditiveBlending);
	lensFlare.add(TEXTURES.lensFlare.flare3, 70, 0.7, THREE.AdditiveBlending);
	lensFlare.add(TEXTURES.lensFlare.flare3, 120, 0.9, THREE.AdditiveBlending);
	lensFlare.add(TEXTURES.lensFlare.flare3, 70, 1, THREE.AdditiveBlending);
	lensFlare.position.copy(flareLight.position);
	city.scene.add(lensFlare);

	var spotLightA = new THREE.SpotLight(0xffff00);
	spotLightA.intensity = 2.6;
	spotLightA.distance = 1500;
	spotLightA.decay = 2;
	spotLightA.angle = Math.PI/2;
	spotLightA.penumbra = 0;
	spotLightA.position.set(-50, 100, -50);
	var spotATarget = new THREE.Object3D();
	spotATarget.position.set(50, 0, 50);
	spotLightA.target = spotATarget;
	city.scene.add(spotATarget);
	city.scene.add(spotLightA);

	var spotLightB = new THREE.SpotLight(0xff0000);
	spotLightB.intensity = 2.6;
	spotLightB.distance = 1500;
	spotLightB.decay = 2;
	spotLightB.angle = Math.PI/2;
	spotLightB.penumbra = 0;
	spotLightB.position.set(-50, 100, 1550);
	var spotBTarget = new THREE.Object3D();
	spotBTarget.position.set(50, 0, 1450);
	spotLightB.target = spotBTarget;
	city.scene.add(spotBTarget);
	city.scene.add(spotLightB);

	var spotLightC= new THREE.SpotLight(0x00ff00);
	spotLightC.intensity = 2.6;
	spotLightC.distance = 1500;
	spotLightC.decay = 2;
	spotLightC.angle = Math.PI/2;
	spotLightC.penumbra = 0;
	spotLightC.position.set(1550, 100, 1550);
	var spotCTarget = new THREE.Object3D();
	spotCTarget.position.set(1450, 0, 1450);
	spotLightC.target = spotCTarget;
	city.scene.add(spotCTarget);
	city.scene.add(spotLightC);

	var spotLightD = new THREE.SpotLight(0x0000ff);
	spotLightD.intensity = 2.6;
	spotLightD.distance = 1500;
	spotLightD.decay = 2;
	spotLightD.angle = Math.PI/2;
	spotLightD.penumbra = 0;
	spotLightD.position.set(1550, 100, -50);
	var spotDTarget = new THREE.Object3D();
	spotDTarget.position.set(1450, 0, 50);
	spotLightD.target = spotDTarget;
	city.scene.add(spotDTarget);
	city.scene.add(spotLightD);

	// ==================
	// Cameras & Controls
	// ==================
	orbitCamera.position.x = -200;
	orbitCamera.position.y = 200;
	orbitCamera.position.z = 200;
	var orbitControls = new THREE.OrbitControls(orbitCamera);
	orbitControls.autoRotate = true;
	orbitControls.center.set(city.landscape.mesh.position.x, 50, city.landscape.mesh.position.z);

	orbitManual.position.x = -200;
	orbitManual.position.y = 200;
	orbitManual.position.z = 200;
	var orbitManualControls = new THREE.OrbitControls(orbitManual);
	orbitManualControls.autoRotate = false;
	orbitManualControls.center.set(city.landscape.mesh.position.x, 50, city.landscape.mesh.position.z);

	flyCamera.position.x = 0;
	flyCamera.position.y = 300;
	flyCamera.position.z = 0;
	flyCamera.lookAt(new THREE.Vector3(city.size / 2, 0, city.size / 2));
	var flyControls = new THREE.FlyControls(flyCamera);
	flyControls.movementSpeed = 100;
	flyControls.domElement = document.querySelector("#WebGL-output");
	flyControls.rollSpeed = Math.PI/14;
	flyControls.autoForward = false;
	flyControls.dragToLook = false;


	// ========
	// Controls
	// ========
	// var controls = new function () { // jshint ignore: line
	// }; // jshint ignore: line

	// var gui = new dat.GUI();

	// console.log(structureCount);

	// =====================
	// Post Processing Setup
	// =====================
	// Orbit Camera
	var renderPassOrbit = new THREE.RenderPass(city.scene, orbitCamera);
	var effectCopyOrbit = new THREE.ShaderPass(THREE.CopyShader);
	effectCopyOrbit.renderToScreen = true;

	var bloomPassOrbit = new THREE.BloomPass(1, 15, 3, 300);

	var composerOrbit = new THREE.EffectComposer(renderer);
	composerOrbit.addPass(renderPassOrbit);
	composerOrbit.addPass(bloomPassOrbit);
	composerOrbit.addPass(effectCopyOrbit);

	// Manual Camera
	var renderPassManual = new THREE.RenderPass(city.scene, orbitManual);
	var effectCopyManual = new THREE.ShaderPass(THREE.CopyShader);
	effectCopyManual.renderToScreen = true;

	var bloomPassManual = new THREE.BloomPass(1, 15, 3, 300);

	var composerManual = new THREE.EffectComposer(renderer);
	composerManual.addPass(renderPassManual);
	composerManual.addPass(bloomPassManual);
	composerManual.addPass(effectCopyManual);

	// Fly Camera
	var renderPassFly = new THREE.RenderPass(city.scene, flyCamera);
	var effectCopyFly = new THREE.ShaderPass(THREE.CopyShader);
	effectCopyFly.renderToScreen = true;

	var bloomPassFly = new THREE.BloomPass(1, 15, 3, 300);

	var composerFly = new THREE.EffectComposer(renderer);
	composerFly.addPass(renderPassFly);
	composerFly.addPass(bloomPassFly);
	composerFly.addPass(effectCopyFly);

	// ==============
	// Render Section
	// ==============
	var clock = new THREE.Clock();

	// add the output of the renderer to the html element
	document.getElementById("WebGL-output").appendChild(renderer.domElement);

	// call the render function (only when no post-proc used)
	//renderer.render(city.scene, orbitCamera);
	//renderer.render(city.scene, flyCamera);

	function renderScene() {
		stats.update();

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

			hemiLight.intensity = 0;
			pointLight.color = new THREE.Color(pointLightColor);
			spotLightA.color = new THREE.Color(spotLightAColor);
			spotLightB.color = new THREE.Color(spotLightBColor);
			spotLightC.color = new THREE.Color(spotLightCColor);
			spotLightD.color = new THREE.Color(spotLightDColor);
		}

		requestAnimationFrame(renderScene);

		sky.mesh.rotation.x += 0.0003;
		sky.mesh.rotation.y += 0.0005;
		sky.mesh.rotation.z += 0.0003;

		sky.mesh.material.map = TEXTURES.randomParticle();
		sky.mesh.material.map.needsUpdate = true;

		var delta = clock.getDelta();

		renderer.autoClear = false;
		renderer.clear();

		if (camMode === "orbit") {
			orbitCamera.lookAt(new THREE.Vector3(city.size / 4, 0, city.size / 4));
			orbitControls.update(delta);
			//renderer.render(city.scene, orbitCamera);
			composerOrbit.render(delta);
		}

		else if (camMode === "orbitManual") {
			orbitManual.lookAt(new THREE.Vector3(city.size / 4, 0, city.size / 4));
			orbitManualControls.update(delta);
			//renderer.render(city.scene, orbitManual);
			composerManual.render(delta);
		}

		else if (camMode === "fly") {
			flyControls.update(delta);
			renderer.clear();
			//renderer.render(city.scene, flyCamera);
			composerFly.render(delta);
		}
	}
	renderScene();

	// ===============
	// Event Listeners
	// ===============
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
}

window.onload = init;
