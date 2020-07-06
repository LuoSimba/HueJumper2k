'use strict';

// clamp 夹子
// remainder 剩余物，余数
// remainder operation 取余运算（数学概念）
// modulus 模量
// modulus operation 取模运算（计算机术语: 取模数的余数）（a % b）

// -7 mod 4 = ?
// 1. c = (-7) / 4 = -1.75
// 2. c' = floor(c) = -2
// 3. -7 = c' * 4 + r 
//       = (-2) * 4 + 1
// r = 1

// ################## JavaScript ################
// -7 % 4 = ?
// 1. c = (-7) / 4 = -1.75
// 2. c' = fix(c) = -1
// 3. -7 = c' * 4 + r
//       = (-1) * 4 + (-3)
// r = -3
// ##############################################


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



/**
 * return angle between -180deg and 180deg
 */
function ClampAngle(a)
{
    // b 是一个未知的角度
    let b = a + Math.PI;

    // c = b % (360deg)
    // if b >= 0: c is [0, 2pi)
    // else:      c is (-2pi, 0)
    let c = b % (Math.PI * 2);

    if (b < 0) {
        return c + Math.PI;  // (-pi, pi)
    } else {
        return c - Math.PI;  // [-pi, pi)
    }
}

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
    x = 0;
    y = 0;
    z = 0;

    /**
     * 坐标必须明确给出
     */
    constructor(x, y, z) {
        this.x = x;
        this.y = y;
        this.z = z;
    }

    copy () {
        return new Vector3(this.x, this.y, this.z);
    }

    add (x, y, z) {
        this.x += x;
        this.y += y;
        this.z += z;
    }

    addVector (v) {
        if (!(v instanceof Vector3))
            throw new Error('invalid v');

        this.x += v.x;
        this.y += v.y;
        this.z += v.z;
    }

	Multiply(v) {
        v = isNaN(v) ? v : new Vector3(v,v,v);

        return new Vector3( this.x * v.x, this.y * v.y, this.z * v.z);
    }

    multiplyVector (v) {
        if (!(v instanceof Vector3))
            throw new Error('invalid v');

        this.x *= v.x;
        this.y *= v.y;
        this.z *= v.z;
    }

    multiply (n) {
        this.x *= n;
        this.y *= n;
        this.z *= n;
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

