// 게임패드 연결
window.addEventListener('gamepadconnected', (e) => {
  console.log(e);
  handleConnectDisconnect(e, true);
});

// 게임패드 해제
window.addEventListener('gamepaddisconnected', (e) => {
  handleConnectDisconnect(e, false);
});

// 게임패드 연결/해제 시 UI
function handleConnectDisconnect(e, connected) {
  const gamepad = e.gamepad;

  const controllerAreaNotConnected = document.getElementById(
    `controller-not-connected-area-${gamepad.index}`
  );
  const controllerAreaConnected = document.getElementById(
    `controller-connected-area-${gamepad.index}`
  );

  if (connected) {
    controllerAreaNotConnected.style.display = 'none';
    controllerAreaConnected.style.display = 'block';
    createButtonLayout(gamepad.buttons, gamepad.index);
    createAxesLayout(gamepad.axes, gamepad.index);
  } else {
    controllerAreaNotConnected.style.display = 'block';
    controllerAreaConnected.style.display = 'none';
  }
}

// 스틱 방향값 UI
function createAxesLayout(axes, gamepadIdx) {
  const buttonsArea = document.querySelector(
    `#controller${gamepadIdx} #buttons`
  );
  for (let i = 0; i < axes.length; i++) {
    buttonsArea.innerHTML += `<div id=axis-${i} class='axis'>
                                   <div class='axis-name'>AXIS ${i}</div>
                                   <div class='axis-value'>${axes[i].toFixed(
                                     4
                                   )}</div>
                                </div> `;
  }
}

// 게임패드 내 버튼 UI 생성
function createButtonLayout(buttons, gamepadIdx) {
  const buttonArea = document.querySelector(
    `#controller${gamepadIdx} #buttons`
  );
  buttons.innerHTML = '';
  for (let i = 0; i < buttons.length; i++) {
    buttonArea.innerHTML += createButtonHtml(i, 0);
  }
}

// 버튼 UI
function createButtonHtml(index, value) {
  return `<div class="button" id="button-${index}">
    <svg width="10px" height="50px">
        <rect width="10px" height="50px" fill="grey"></rect>
        <rect
            class="button-meter"
            width="10px"
            x="0"
            y="50"
            data-original-y-position="50"
            height="50px"
            fill="rgb(60, 61, 60)"
        ></rect>
    </svg>
    <div class='button-text-area'>
        <div class="button-name">B${index}</div>
        <div class="button-value">${value.toFixed(2)}</div>
    </div>
</div>`;
}

// 누른 버튼 UI 업데이트 (value, value에 따른 게이지)
function updateButtonOnGrid(index, value, gamepadIdx) {
  const buttonArea = document.querySelector(
    `#controller${gamepadIdx} #button-${index}`
  );
  const buttonValue = buttonArea.querySelector(
    `#controller${gamepadIdx} .button-value`
  );
  buttonValue.innerHTML = value.toFixed(2);

  const buttonMeter = buttonArea.querySelector(
    `#controller${gamepadIdx} .button-meter`
  );
  const meterHeight = Number(buttonMeter.dataset.originalYPosition);
  const meterPosition = meterHeight - (meterHeight / 100) * (value * 100);
  buttonMeter.setAttribute('y', meterPosition);
}

// 컨트롤러 버튼 누름 강약에 따른 스타일 업데이트
function updateControllerButton(index, value, gamepadIdx) {
  const button = document.querySelector(
    `#controller${gamepadIdx} #controller-b${index}`
  );
  const selectedButtonClass = 'selected-button';

  if (button) {
    if (value > 0) {
      button.classList.add(selectedButtonClass);
      button.style.filter = `contrast(${value * 200}%)`;
    } else {
      button.classList.remove(selectedButtonClass);
      button.style.filter = `contrast(100%)`;
    }
  }
}

function handleButtons(gamepadIdx, buttons) {
  for (let i = 0; i < buttons.length; i++) {
    const buttonValue = buttons[i].value;
    updateButtonOnGrid(i, buttonValue, gamepadIdx);
    updateControllerButton(i, buttonValue, gamepadIdx);
  }
}

// 스틱 이동
function handleSticks(gamepadIdx, axes) {
  updateAxesGrid(axes, gamepadIdx);
  updateStick(gamepadIdx, 'controller-b10', axes[0], axes[1]);
  updateStick(gamepadIdx, 'controller-b11', axes[2], axes[3]);
}

function updateAxesGrid(axes, gamepadIdx) {
  for (let i = 0; i < axes.length; i++) {
    const axis = document.querySelector(
      `#controller${gamepadIdx} #axis-${i} .axis-value`
    );
    const value = axes[i];
    // if (value > 0.06 || value < -0.06) {
    axis.innerHTML = value.toFixed(4);
    // }
  }
}

// 이동한 스틱 방향값 업데이트
function updateStick(gamepadIdx, elementId, leftRightAxis, upDownAxis) {
  const multiplier = 25;
  const stickLeftRight = leftRightAxis * multiplier;
  const stickUpDown = upDownAxis * multiplier;

  const stick = document.querySelector(
    `#controller${gamepadIdx} #${elementId}`
  );
  const x = Number(stick.dataset.originalXPosition);
  const y = Number(stick.dataset.originalYPosition);

  stick.setAttribute('cx', x + stickLeftRight);
  stick.setAttribute('cy', y + stickUpDown);
}

function handleRumble(gamepadIdx, gamepad) {
  const rumbleOnButtonPress = document.querySelector(
    `#controller${gamepadIdx} #rumble-on-button-press`
  );

  if (rumbleOnButtonPress.checked) {
    // 컨트롤러만 진동
    if (
      gamepad.buttons.some(
        (button, idx) => [6, 7].includes(idx) && button.value > 0
      )
    ) {
      gamepad.vibrationActuator.playEffect('dual-rumble', {
        startDelay: 0,
        duration: 25,
        weakMagnitude: 1.0,
        strongMagnitude: 1.0,
      });
    }
  }
}

function gameLoop() {
  const gamepad = navigator.getGamepads().filter((item) => item);
  gamepad.forEach((item) => {
    handleButtons(item.index, item.buttons);
    handleSticks(item.index, item.axes);
    handleRumble(item.index, item);
  });
  requestAnimationFrame(gameLoop);
}
gameLoop();
