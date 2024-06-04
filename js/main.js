import * as THREE from "https://cdn.skypack.dev/three@0.129.0/build/three.module.js";
import { OrbitControls } from "https://cdn.skypack.dev/three@0.129.0/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "https://cdn.skypack.dev/three@0.129.0/examples/jsm/loaders/GLTFLoader.js";

// Initialize variables
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 2; 

let object;
let controls;
let objToRender = 'UR3';
const loader = new GLTFLoader();

// Load the model
loader.load(
  `models/${objToRender}/Ur3.gltf`, 
  function (gltf) {
    object = gltf.scene;
    object.position.y = -2
    scene.add(object);
  },
  function (xhr) {
    console.log((xhr.loaded / xhr.total * 100) + '% loaded');
  },
  function (error) {
    console.error(error);
  }
);

// Select the slider elements
const joint1Slider = document.getElementById('joint1-slider');
const joint2Slider = document.getElementById('joint2-slider');
const joint3Slider = document.getElementById('joint3-slider');
const joint4Slider = document.getElementById('joint4-slider');
const joint5Slider = document.getElementById('joint5-slider');

// Update model and kinematics based on slider input
function updateModel(event) {
  if (object) {
      const theta1 = parseFloat(joint1Slider.value);
      const theta2 = parseFloat(joint2Slider.value);
      const theta3 = parseFloat(joint3Slider.value);
      const theta4 = parseFloat(joint4Slider.value);
      const theta5 = parseFloat(joint5Slider.value);

      // Update the model based on the new values
      object.getObjectByName('Object_11').rotation.y = theta1; // Base
      object.getObjectByName('Object_32').rotation.z = theta3; // Wrist 1
      object.getObjectByName('Object_26').rotation.x = theta4; // Wrist 2
      object.getObjectByName('Object_37').rotation.y = theta5; // Wrist 3 

      if (event && event.target.id === 'joint2-slider') {
          object.getObjectByName('Object_17').rotation.z = theta2; // Shoulder
      }

      const { position, matrix } = forwardKinematics(theta1, theta2, theta3, theta4, theta5);
      displayEndEffectorPosition(position);
      displayTransformationMatrix(matrix);
  }
}

joint1Slider.addEventListener('input', updateModel);
joint2Slider.addEventListener('input', updateModel);
joint3Slider.addEventListener('input', updateModel);
joint4Slider.addEventListener('input', updateModel);
joint5Slider.addEventListener('input', updateModel);

// Initialize renderer
const renderer = new THREE.WebGLRenderer({ alpha: true });
renderer.setSize(window.innerWidth/2, window.innerHeight/2);
document.getElementById("container3D").appendChild(renderer.domElement);

// Add lights
const topLight = new THREE.DirectionalLight(0xC0C0C0, 1);
topLight.position.set(500, 400, 500);
topLight.castShadow = true;
scene.add(topLight);

const rightLight = new THREE.DirectionalLight(0xC0C0C0, 0.5);
rightLight.position.set(-400, 0, 300);
scene.add(rightLight);

const leftLight = new THREE.DirectionalLight(0xC0C0C0, 0.5);
leftLight.position.set(300, 0, 500);
scene.add(leftLight);

const bottomLight = new THREE.DirectionalLight(0x000000, 0.5);
bottomLight.position.set(100, -100, 300);
scene.add(bottomLight);

const backLight = new THREE.DirectionalLight(0xC0C0C0, 0.5); 
backLight.position.set(0, 0, -300); 
backLight.intensity = 1;
scene.add(backLight);

const ambientLight = new THREE.AmbientLight(0x000000, objToRender === "UR3" ? 5 : 1);
scene.add(ambientLight);

// Add OrbitControls
if (objToRender === "UR3") {
  controls = new OrbitControls(camera, renderer.domElement);
  controls.minDistance = 5; // Minimum zoom distance
  controls.maxDistance = 15; // Maximum zoom distance
}

// Add a listener to the window, so we can resize the window and the camera
// window.addEventListener("resize", function () {  
//   camera.aspect = window.innerWidth / window.innerHeight;
//   camera.updateProjectionMatrix();
//   renderer.setSize(window.innerWidth/2, window.innerHeight/2);
// });

// FORWARD KINEMATICS

function forwardKinematics(theta1, theta2, theta3, theta4, theta5, uptoJoint) {
  const dhParams = [
    { alpha: Math.PI / 2, a: 0, d: 0.1519, theta: theta1 },
    { alpha: 0, a: -0.24365, d: 0, theta: theta2 },
    { alpha: 0, a: -0.21325, d: 0, theta: theta3 },
    { alpha: Math.PI / 2, a: 0, d: 0.11235, theta: theta4 },
    { alpha: -Math.PI / 2, a: 0, d: 0.08535, theta: theta5 },
  ];

  const matrices = [];
  let resultMatrix = new THREE.Matrix4().identity();

  for (let i = 0; i < dhParams.length; i++) {
    if (uptoJoint !== undefined && i >= uptoJoint) break;

    const { alpha, a, d, theta } = dhParams[i];
    const cosTheta = Math.cos(theta);
    const sinTheta = Math.sin(theta);
    const cosAlpha = Math.cos(alpha);
    const sinAlpha = Math.sin(alpha);

    const matrix = new THREE.Matrix4().set(
      cosTheta, -sinTheta * cosAlpha, sinTheta * sinAlpha, a * cosTheta,
      sinTheta, cosTheta * cosAlpha, -cosTheta * sinAlpha, a * sinTheta,
      0, sinAlpha, cosAlpha, d,
      0, 0, 0, 1
    );

    resultMatrix.multiply(matrix);
    matrices.push(matrix);
  }

  const position = new THREE.Vector3().setFromMatrixPosition(resultMatrix);
  return { position, matrix: resultMatrix, matrices };
}

// Function to display end effector position
function displayEndEffectorPosition(position) {
  const resultElement = document.getElementById("result-container");
  resultElement.innerHTML = `
    <p><i><b>End Effector Position:</b></i></p>
    <p>X: ${position.x.toFixed(3)}</p>
    <p>Y: ${position.y.toFixed(3)}</p>
    <p>Z: ${position.z.toFixed(3)}</p>
  `;
}


function displayTransformationMatrix(matrix) {
  document.getElementById('inverse-kinematics').style.translate ="0 -310px"; 
  document.getElementById('inverse-result').style.translate ="0 -310px";  
  document.getElementById('inverse-result').style.padding ="10px";
  document.getElementById('inverse-result').style.marginTop ="20px";
  document.getElementById('inverse-result').style.width ="50%";
  const matrixElement = document.getElementById('matrix-container');
  matrixElement.innerHTML = `
    <table>
      <tr>
        <td>${matrix.elements[0].toFixed(3)}</td>
        <td>${matrix.elements[4].toFixed(3)}</td>
        <td>${matrix.elements[8].toFixed(3)}</td>
        <td>${matrix.elements[12].toFixed(3)}</td>
      </tr>
      <tr>
        <td>${matrix.elements[1].toFixed(3)}</td>
        <td>${matrix.elements[5].toFixed(3)}</td>
        <td>${matrix.elements[9].toFixed(3)}</td>
        <td>${matrix.elements[13].toFixed(3)}</td>
      </tr>
      <tr>
        <td>${matrix.elements[2].toFixed(3)}</td>
        <td>${matrix.elements[6].toFixed(3)}</td>
        <td>${matrix.elements[10].toFixed(3)}</td>
        <td>${matrix.elements[14].toFixed(3)}</td>
      </tr>
      <tr>
        <td>${matrix.elements[3].toFixed(3)}</td>
        <td>${matrix.elements[7].toFixed(3)}</td>
        <td>${matrix.elements[11].toFixed(3)}</td>
        <td>${matrix.elements[15].toFixed(3)}</td>
      </tr>
    </table>
  `;
}

//INVERSE KINEMATICS

// Define initial joint angles
let initialTheta1 = 0;
let initialTheta2 = 0;
let initialTheta3 = 0;
let initialTheta4 = 0;
let initialTheta5 = 0;

function ccdInverseKinematics(theta1, theta2, theta3, theta4, theta5, targetPosition) {
  const maxIterations = 100;
  const tolerance = 1e-3;
  let iterations = 0;

  let theta = [theta1, theta2, theta3, theta4, theta5];

  while (iterations < maxIterations) {
    const endEffectorPos = forwardKinematics(theta[0], theta[1], theta[2], theta[3], theta[4]).position;
    const error = new THREE.Vector3(
      targetPosition.x - endEffectorPos.x,
      targetPosition.y - endEffectorPos.y,
      targetPosition.z - endEffectorPos.z
    );

    if (error.length() < tolerance) break;

    for (let i = 4; i >= 0; i--) {
      const jointPos = forwardKinematics(theta[0], theta[1], theta[2], theta[3], theta[4], i).position;

      const toEndEffector = new THREE.Vector3(
        endEffectorPos.x - jointPos.x,
        endEffectorPos.y - jointPos.y,
        endEffectorPos.z - jointPos.z
      );

      const toTarget = new THREE.Vector3(
        targetPosition.x - jointPos.x,
        targetPosition.y - jointPos.y,
        targetPosition.z - jointPos.z
      );

      toEndEffector.normalize();
      toTarget.normalize();

      const angle = Math.acos(THREE.MathUtils.clamp(toEndEffector.dot(toTarget), -1, 1));

      if (angle > 0.01) {
        const axis = new THREE.Vector3().crossVectors(toEndEffector, toTarget).normalize();
        const quaternion = new THREE.Quaternion().setFromAxisAngle(axis, angle);
        const rotationMatrix = new THREE.Matrix4().makeRotationFromQuaternion(quaternion);

        const currentTransform = new THREE.Matrix4().identity();
        for (let j = 0; j <= i; j++) {
          const currentRotation = new THREE.Matrix4();
          switch (j) {
            case 0: currentRotation.makeRotationY(theta[0]); break;
            case 1: currentRotation.makeRotationZ(theta[1]); break;
            case 2: currentRotation.makeRotationZ(theta[2]); break;
            case 3: currentRotation.makeRotationY(theta[3]); break;
            case 4: currentRotation.makeRotationX(theta[4]); break;
          }
          currentTransform.multiply(currentRotation);
        }

        const newTransform = new THREE.Matrix4().identity();
        newTransform.multiplyMatrices(rotationMatrix, currentTransform);

        const euler = new THREE.Euler().setFromRotationMatrix(newTransform, 'ZYX');
        theta[0] = euler.y;
        theta[1] = euler.z;
        theta[2] = euler.z;
        theta[3] = euler.y;
        theta[4] = euler.x;
      }
    }

    iterations++;
  }

  return { theta1: theta[0], theta2: theta[1], theta3: theta[2], theta4: theta[3], theta5: theta[4] };
}

function calculateInverseKinematics() {
  const targetX = parseFloat(document.getElementById('target-x').value);
  const targetY = parseFloat(document.getElementById('target-y').value);
  const targetZ = parseFloat(document.getElementById('target-z').value);

  const jointAngles = ccdInverseKinematics(initialTheta1, initialTheta2, initialTheta3, initialTheta4, initialTheta5, { x: targetX, y: targetY, z: targetZ });

  if (jointAngles) {
    document.getElementById('inverse-result').innerHTML = `
      <p><b>Joint Angles:</b></p>
      <p>Base Rotation (θ1): ${jointAngles.theta1.toFixed(3)}</p>
      <p>Shoulder Rotation (θ2): ${jointAngles.theta2.toFixed(3)}</p>
      <p>Wrist 1 Rotation (θ3): ${jointAngles.theta3.toFixed(3)}</p>
      <p>Wrist 2 Rotation (θ4): ${jointAngles.theta4.toFixed(3)}</p>
      <p>Wrist 3 Rotation (θ5): ${jointAngles.theta5.toFixed(3)}</p>
    `;

    // Update the sliders with the calculated joint angles
    joint1Slider.value = jointAngles.theta1;
    joint2Slider.value = jointAngles.theta2;
    joint3Slider.value = jointAngles.theta3;
    joint4Slider.value = jointAngles.theta4;
    joint5Slider.value = jointAngles.theta5;

    // Trigger the updateModel function to update the 3D model
    updateModel();
  } else {
    document.getElementById('inverse-result').innerHTML = `
      <p><b>Error:</b> Unable to calculate inverse kinematics. Check the console for more details.</p>
    `;
  }
}

// Add event listener to the button
document.getElementById('calculate-ik').addEventListener('click', calculateInverseKinematics);

const animate = function () {
  requestAnimationFrame(animate);

  if (controls) {
    controls.update();
  }

  renderer.render(scene, camera);
};

animate();
