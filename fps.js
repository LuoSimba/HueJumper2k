"use strict";



/////////////////////////////////////////////////////////////////////////////////////
// frame rate counter
/////////////////////////////////////////////////////////////////////////////////////
    

// global variables
let averageFps = 0; // 平均帧率

const UpdateFps = (function () {

    // private variables
    let lastFpsMS = 0;  // 用于保存上一次测量时刻

    /**
     * 计算帧率
     */
    return function () {

        let ms = performance.now();
        let deltaMS = ms - lastFpsMS;  // 读取与上一次测量的时间差
        lastFpsMS = ms;                // 写入本次时刻，作为下一次测量的基准
        
        // 瞬时帧率
        //
        // 先将时间间隔换算成秒
        // 再取倒数，就是fps (frames per second)
        //
        // fps = frames / seconds
        //     = 1 frame / delta
        let fps = 1 / ( deltaMS/1000 );

        // 平均帧率的计算方式
        averageFps = averageFps*.9 + fps*.1;
    };
})();

