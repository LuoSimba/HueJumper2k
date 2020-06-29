'use strict';


/////////////////////////////////////////////////////////////////////////////////////
// touch control
/////////////////////////////////////////////////////////////////////////////////////


/**
 * PC 端该条件不成立
 */
if (typeof ontouchend != 'undefined') {

    let ProcessTouch = e => {

        e.preventDefault();
        mouseDown = !(e.touches.length > 0);
        mouseWasPressed = 1;
        touchMode = 1;
        
        if (mouseDown)
            return;

        // average all touch positions
        let x = 0, y = 0;
        for (let touch of e.touches)
        {
            x += touch.clientX;
            y += touch.clientY;
        }
        mouseX = x/e.touches.length;
        mouseX = mouseX/window.innerWidth*2-1
    };

    c.addEventListener('touchstart',  ProcessTouch, false);
    c.addEventListener('touchmove',   ProcessTouch, false);
    c.addEventListener('touchcancel', ProcessTouch, false);
    c.addEventListener('touchend',    ProcessTouch, false);
}
