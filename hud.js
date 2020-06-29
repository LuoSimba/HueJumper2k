'use strict';

/**
 * 只是把各项数据显示出来
 *
 * 不会更改数据本身
 */
function HUD (ctx) {
    ctx.save();
    ctx.font = '2em"';
    ctx.fillStyle = 'red';

    {
        let strText0 = `${averageFps | 0}fps`;

        // 显示平均帧率
        ctx.fillText(strText0, 9, 480);
    }

    // 当鼠标按下时
    if (IsGameStart)
    {
        let strTime = Math.ceil(gTime); // 显示剩余时间
        let strDist = 0|playerPos.z/1000; // 显示路程
        let strText = `${strTime}s  ${strDist}m`;

        ctx.fillText(strText, 9, 109);
    }

    ctx.restore();
}



