'use strict';


/////////////////////////////////////////////////////////////////////////////////////
// math and helper functions
/////////////////////////////////////////////////////////////////////////////////////
    
/**
 * 生成 CSS 颜色字符串
 *
 * hue 颜色 0-360
 * S 0%-100%
 * L 0%-100%
 * alpha 透明度 （0-1）
 */
const LSHA = (L, S=0, H=0, alpha=1) => {

    const color = `hsl(${ H },${ S }%,${ L }%,${ alpha })`;

    return color;
};


/**
 * 将 v 限定在区间 [min, max] 之内
 *
 * if v < min: return min
 * else if v > max: return max
 * else: return v
 */
const Clamp = (v, min, max) => Math.min(
    Math.max(v, min), max
);

const ClampAngle = (a) => (a+Math.PI) % (2*Math.PI) + (a+Math.PI<0? Math.PI : -Math.PI);

/**
 * 插值函数
 *
 * 使动作看起来更圆滑
 *
 * from 起始位置
 * to   目标位置
 */
const Lerp = (p, from, to) => {

    // 将 p 值限定在 [0, 1] 之内
    p = Clamp(p, 0, 1);

    return from + (to - from) * p;
};

/**
 * 随机函数
 */
const Random = (max=1, min=0) => {

    randomSeed ++;

    const a = Math.sin(randomSeed) + 1;

    const v = a * 100000 % 1;

    return Lerp(v, min, max);
};
   
/**
 * simple 3d vector class
 */
class Vector3 
{
    /**
     * 坐标必须明确给出
     */
    constructor(x, y, z) {
        this.x = x;
        this.y = y;
        this.z = z;
    }

	Add(v) {
        v = isNaN(v) ? v : new Vector3(v,v,v);

        return new Vector3( this.x + v.x, this.y + v.y, this.z + v.z);
    }

	Multiply(v) {
        v = isNaN(v) ? v : new Vector3(v,v,v);

        return new Vector3( this.x * v.x, this.y * v.y, this.z * v.z);
    }
}
    
/**
 * 绘制不规则四边形
 *
 * y 总是取整
 */
function DrawPoly(x1, y1, w1, x2, y2, w2, color) 
{
    CTX.fillStyle = color;

    CTX.beginPath();
    CTX.moveTo(x1-w1, y1|0);
    CTX.lineTo(x1+w1, y1|0);
    CTX.lineTo(x2+w2, y2|0);
    CTX.lineTo(x2-w2, y2|0);

    CTX.fill();
}

function DrawRect(x, y, w, h, color) 
{
    CTX.fillStyle = color;

    CTX.beginPath();
    CTX.rect(x, y|0, w, h|0);
    CTX.fill();
}

