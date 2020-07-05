'use strict';

/**
 * 只是把各项数据显示出来
 *
 * 不会更改数据本身
 */
function HUD (ctx) {

    const objs = [];
    //objs.push(playerVelocity);
    //objs.push(timeBuffer);

    ctx.save();
    ctx.font = '2em"';
    ctx.fillStyle = 'red';

    let y = 50;

    const print = text => {
        ctx.fillText(text, 9, y);

        y += 50;
    };

    // 方向控制
    objs.push(`steer: ${gSteerX}`);
    // 刹车状态
    objs.push(gBreakOn ? 'break on' : 'break off');

    // 平均帧率
    objs.push(`${averageFps |0}fps`);

    // 路程
    objs.push(`${0| playerPos.z/1000 }m`);


    // 先显示传入的参数
    for (let text of objs) {
        if (typeof text === 'object')
            text = JSON.stringify(text);

        print(text);
    }

    ctx.restore();
}

