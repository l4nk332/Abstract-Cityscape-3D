function init() {
    var stats = initStats();

    var scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0xffffff, 0.015, 100);

    var camera = new THREE.PerspectiveCamera(45, window.innerWidth/window.innerHeight, 0.1, 1000);

    var renderer = new THREE.WebGLRenderer();

    renderer.setClearColor(new THREE.Color(0xEEEEEE, 1.0));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMapEnabled = true;

    var planeGeometry = new THREE.PlaneGeometry(60, 40, 1, 1);
    var planeMaterial = new THREE.MeshLambertMaterial({color: 0xffffff});
    var plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.recieveShadow = true;

    plane.rotation.x = -0.5 * Math.PI;
    plane.position.x = 0;
    plane.position.y = 0;
    plane.position.z = 0;

    scene.add(plane);

    camera.position.x = -30;
    camera.position.y = 40;
    camera.position.z = 30;
    camera.lookAt(scene.position);

    var ambientLight = new THREE.AmbientLight(0x0c0c0c);
    scene.add(ambientLight);

    var spotLight = new THREE.SpotLight(0xffffff);
    spotLight.position.set(-40, 60, -10);
    spotLight.castShadow = true;
    scene.add(spotLight);

    document.getElementById("WebGL-output").appendChild(renderer.domElement);

    var step = 0;

    var controls = new function() {
	this.rotationSpeed = 0.02;
	this.numberOfObjects = scene.children.length;

	this.removeCube = function() {
	    var allChildren = scene.children;
	    var lastObject = allChildren[allChildren.length - 1];
	    if (lastObject instanceof THREE.Mesh) {
		scene.remove(lastObject);
		this.numberOfObjects = scene.children.length;
	    }
	}

	this.addCube = function() {
	    var cubeSize = Math.ceil((Math.random() * 3));
	    var cubeGeometry = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
	    var cubeMaterial = new THREE.MeshLambertMaterial({color: Math.random() * 0xffffff});
	    var cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
	    cube.castShadow = true;

	    cube.position.x = -30 + Math.round((Math.random() * planeGeometry.parameters.width));
	    cube.position.y = Math.round((Math.random() * 5));
	    cube.position.x = -20 + Math.round((Math.random() * planeGeometry.parameters.height));

	    scene.add(cube);
	    this.numberOfObjects = scene.children.length;
	};

	this.outputObjects = function() {
	    console.log(scene.children);
	};
    };

    var gui = new dat.GUI();
    gui.add(controls, 'rotationSpeed', 0, 0.5);
    gui.add(controls, 'addCube');
    gui.add(controls, 'removeCube');
    gui.add(controls, 'outputObjects');
    gui.add(controls, 'numberOfObjects').listen();

    render();

    function render() {
	stats.update();

	scene.traverse(function(e) {
	    if (e instanceof THREE.Mesh && e != plane) {
		e.rotation.x += controls.rotationSpeed;
		e.rotation.y += controls.rotationSpeed;
		e.rotation.z += controls.rotationSpeed;
	    }
	});

	requestAnimationFrame(render);
	renderer.render(scene, camera);
    }

    function initStats() {
	var stats = new Stats();

	stats.setMode(0);

	stats.domElement.style.position = 'absolute';
	stats.domElement.style.left = '0px';
	stats.domElement.style.top = '0px';

	document.getElementById("Stats-output").appendChild(stats.domElement);

	return stats;
    }
}

window.onload = init;
