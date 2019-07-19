"use strict";
function init() {

	var stats = initStats();

	var camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);

	var renderer = new THREE.WebGLRenderer();

	renderer.setClearColor(new THREE.Color(0x333333, 1.0));
	renderer.setSize(window.innerWidth, window.innerHeight);

	document.getElementById("WebGL-output").appendChild(renderer.domElement);

	var controls = new function () {
	    this.cameraX = 0;
	    this.cameraY = 20;
	    this.cameraZ = 0;
	};

	var gui = new dat.GUI();
	gui.add(controls, 'cameraX', -380, 380);
	gui.add(controls, 'cameraY', -180, 380);
	gui.add(controls, 'cameraZ', -380, 380);


	var ambientLight = new THREE.AmbientLight(0x0c0c0c);

	// Begin Here....
	function generateSize(max=10, min=5) {
	    return Math.floor(Math.max(Math.random()*max, min));
	}

	var City = function(size, buroughs) {
	    this.scene = new THREE.Scene();
	    this.size = size;
	    this.step = 1;
	    this.grid = new Landscape(this.size).mesh;
	    this.scene.add(this.grid);
	    this.buroughs = buroughs;
	}

	var Landscape = function(size) {
	    this.size = size;
	    this.geometry = new THREE.PlaneGeometry(size, size);
	    this.material = new THREE.MeshBasicMaterial({color: 0xeeeeee, wireframe: true});
	    this.mesh = new THREE.Mesh(this.geometry, this.material);
	    this.mesh.rotation.x = Math.PI/2;
	    this.mesh.position.set(this.size/2, 0, this.size/2);
	}

	var Building = function(type, geometry, material) {
	    this.type = type;
	    this.geometry = geometry;
	    // Moves pivot point to bottom
	    this.geometry.applyMatrix(new THREE.Matrix4().makeTranslation(0, (this.geometry.parameters.height)/2, 0));
	    // Remove bottom face
	    this.geometry.faces.splice(6, 1);
	    this.material = material;
	    this.mesh = new THREE.Mesh(this.geometry, this.material);
	}

	var ParticleTexture = function(width=16, height=16) {
	    this.type = "ParticleTexture";
	    this.width = width;
	    this.height = height;
	    this.canvas = document.createElement('canvas');
	    this.canvas.width = this.width;
	    this.canvas.height = this.height;
	    this.context = this.canvas.getContext('2d');
	    this.gradient = this.context.createRadialGradient(this.width/2, this.height/2, 0, this.width/2, this.height/2, this.width/2);
	    this.gradient.addColorStop(0, 'rgba(255,255,255,1)');
	    this.gradient.addColorStop(0.2, 'rgba(0,255,255,1)');
	    this.gradient.addColorStop(0.4, 'rgba(0,0,64,1)');
	    this.gradient.addColorStop(1,'rgba(0,0,0,1)');
	    this.context.fillStyle = this.gradient;
	    this.context.fillRect(0, 0, this.width, this.height);
	    this.texture = new THREE.Texture(this.canvas);
	    this.texture.needsUpdate = true;
	}

	var ParticleCloud = function(geometry) {
	    this.geometry = geometry;
	    // Moves pivot point to bottom
	    this.geometry.applyMatrix(new THREE.Matrix4().makeTranslation(0, (this.geometry.parameters.height)/2, 0));
	    this.texture = new ParticleTexture().texture;
	    this.material = new THREE.PointCloudMaterial({
		color: 0xffffff,
		size: 3,
		transparent: true,
		blending: THREE.AdditiveBlending,
		map: this.texture
	    });
	    this.mesh = new THREE.PointCloud(this.geometry, this.material);
	    this.mesh.sortParticles = true;
	}

	var GroupMesh = function(meshA, meshB) {
	    this.group = new THREE.Group();
	    // Scale down first mesh to sit inside second
	    meshA.scale.set(0.97, 1, 0.97);
	    this.group.add(meshA);
	    this.group.add(meshB);
	}

	var axisHelper = new THREE.AxisHelper(10);
	var cityscape = new City(100, 5);
	cityscape.scene.add(axisHelper);
	var building = new Building("basic", new THREE.BoxGeometry(10,10,10), new THREE.MeshBasicMaterial({color: 0xffffff}));
	cityscape.scene.add(building.mesh);
	cityscape.scene.add(camera);
	cityscape.scene.add(ambientLight);

	render();

	function render() {
		stats.update();
		camera.position.x = controls.positionX;
		camera.position.y = controls.positionY;
		camera.position.z = controls.positionZ;

	    // render using requestAnimationFrame
	    requestAnimationFrame(render);
	    renderer.render(cityscape.scene, camera);
	}

	function initStats() {
	    var stats = new Stats();

	    stats.setMode(0); // 0: fps, 1: ms

	    document.getElementById("Stats-output").appendChild(stats.domElement);
	    return stats;
	}

	// listen to the resize events
	window.addEventListener('resize', function onResize() {
	    camera.aspect = window.innerWidth / window.innerHeight;
	    camera.updateProjectionMatrix();
	    renderer.setSize(window.innerWidth, window.innerHeight);
	});
}

window.onload = init;
