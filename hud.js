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
        ctx.fillText(strText0, 9, 60);
    }

    {
        let strDist = 0|playerPos.z/1000; // 显示路程
        let strText1 = `${strDist}m`;
        ctx.fillText(strText1, 9, 110);
    }

    {
        // 就算游戏没有开始，也可以显示剩余时间
        // 因为它是一个全局变量
        let strTime = Math.ceil(gTime);
        let strText = `${strTime}s`;

        ctx.fillText(strText, 9, 160);
    }

    {
        let str = `hue shift=${gHueShift}`;
        ctx.fillText(str, 9, 210);
    }

    ctx.restore();
}



