'use strict';

/**
 * 只是把各项数据显示出来
 *
 * 不会更改数据本身
 */
function HUD (ctx, objs = []) {
    ctx.save();
    ctx.font = '2em"';
    ctx.fillStyle = 'red';

    let y = 50;

    const print = text => {
        ctx.fillText(text, 9, y);

        y += 50;
    };


    // 平均帧率
    objs.push(`${averageFps |0}fps`);

    // 路程
    objs.push(`${0| playerPos.z/1000 }m`);

    // 剩余时间
    objs.push(`${ Math.ceil(gTime) }s`);


    // 先显示传入的参数
    for (let text of objs) {
        if (typeof text === 'object')
            text = JSON.stringify(text);

        print(text);
    }

    ctx.restore();
}

