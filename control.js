'use strict';


document.onpointerlockchange = function (e) {

    if (document.pointerLockElement === CAN) {
        console.log('pointer lock on <canvas>');
        mouseLockX = 0;
        CAN.onmousedown = CTRL_BRAKE;
        CAN.onmousemove = CTRL_STEER;
        CAN.onmouseup   = CTRL_BREAK_RELEASE;
    } else {
        console.log('exit pointer lock!');
        CAN.onmousedown = CTRL_RESUME;
        CAN.onmousemove = null;
        CAN.onmouseup   = null;

        // set mouse down
        // if pointer lock released
        // 这里不考虑触控模式
        //if (!touchMode)
            mouseDown = 1;
    }
};

document.onpointerlockerror = function (e) {
    throw new Error('pointer lock error!');
};



/////////////////////////////////////////////////////////////////////////////////////
// mouse input
/////////////////////////////////////////////////////////////////////////////////////

let mouseDown       = 0; 
let IsGameStart     = 0;
let mouseUpFrames   = 0;
let mouseX          = 0;
let mouseLockX      = 0;
let touchMode       = 0;
    
/**
 * 第一次鼠标按下触发开始游戏
 */
CAN.onmousedown = function (e) {
    // 唯一更改
    IsGameStart = 1;

    this.requestPointerLock();
};

const CTRL_RESUME = function (e) {
    console.log('resume game!');

    this.requestPointerLock();
};

/**
 * 刹车控制(鼠标按下，释放)
 */
const CTRL_BRAKE         = function (e) { mouseDown = 1; };
const CTRL_BREAK_RELEASE = function (e) { mouseDown = 0; };


/**
 * 方向控制(鼠标移动)
 */
const CTRL_STEER = function (e) {
    // aaa = clientX / w * 2 - 1

    let aaa = e.clientX / window.innerWidth; // [0,1]
    aaa *= 2;  // [0,2]
    aaa -= 1;  // [-1,1]

    // ---
    const HALF = WIDTH / 2;

    // adjust for pointer lock 
    // movementX: 与上一个鼠标移动事件相比，x轴的增量
    mouseLockX += e.movementX;
    mouseLockX = Clamp(mouseLockX, -HALF, HALF);  // mouseLockX = [-HALF, HALF]

    const ratio = mouseLockX / HALF;  // ratio = [-1, 1]

    // 得到绝对值
    const uratio = Math.abs(ratio);  // uratio = [0, 1]

    // 得到正负符号
    const sss = Math.sign(ratio);

    // apply curve to input
    const inputCurve = 1.5;

    mouseX = 1 - (1- uratio) ** inputCurve;

    // 添加正负符号
    mouseX = sss * mouseX;

    mouseX *= window.innerWidth/2;

    mouseX += window.innerWidth/2;

    mouseX = mouseX/window.innerWidth*2-1
};



/////////////////////////////////////////////////////////////////////////////////////
// keyboard control
/////////////////////////////////////////////////////////////////////////////////////

let inputIsDown    = [];
let inputWasDown   = [];
let inputWasPushed = [];


/**
 * 按下按键
 */
window.onkeydown = function (e) {

    inputIsDown[e.keyCode] = 1;
};

/**
 * 释放按键
 */
window.onkeyup = function (e) {

    inputIsDown[e.keyCode] = 0;
};


function UpdateInput()
{
    inputWasPushed = inputIsDown.map(
            (e,i) => e && !inputWasDown[i]
            );

    inputWasDown = inputIsDown.slice();
}

