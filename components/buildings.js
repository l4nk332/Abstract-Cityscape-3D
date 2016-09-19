function init() {

	var stats = initStats();
	var scene = new THREE.Scene();

	var camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
	scene.add(camera);

	var renderer = new THREE.WebGLRenderer();

	renderer.setClearColor(new THREE.Color(0xEEEEEE, 1.0));
	renderer.setSize(window.innerWidth, window.innerHeight);

	document.getElementById("WebGL-output").appendChild(renderer.domElement);

	camera.position.x = -30;
	camera.position.y = 40;
	camera.position.z = 30;
	camera.lookAt(scene.position);

	var ambientLight = new THREE.AmbientLight(0x0c0c0c);
	scene.add(ambientLight);

	// Begin Here....
	var geo = new THREE.BoxGeometry(10, 10, 10);
	var mat = new THREE.MeshBasicMaterial({color: 0x00ff00, wireframe: true});
	var mesh = new THREE.Mesh(geo, mat);
	scene.add(mesh);

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
		renderer.render(scene, camera);
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
