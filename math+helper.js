'use strict';

// global game variables
let hueShift;                   // current hue shift for all hsl colors

/////////////////////////////////////////////////////////////////////////////////////
// math and helper functions
/////////////////////////////////////////////////////////////////////////////////////
    
/**
 *
 * hue 颜色 0-360
 * s 0%-100%
 * l 0%-100%
 * alpha 透明度 （0-1）
 */
const LSHA = (l, s=0, h=0, alpha=1) => {
    return `hsl(${ h + hueShift },${ s }%,${ l }%,${ alpha })`;
};

const Clamp      = (v, min, max)      => Math.min(Math.max(v, min), max);
const ClampAngle = (a)                => (a+Math.PI) % (2*Math.PI) + (a+Math.PI<0? Math.PI : -Math.PI);
const Lerp       = (p, a, b)          => a + Clamp(p, 0, 1) * (b-a);
const Random     = (max=1, min=0)     => Lerp((Math.sin(++randomSeed)+1)*1e5%1, min, max);
   
// simple 3d vector class
class Vector3 
{
    constructor(x=0, y=0, z=0) { this.x = x; this.y = y; this.z = z }
	Add(v)      { v = isNaN(v) ? v : new Vector3(v,v,v); return new Vector3( this.x + v.x, this.y + v.y, this.z + v.z); }
	Multiply(v) { v = isNaN(v) ? v : new Vector3(v,v,v); return new Vector3( this.x * v.x, this.y * v.y, this.z * v.z); }
}
    
// draw a trapazoid shaped poly
function DrawPoly(x1, y1, w1, x2, y2, w2, fillStyle) 
{
    context.beginPath(context.fillStyle = fillStyle);
    context.lineTo(x1-w1, y1|0);
    context.lineTo(x1+w1, y1|0);
    context.lineTo(x2+w2, y2|0);
    context.lineTo(x2-w2, y2|0);
    context.fill();
}

// draw outlined hud text
function DrawText(text, posX) 
{
    context.font = '9em impact';           // set font size
    context.fillStyle = LSHA(99,0,0,.5);   // set font 
    context.fillText(text, posX, 129);     // fill text
    context.lineWidth = 3;                 // line width
    context.strokeText(text, posX, 129);   // outline text
}




