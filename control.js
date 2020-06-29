'use strict';


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
window.onmousedown = e => {

    if (IsGameStart)
        mouseDown = 1;

    // 唯一更改：当鼠标按下时
    IsGameStart = 1;

    if (usePointerLock && e.button == 0 && document.pointerLockElement !== c)
    {
        c.requestPointerLock();
        mouseLockX = 0;
    }
};

window.onmousemove = e => {
    if (!usePointerLock)
    {
        mouseX = e.x/window.innerWidth*2-1
        return;
    }
    
    if (document.pointerLockElement !== c)
        return;
    
    // adjust for pointer lock 
    mouseLockX += e.movementX;
    mouseLockX = Clamp(mouseLockX, -window.innerWidth/2,  window.innerWidth/2);
    
    // apply curve to input
    const inputCurve = 1.5;
    mouseX = mouseLockX;
    mouseX /= window.innerWidth/2;
    mouseX = Math.sign(mouseX) * (1-(1-Math.abs(mouseX))**inputCurve);
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
window.onkeydown = e => inputIsDown[e.keyCode] = 1;

/**
 * 释放按键
 */
window.onkeyup   = e => inputIsDown[e.keyCode] = 0;


function UpdateInput()
{
    inputWasPushed = inputIsDown.map((e,i) => e && !inputWasDown[i]);
    inputWasDown = inputIsDown.slice();
}

