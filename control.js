'use strict';


document.onpointerlockchange = function (e) {

    if (document.pointerLockElement === CAN) {
        console.log('pointer lock on <canvas>');
        mouseLockX = 0;
    } else {
        console.log('exit pointer lock!');
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
 * 释放鼠标
 */
window.onmouseup = e => {
    mouseDown = 0;
};

/**
 * 按下鼠标
 */
window.onmousedown = function (e) {

    if (IsGameStart)
        mouseDown = 1;

    // 唯一更改：当鼠标按下时
    IsGameStart = 1;


    if (document.pointerLockElement !== CAN) {
        CAN.requestPointerLock();
    }
};

/**
 * 鼠标移动
 */
window.onmousemove = function (e) {

    // 如果鼠标没有被画布锁定，则什么也不做
    if (document.pointerLockElement !== CAN)
        return;

    // aaa = clientX / w * 2 - 1

    let aaa = e.clientX / window.innerWidth; // [0,1]
    aaa *= 2;  // [0,2]
    aaa -= 1;  // [-1,1]

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

