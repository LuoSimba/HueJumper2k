'use strict';


document.onpointerlockchange = function (e) {

    if (document.pointerLockElement === CAN) {
        console.log('pointer lock on <canvas>');
        gSteerX = 0;
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
            gBreakOn = 1;
    }
};

document.onpointerlockerror = function (e) {
    throw new Error('pointer lock error!');
};



/////////////////////////////////////////////////////////////////////////////////////
// mouse input
/////////////////////////////////////////////////////////////////////////////////////

let gBreakOn        = 0; // 刹车
let IsGameStart     = 0;
let mouseUpFrames   = 0;
let mouseX          = 0;
let gSteerX         = 0; // 方向
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
const CTRL_BRAKE         = function (e) { gBreakOn = 1; };
const CTRL_BREAK_RELEASE = function (e) { gBreakOn = 0; };


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
    gSteerX += e.movementX;
    gSteerX = Clamp(gSteerX, -HALF, HALF);  // gSteerX = [-HALF, HALF]

    const ratio = gSteerX / HALF;  // ratio = [-1, 1]

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


(function () {
    const gKeyState = new Set;

    const _KEYUP = function (e) {
        gKeyState.delete(e.keyCode);
    };

    const _KEYDOWN = function (e) {
        // 如果已经是按下状态，什么也不做
        if (gKeyState.has(e.keyCode))
        {
            // do nothing
        }
        else 
        {
            gKeyState.add(e.keyCode);

            DealKey(e.keyCode);
        }
    };


    window.onkeyup   = _KEYUP;
    window.onkeydown = _KEYDOWN;
})();

/**
 * 对按键的处理
 *
 * 可以立马响应按键，而不必等到 Update() 函数执行
 */
function DealKey(key_code) {

    if (key_code === 82)  // R = restart
    {
        console.log('RESTART ...');
        gSteerX = 0;
        StartLevel(); 
    }
    // else ...
}



// window.onkeydown 和 window.onkeypress 有区别
// onkeydown 可以响应方向键，而 onkeypress 无法感知。
// 共同点：都在按键按下时触发，而且会连续触发

