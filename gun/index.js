// Three.js 기본 설정
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 5, 10);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const rgbeLoader = new THREE.RGBELoader();
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.3;
renderer.outputEncoding = THREE.sRGBEncoding;
rgbeLoader.load('./images/rocky_mountain_sky_dome_8k.hdr', function (texture) {
  texture.mapping = THREE.EquirectangularReflectionMapping;
  scene.background = texture;
  scene.environment = texture;
});

// 조명 추가
const ambientLight = new THREE.AmbientLight(0x404040, 5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(10, 20, 10);
scene.add(directionalLight);

// 바닥 추가
// const floorGeometry = new THREE.PlaneGeometry(50, 50);
// const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x87ceeb });
// const floor = new THREE.Mesh(floorGeometry, floorMaterial);
// floor.rotation.x = -Math.PI / 2;
// scene.add(floor);

// 지형 추가
const hillMaterial = new THREE.MeshStandardMaterial({ color: 0x654321 });
const hill1 = new THREE.Mesh(new THREE.BoxGeometry(4, 2, 4), hillMaterial);
hill1.position.set(-5, 1, -5);
scene.add(hill1);

const hill2 = new THREE.Mesh(new THREE.BoxGeometry(6, 3, 6), hillMaterial);
hill2.position.set(10, 1.5, 5);
scene.add(hill2);

// 캐릭터 생성
// const characterGeometry = new THREE.BoxGeometry(1, 0.5, 0.3);
// const characterMaterial = new THREE.MeshStandardMaterial({ color: 0x0077ff });
// const character = new THREE.Mesh(characterGeometry, characterMaterial);
// character.position.y = 0.25; // 높이 조정
// scene.add(character);

const loader = new THREE.GLTFLoader();
let character;
loader.load(
  './models/grumman_f4f_wildcat_airplane/scene.gltf',
  function (gltf) {
    character = gltf.scene;
    character.scale.set(0.22, 0.22, 0.22);
    character.position.y = 0.25; // 높이 조정
    scene.add(gltf.scene);
  },
  undefined,
  function (error) {
    console.error(error);
  }
);

// 총알 배열 및 발사 속도 변수
const bullets = [];
let lastShotTime = 0;
let canShoot = true; // 단발 사격을 위한 변수
let isVibrationEnabled = false; // 진동 켜짐/꺼짐 상태 변수

// Gamepad 연결 확인
window.addEventListener('gamepadconnected', (event) => {
  console.log('Gamepad connected:', event.gamepad);
  animate();
});

window.addEventListener('gamepaddisconnected', () => {
  console.log('Gamepad disconnected');
});

// AudioContext 생성
const audioContext = new (window.AudioContext || window.webkitAudioContext)();
let gunshotSound; // 총 소리 변수
let isSoundEnabled = false; // 소리 상태 변수

// 총 소리 로드 함수
function loadGunshotSound() {
  fetch('sounds/gunshot.mp3')
    .then((response) => response.arrayBuffer())
    .then((arrayBuffer) => audioContext.decodeAudioData(arrayBuffer))
    .then((audioBuffer) => {
      gunshotSound = audioBuffer;
    })
    .catch((error) => console.error('Error loading sound:', error));
}

// 소리 재생 함수
function playGunshotSound() {
  if (!gunshotSound || !isSoundEnabled) return; // 소리가 로드되지 않았거나 소리가 꺼져있으면 종료
  const soundSource = audioContext.createBufferSource();
  soundSource.buffer = gunshotSound;
  soundSource.connect(audioContext.destination);
  soundSource.start(0); // 소리 재생
}

// 페이지가 로드될 때 소리 로드
window.addEventListener('load', loadGunshotSound);

let previousVibrationButtonState = false; // 이전 진동 버튼 상태
let previousSoundButtonState = false; // 이전 소리 상태
let isRedBullet = true; // 총알 색상 상태

// 캐릭터 이동, 회전 및 총 쏘기
function updateCharacter(gamepad) {
  if (!gamepad) return;

  let moveSpeed = 0.1;
  const rotationSpeed = 0.05;
  const now = performance.now();

  // 캐릭터 이동 방향 설정
  const forward = new THREE.Vector3(
    -Math.sin(character.rotation.y),
    0,
    -Math.cos(character.rotation.y)
  );
  const right = new THREE.Vector3()
    .crossVectors(forward, new THREE.Vector3(0, 1, 0))
    .negate();

  // X 버튼으로 단발 사격
  if (gamepad.buttons[10].pressed) {
    moveSpeed = 1; // 빠른 속도
  }

  // 조이스틱 입력에 따라 캐릭터 이동
  character.position.add(forward.multiplyScalar(gamepad.axes[1] * moveSpeed)); // 앞뒤 이동
  character.position.add(right.multiplyScalar(gamepad.axes[0] * moveSpeed)); // 좌우 이동

  // 오른쪽 조이스틱으로 캐릭터 회전 (좌우 회전)
  if (Math.abs(gamepad.axes[2]) > 0.1) {
    // 입력이 클 때만 회전
    character.rotation.y -= gamepad.axes[2] * rotationSpeed;
  }

  // X 버튼으로 단발 사격
  if (gamepad.buttons[0].pressed) {
    if (canShoot) {
      shootBullet(isRedBullet ? 0xff0000 : 0x0000ff);
      playGunshotSound(); // 총 소리 재생
      if (isVibrationEnabled) triggerVibration(gamepad); // 진동
      canShoot = false; // 단발 사격 중에는 다시 발사 불가
    }
  } else if (!gamepad.buttons[0].pressed) {
    canShoot = true; // 버튼 뗀 후 발사 가능
  }

  // R2 버튼으로 연발 사격 (강약 조절 가능 버튼)
  if (gamepad.buttons[7].pressed) {
    const triggerValue = gamepad.buttons[7].value; // 트리거 버튼 값
    const fireInterval = 100 + (1 - triggerValue) * 700; // 발사 간격 조정 (최소 100ms, 최대 800ms)
    if (now - lastShotTime > fireInterval) {
      shootBullet(isRedBullet ? 0xff0000 : 0x0000ff);
      playGunshotSound(); // 총 소리 재생
      lastShotTime = now;
      if (isVibrationEnabled) triggerVibration(gamepad); // 진동
    }
  }

  // ☐ 으로 진동 켜기/끄기
  const currentVibrationButtonState = gamepad.buttons[2].pressed;
  if (currentVibrationButtonState && !previousVibrationButtonState) {
    isVibrationEnabled = !isVibrationEnabled; // 진동 상태 토글
  }
  previousVibrationButtonState = currentVibrationButtonState; // 상태 업데이트

  // 1번 버튼(소리 켜기/끄기) 기능 추가
  if (gamepad.buttons[1].pressed && !previousSoundButtonState) {
    isSoundEnabled = !isSoundEnabled; // 소리 상태 토글
  }
  previousSoundButtonState = gamepad.buttons[1].pressed; // 상태 업데이트

  // L1 버튼(파란색 총알)과 R1 버튼(빨간색 총알)으로 색상 변경
  if (gamepad.buttons[4].pressed) isRedBullet = false;
  else if (gamepad.buttons[5].pressed) isRedBullet = true;
}

// 총알 발사 함수
function shootBullet(color) {
  const bulletGeometry = new THREE.SphereGeometry(0.1, 16, 16);
  const bulletMaterial = new THREE.MeshBasicMaterial({ color: color });
  const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);

  bullet.position.copy({ ...character.position, y: 1 }); // 캐릭터 위치에서 총알 생성
  bullet.rotation.copy(character.rotation);
  scene.add(bullet);

  // 총알의 이동 방향 설정
  const direction = new THREE.Vector3(
    Math.sin(character.rotation.y),
    0,
    Math.cos(character.rotation.y)
  );
  bullet.userData.velocity = direction.multiplyScalar(0.5); // 속도 설정

  bullets.push(bullet); // 총알을 배열에 추가
}

// 진동 기능
function triggerVibration(gamepad) {
  if (gamepad && gamepad.vibrationActuator && isVibrationEnabled) {
    gamepad.vibrationActuator.playEffect('dual-rumble', {
      startDelay: 0,
      duration: 200,
      weakMagnitude: 0.5,
      strongMagnitude: 1.0,
    });
  }
}

// 카메라 추적 함수
function updateCamera() {
  camera.position.x = character.position.x - Math.sin(character.rotation.y) * 5;
  camera.position.z = character.position.z - Math.cos(character.rotation.y) * 5;
  camera.position.y = character.position.y + 2; // 높이 조정
  camera.lookAt(character.position);
}

// 버튼 상태 업데이트 함수
function updateButtonStatus(gamepad) {
  document.getElementById('xButtonStatus').innerText = gamepad.buttons[0]
    .pressed
    ? '●'
    : '○';
  document.getElementById('r2ButtonStatus').innerText = `${Math.floor(
    gamepad.buttons[7].value * 100
  )}%`;
  document.getElementById('vibrationButtonStatus').innerText =
    isVibrationEnabled ? 'On' : 'Off';
  document.getElementById('soundButtonStatus').innerText = isSoundEnabled
    ? 'On'
    : 'Off';
  document.getElementById('bulletColorStatus').style.backgroundColor =
    isRedBullet ? '#f00' : '#00f';
}

// 애니메이션 및 게임패드 상태 업데이트
function animate() {
  const gamepads = navigator.getGamepads();
  if (gamepads[1]) {
    updateCharacter(gamepads[1]);
    updateButtonStatus(gamepads[1]); // UI 상태 업데이트
  }

  // 총알 이동
  bullets.forEach((bullet, index) => {
    bullet.position.add(bullet.userData.velocity);
    if (
      bullet.position.z < -50 ||
      bullet.position.z > 50 ||
      bullet.position.x < -50 ||
      bullet.position.x > 50
    ) {
      scene.remove(bullet);
      bullets.splice(index, 1);
    }
  });

  if (character) {
    updateCamera(); // 카메라 업데이트
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
