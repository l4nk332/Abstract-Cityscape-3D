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

	var cityscape = new City(100, 5);

	var geo = new THREE.BoxGeometry(10, 10, 10);
	var mat = new THREE.MeshBasicMaterial({color: 0xffff00, wireframe: false});
	var buildingBasic = new Building("basicBox", geo, mat);

	cityscape.scene.add(buildingBasic.mesh);
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
