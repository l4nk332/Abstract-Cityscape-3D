'use strict';
/* globals THREE: false, Stats: false, dat: false */

function initStats() {
	var stats = new Stats();
	stats.setMode(0);
	stats.domElement.style.position = 'absolute';
	stats.domElement.style.left = '0px';
	stats.domElement.style.top = '0px';
	document.getElementById("Stats-output").appendChild(stats.domElement);
	return stats;
}

var controls = new function () { // jshint ignore: line
	this.cameraX = 32;
	this.cameraY = 41;
	this.cameraZ = 188;
}();

var gui = new dat.GUI();
gui.add(controls, 'cameraX', -380, 380);
gui.add(controls, 'cameraY', 0, 1000);
gui.add(controls, 'cameraZ', -380, 380);

var camera;
var renderer;

// once everything is loaded, we run our Three.js stuff.
function init() {
	camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 3000);

	// create a render and set the size
	renderer = new THREE.WebGLRenderer();

	renderer.setClearColor(new THREE.Color(0x000000));
	renderer.setSize(window.innerWidth, window.innerHeight);

	var stats = initStats();

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
		this.meshB.rotation.x += Math.PI/4;
		this.meshB.rotation.y += Math.PI/4;
		this.meshB.rotation.z += Math.PI/4;
		this.meshB.updateMatrix();
		this.geometry.merge(this.geometryB, this.meshB.matrix);

		this.geometryC = new THREE.DodecahedronGeometry(radius, 3);
		this.meshC = new THREE.Mesh(this.geometryC);
		this.meshC.rotation.x += Math.PI/4;
		this.meshC.rotation.y += Math.PI/4;
		this.meshC.rotation.z += Math.PI/4;
		this.meshC.updateMatrix();
		this.geometry.merge(this.geometryC, this.meshC.matrix);


		this.texture = TEXTURES.stars;
		this.texture = TEXTURES.particle;
		this.material = new THREE.PointCloudMaterial({
			color: 0xffffff,
			size: 20,
			transparent: true,
			blending: THREE.AdditiveBlending,
			map: this.texture
		});
		this.mesh = new THREE.PointCloud(this.geometry, this.material);
		this.mesh.sortParticles = true;
	};

	Sky.prototype.surround = function (object) {
		var offsetX = object.size / 2;
		var offsetY = object.size / 2;
		this.mesh.position.set(offsetX, 0, offsetY);
	};

	var City = function (size, numberOfBoroughs) {
		this.size = size;
		this.numberOfBoroughs = numberOfBoroughs;
		this.scene = new THREE.Scene();
		this.entities = {};
		this.landscape = new Landscape(this.size*2/5, this.size*2/5);
		this.axes = new THREE.AxisHelper(20);
		this.scene.add(this.axes);
		var spotLight = new THREE.SpotLight(0xffffff);
		spotLight.position.set(180, 180, 100);
		this.scene.add(spotLight);
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

				if ((i === 0 && j === 0) || (i === 0 && j === this.numberOfBoroughs-1) || (i === this.numberOfBoroughs-1 && j === 0) || (i === this.numberOfBoroughs && j === this.numberOfBoroughs)) {
					// Corner
					maxBlockScale = 3;
					blockSize = boroughSize/13;
				} else if ((i === (this.numberOfBoroughs-1)/2) && (j === (this.numberOfBoroughs-1)/2)) {
					// Center
					maxBlockScale = 7;
					blockSize = boroughSize/6;
				} else {
					// Cross
					maxBlockScale = 5;
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
		// this.material = new THREE.MeshStandardMaterial({roughness: 0, metalness: 1, emissive: 0x333333, map: TEXTURES.concrete});
		//this.material = new THREE.MeshPhongMaterial({roughness: 0, metalness: 1, emissive: 0x333333, wireframe: true});
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
				block.position(2 * i * block.size*2/3, 0, 2 * j * block.size*2/3);
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
			return building.width <= this.remainingX/2;
		}
		if (axis === "z") {
			return building.depth <= this.remainingZ/2;
		}
	};

	Block.prototype.place = function (building) {
		var xOffset = building.width / 2;
		var zOffset = building.depth / 2;
		var xPos = this.size - (this.remainingX + (xOffset));
		var zPos = this.size - (this.remainingZ + (zOffset));
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
		this.width = width;
		this.depth = depth;
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
		this.width = width;
		this.height = height || Math.max(Math.ceil(Math.random() * 15), 5);
		this.depth = depth;
		this.types = ["box", "cylinder"];
		this.type = this.types[UTILS.randomValue(this.types.length, 0)];

		if (this.type === "box") {
			// BoxGeometry Structure
			this.geometry = new THREE.BoxGeometry(this.width, this.height, this.depth);
			// Moves pivot point to bottom of the cube instead of its center
			this.geometry.applyMatrix(new THREE.Matrix4().makeTranslation(0, this.height / 2, 0));
			// Removes bottom face (optimization to avoid wasteful render)
			this.geometry.faces.splice(6, 1);
		}

		else if (this.type === "cylinder") {
			// CylinderGeometry Structure
			let radiusTop = Math.min(this.width, this.depth);
			let radiusBottom = Math.max(this.width, this.depth);
			let radiusSegments = UTILS.randomValue(30, 3);
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

		structure.mesh.scale.set(0.8, 1, 0.8);
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

	var city = new City(2000, 3);
	var sky = new Sky(2050);
	sky.surround(city);
	city.add(sky);
	city.generateGrid();

	var directionalLight = new THREE.DirectionalLight(0xffffff);
	directionalLight.position.set(0, 1000, 0);
	directionalLight.target.position.set(city.size / 2, 0, city.size / 2);
	city.scene.add(directionalLight);
	var directionalLight2 = new THREE.DirectionalLight(0xffffff);
	directionalLight2.position.set(city.size, 1000, city.size);
	directionalLight2.target.position.set(city.size / 2, 0, city.size / 2);
	city.scene.add(directionalLight2);

	// add the output of the renderer to the html element
	document.getElementById("WebGL-output").appendChild(renderer.domElement);

	// call the render function
	renderer.render(city.scene, camera);

	function renderScene() {
		stats.update();
		camera.position.x = controls.cameraX;
		camera.position.y = controls.cameraY;
		camera.position.z = controls.cameraZ;
		camera.lookAt(new THREE.Vector3(city.size / 2, 0, city.size / 2));
		sky.mesh.rotation.x += 0.0003;
		sky.mesh.rotation.y += 0.0005;
		sky.mesh.rotation.z += 0.0003;

		sky.mesh.material.map = TEXTURES.randomParticle();
		sky.mesh.material.map.needsUpdate = true;

		renderer.render(city.scene, camera);
		requestAnimationFrame(renderScene);
	}
	renderScene();

}

window.onload = init;

window.addEventListener('resize', function () {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize(window.innerWidth, window.innerHeight);
});
