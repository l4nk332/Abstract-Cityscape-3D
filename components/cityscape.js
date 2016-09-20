function init() {

	var stats = initStats();

	var camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);

	var renderer = new THREE.WebGLRenderer();

	renderer.setClearColor(new THREE.Color(0x333333, 1.0));
	renderer.setSize(window.innerWidth, window.innerHeight);

	document.getElementById("WebGL-output").appendChild(renderer.domElement);

	camera.position.x = -30;
	camera.position.y = 40;
	camera.position.z = 30;

	var ambientLight = new THREE.AmbientLight(0x0c0c0c);

	// Begin Here....
	var City = function(size, buroughs) {
	    this.scene = new THREE.Scene();
	    this.size = size;
	    this.step = 1;
	    this.grid = new THREE.GridHelper(this.size, this.step);
	    this.scene.add(this.grid);
	    this.buroughs = buroughs;
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

	var cityscape = new City(100, 5);

	// create building
	var geo = new THREE.BoxGeometry(10, 20, 10);
	var mat = new THREE.MeshBasicMaterial({color: 0x777777, wireframe: false});
	var buildingBasic = new Building("basicBox", geo, mat).mesh;

	// create particleCloud
	var geo2 = new THREE.BoxGeometry(10, 20, 10, 1, 5, 1);
	var particleBasic = new ParticleCloud(geo2).mesh;

	// group the building and particle cloud
	var group = new GroupMesh(buildingBasic, particleBasic).group;

	cityscape.scene.add(group);
	cityscape.scene.add(camera);
	camera.lookAt(cityscape.scene.position);
	cityscape.scene.add(ambientLight);

	// var controls = new function () {
	// 	// control code here...
	// };
    //
	// var gui = new dat.GUI();
	// gui.add(controls, '', 0, 0.5);

	render();

	function render() {
	    stats.update();

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
