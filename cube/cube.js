// 기본 Three.js 설정
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.z = 5;

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// 큐브 만들기
const geometry = new THREE.BoxGeometry();
const material = new THREE.MeshBasicMaterial({
  color: 0x0077ff,
  wireframe: true,
});
const cube = new THREE.Mesh(geometry, material);
scene.add(cube);

// Gamepad 연결 확인
window.addEventListener('gamepadconnected', (event) => {
  console.log('Gamepad connected:', event.gamepad);
  animate();
});

window.addEventListener('gamepaddisconnected', () => {
  console.log('Gamepad disconnected');
});

// Gamepad 조이스틱 입력에 따른 큐브 회전 처리 함수
function updateCubeRotation(gamepad) {
  console.log('?');
  if (!gamepad) return;
  console.log(gamepad.axes);

  // 좌측 조이스틱 (axes[0] 및 axes[1])으로 회전
  const rotationSpeed = 0.05;
  cube.rotation.y += gamepad.axes[0] * rotationSpeed; // 좌우
  cube.rotation.x += gamepad.axes[1] * rotationSpeed; // 상하

  // 우측 조이스틱 (axes[2] 및 axes[3])으로 확대/축소
  const zoomSpeed = 0.1;
  camera.position.z += gamepad.axes[3] * zoomSpeed; // 앞뒤
}

// 애니메이션 및 게임패드 상태 업데이트
function animate() {
  const gamepads = navigator.getGamepads();
  console.log('gamepads', gamepads);
  if (gamepads[0]) {
    console.log('aaa2');
    updateCubeRotation(gamepads[0]);
  }

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

// 창 크기 변경에 맞게 카메라 및 렌더러 업데이트
window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});
