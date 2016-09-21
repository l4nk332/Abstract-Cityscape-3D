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
gui.add(controls, 'cameraY', 0, 380);
gui.add(controls, 'cameraZ', -380, 380);

var camera;
var renderer;

// once everything is loaded, we run our Three.js stuff.
function init() {
	camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 2000);

	// create a render and set the size
	renderer = new THREE.WebGLRenderer();

	renderer.setClearColor(new THREE.Color(0x000000));
	renderer.setSize(window.innerWidth, window.innerHeight);

	var stats = initStats();

	var UTILS = {
		randomValue: function randomValue() {
			var max = arguments.length <= 0 || arguments[0] === undefined ? 10 : arguments[0];
			var min = arguments.length <= 1 || arguments[1] === undefined ? 5 : arguments[1];

			return Math.floor(Math.max(Math.random() * max, min));
		}
	};

	var Sky = function Sky(radius) {
		this.type = "sky";
		this.geometry = new THREE.SphereGeometry(radius, 25, 25);
		this.material = new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true });
		// Inner side will render sky
		this.material.side = THREE.BackSide;
		this.mesh = new THREE.Mesh(this.geometry, this.material);
	};

	Sky.prototype.surround = function (object) {
		var offsetX = object.width / 2;
		var offsetY = object.depth / 2;
		this.mesh.position.set(offsetX, 0, offsetY);
	};

	var City = function City(size, numberOfBoroughs) {
		this.size = size;
		this.numberOfBoroughs = numberOfBoroughs;
		this.scene = new THREE.Scene();
		this.entities = {};
		this.landscape = new Landscape(this.size, this.size);
		this.axes = new THREE.AxisHelper(20);
		this.scene.add(this.axes);
		var spotLight = new THREE.SpotLight(0xffffff);
		spotLight.position.set(180, 180, 100);
		this.scene.add(spotLight);
		//this.scene.fog = new THREE.Fog(0x000000, 0.015, 300);
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
				var blockSize = boroughSize/15;
				var borough = new Borough(boroughSize, blockSize, blockSize/3, blockSize*2, blockSize/3);
				borough.generateGrid();
				// borough.position(2 * i * borough.size, 0, 2 * j * borough.size);
				borough.position(i*borough.size, 0, j*borough.size);
				this.add(borough);
			}
		}
	};

	var Borough = function Borough(size, blockSize, maxBuildingWidth, maxBuildingHeight, maxBuildingDepth) {
		this.size = size;
		this.blockSize = blockSize;
		// this.numberOfBlocks = (this.size + this.blockSize) / this.blockSize / 2;
		this.numberOfBlocks = (this.size) / this.blockSize / 2;
		this.type = "borough";
		this.maxBuildingWidth = maxBuildingWidth;
		this.maxBuildingHeight = maxBuildingHeight;
		this.maxBuildingDepth = maxBuildingDepth;
		this.mesh = new THREE.Group();
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
				this.mesh.add(block.mesh);
				block.position(2 * i * block.size, 0, 2 * j * block.size);
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
		this.mesh = new THREE.Group();
	};

	Block.prototype.generateBuilding = function () {
		var buildingWidth = UTILS.randomValue(this.maxBuildingWidth, this.maxBuildingWidth / 5);
		var buildingDepth = UTILS.randomValue(this.maxBuildingDepth, this.maxBuildingDepth / 5);
		var buildingHeight = UTILS.randomValue(this.maxBuildingHeight, this.maxBuildingHeight / 5);
		var structure = new Structure(buildingWidth, buildingHeight, buildingDepth, 0x718e95, true);
		var particleCloud = new ParticleCloud(structure);
		var building = new Building(structure, particleCloud);
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
		this.mesh.add(building.mesh);
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
		this.geometry = new THREE.PlaneGeometry(this.width, this.depth);
		this.material = new THREE.MeshBasicMaterial({ color: 0x434c51 });
		this.mesh = new THREE.Mesh(this.geometry, this.material);
		// Set landscape flat at (0, 0, 0)
		this.mesh.rotation.x = -0.5 * Math.PI;
		this.mesh.position.x = this.width / 2;
		this.mesh.position.y = 0;
		this.mesh.position.z = this.depth / 2;
	};

	var Structure = function Structure(width) {
		var height = arguments.length <= 1 || arguments[1] === undefined ? null : arguments[1];
		var depth = arguments[2];
		var color = arguments[3];
		var wireframe = arguments.length <= 4 || arguments[4] === undefined ? false : arguments[4];

		this.width = width;
		this.height = height || Math.max(Math.ceil(Math.random() * 15), 5);
		this.depth = depth;
		this.type = "structure";
		this.color = color;
		this.wireframe = wireframe;
		this.geometry = new THREE.BoxGeometry(this.width, this.height, this.depth);
		// Moves pivot point to bottom of the cube instead of its center
		this.geometry.applyMatrix(new THREE.Matrix4().makeTranslation(0, this.height / 2, 0));
		// Removes bottom face (optimization to avoid wasteful render)
		this.geometry.faces.splice(6, 1);
		var loader = new THREE.TextureLoader();
		//this.texture = loader.load('https://s3-us-west-2.amazonaws.com/s.cdpn.io/322806/concrete_wall_3_%402X.png');
		//this.material = new THREE.MeshLambertMaterial({ wireframe: false, map: this.texture });
		this.material = new THREE.MeshLambertMaterial({ wireframe: false});
		this.mesh = new THREE.Mesh(this.geometry, this.material);
	};

	var Particle = function Particle() {
		var width = arguments.length <= 0 || arguments[0] === undefined ? 16 : arguments[0];
		var height = arguments.length <= 1 || arguments[1] === undefined ? 16 : arguments[1];

		this.type = "particle";
		this.width = width;
		this.height = height;
		this.canvas = document.createElement('canvas');
		this.canvas.width = this.width;
		this.canvas.height = this.height;
		this.context = this.canvas.getContext('2d');
		this.gradient = this.context.createRadialGradient(this.width / 2, this.height / 2, 0, this.width / 2, this.height / 2, this.width / 2);
		this.gradient.addColorStop(0, 'rgba(255,255,255,1)');
		this.gradient.addColorStop(0.2, 'rgba(0,255,255,1)');
		this.gradient.addColorStop(0.4, 'rgba(0,0,64,1)');
		this.gradient.addColorStop(1, 'rgba(0,0,0,1)');
		this.context.fillStyle = this.gradient;
		this.context.fillRect(0, 0, this.width, this.height);
		this.texture = new THREE.Texture(this.canvas);
		this.texture.needsUpdate = true;
	};

	var ParticleCloud = function ParticleCloud(structure) {
		this.type = "particleCloud";
		this.geometry = structure.geometry.clone();
		// Moves pivot point to bottom
		//this.geometry.applyMatrix(new THREE.Matrix4().makeTranslation(0, (this.geometry.parameters.height)/2, 0));
		this.texture = new Particle().texture;
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

	var Building = function Building(structure, particleCloud) {
		this.type = "building";
		this.width = structure.width;
		this.height = structure.height;
		this.depth = structure.depth;
		this.mesh = new THREE.Group();
		structure.mesh.scale.set(0.8, 1, 0.8);
		this.mesh.add(structure.mesh);
		particleCloud.mesh.scale.set(0.9, 1, 0.9);
		this.mesh.add(particleCloud.mesh);
	};

	Building.prototype.position = function (x, y, z) {
		var offsetX = this.width / 2;
		var offsetZ = this.depth / 2;
		this.mesh.position.x = x + offsetX;
		this.mesh.position.y = y;
		this.mesh.position.z = z + offsetZ;
	};

	var city = new City(340, 3);
	var sky = new Sky(400);
	sky.surround(city);
	city.add(sky);
	city.generateGrid();

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
		renderer.render(city.scene, camera);
		requestAnimationFrame(renderScene);
	}
	renderScene();

	console.log(city);
}
window.onload = init;

window.addEventListener('resize', function () {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize(window.innerWidth, window.innerHeight);
});
