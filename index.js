'use strict';



let gLighting = 0;
const c = document.getElementById('c'); // <canvas>

// FOV of camera (1 / Math.tan((fieldOfView/2) * Math.PI/180))
const CAMERA_DEPTH = 1;
// pre calculate projection scale,
// 翻转 Y 轴因为在 <canvas> 里 y+ 是下方
// get projection scale
const projectScale = new Vector3(1, -1, 1);
projectScale.multiply(WIDTH / 2 / CAMERA_DEPTH);


// draw settings
const drawDistance = 800;            // how many road segments to draw in front of player
const ROAD_SEGMENT_LENGTH = 100;       // length of each road segment
const ROAD_WIDTH = 500;               // how wide is road


// player settings
const PLAYER_HEIGHT = 150;            // how high is player above ground
const MAX_SPEED = 300;          // limit max player speed
const playerTurnControl = .2;        // player turning rate
const playerSpringConstant = .01;    // spring players pitch
const playerCollisionSlow = .1;      // slow down from collisions
const pitchLerp = .1;                // speed that camera pitch changes
const pitchSpringDamping = .9;       // dampen the pitch spring
const centrifugal = .002;            // how much to pull player on turns


    
// level settings
const ROAD_END = 10000;               // how many sections until end of the road
    
// global game variables  
let playerPos;                  // player position 3d vector

let playerVelocity;             // player velocity 3d vector

let playerPitchSpring;          // spring for player pitch bounce
let playerPitchSpringVelocity;  // velocity of pitch spring
let playerPitchRoad;            // pitch of road, or 0 if player is in air
let playerAirFrame;             // how many frames player has been in air

// heading to turn skybox
let worldHeading;

let randomSeed;                 // random seed for level
let road;                       // the list of road segments


/**
 * road segment
 */
class RoadSeg {

    x = 0;
    y = 0;
    w = 0;

    constructor (x, y, w) {
        this.x = x;
        this.y = y;
        this.w = w;
    }
}

class RoadInfo {

    // current player road segment
    _index = 0;

    // get player road segment
    setPosition (z) {

        this._index = ( z / ROAD_SEGMENT_LENGTH )|0;
    }

    get roadSeg () {
        return road[ this._index ];
    }

    get nextRoadSeg () {
        return road[ this._index + 1 ];
    }

    Index (offset = 0) {
        return this._index + offset;
    }

    Segment (offset = 0) {
        return road[ this.Index(offset) ];
    }
}


const playerRoad = new RoadInfo;


function StartLevel()
{ 
    /////////////////////////////////////////////////////////////////////////////////////
    // build the road with procedural generation
    /////////////////////////////////////////////////////////////////////////////////////

    let roadGenSectionDistanceMax = 0;          // init end of section distance
    let roadGenWidth = ROAD_WIDTH;               // starting road width
    let roadGenSectionDistance = 0;             // distance left for this section
    let roadGenTaper = 0;                       // length of taper
    let roadGenWaveFrequencyX = 0;              // X wave frequency 
    let roadGenWaveFrequencyY = 0;              // Y wave frequency
    let roadGenWaveScaleX = 0;                  // X wave amplitude (turn size)
    let roadGenWaveScaleY = 0;                  // Y wave amplitude (hill size)

    // 初始化随机种子
    randomSeed = SEED;

    // clear list of road segments
    road = [];
    
    // generate the road
    // 一共生成 2W 条数据
    for( let i = 0; i < ROAD_END * 2; i ++ )           // build road past end
    {
        if (roadGenSectionDistance++ > roadGenSectionDistanceMax)     // check for end of section
        {

            const ia = i * 100;

            // calculate difficulty percent （困难程度）
            // 用 9 个检查点那么长的路程作为分母
            // 如果 ia 超过分母，则难度超过 1
            let difficulty = ia / 900000;

            // 困难程度不会超过 1
            if (difficulty > 1) 
                difficulty = 1;

            // 随机设置赛道
            //
            // 赛道宽度
            roadGenWidth          = ROAD_WIDTH * Random(1-difficulty*.7, 3-2*difficulty);
            // X frequency
            roadGenWaveFrequencyX = Random(Lerp(difficulty, .01, .02));
            // Y frequency
            roadGenWaveFrequencyY = Random(Lerp(difficulty, .01, .03));
            // X scale
            roadGenWaveScaleX     = i > ROAD_END ? 0 : Random(Lerp(difficulty, .2, .6));
            // Y scale
            roadGenWaveScaleY     = Random(Lerp(difficulty, 1e3, 2e3));
            
            // apply taper and move back
            roadGenTaper = Random(99, 1e3)|0;                           // randomize taper
            roadGenSectionDistanceMax = roadGenTaper + Random(99, 1e3); // randomize segment distance
            roadGenSectionDistance = 0;                                 // reset section distance
            i -= roadGenTaper;                                          // subtract taper
        }
        
        // 让道路变得崎岖
        // road X
        //const x = Math.sin(i*roadGenWaveFrequencyX) * roadGenWaveScaleX;
        // road Y
        //const y = Math.sin(i*roadGenWaveFrequencyY) * roadGenWaveScaleY;
        const x = 0;
        const y = 0;

        let currentRoad;

        if (road[i]) 
        {
            currentRoad = road[i];
        }
        else 
        {
            currentRoad = new RoadSeg(x, y, roadGenWidth);
        }
        
        // apply taper from last section
        const p = Clamp(roadGenSectionDistance / roadGenTaper, 0, 1);         // get taper percent

        // X pos and taper
        currentRoad.x = Lerp(p, currentRoad.x, x);

        // Y pos and taper
        currentRoad.y = Lerp(p, currentRoad.y, y);

        // check for road end, width and taper
        if (i > ROAD_END) {
            currentRoad.w = 0;
        } else {
            currentRoad.w = Lerp(p, currentRoad.w, roadGenWidth);
        }

        // road pitch angle
        if (road[i-1]) {
            currentRoad.ang = Math.atan2(road[i-1].y- currentRoad.y, ROAD_SEGMENT_LENGTH);
        } else {
            currentRoad.ang = 0;
        }

        road[i] = currentRoad;
    }  
    
    /////////////////////////////////////////////////////////////////////////////////////
    // init game
    /////////////////////////////////////////////////////////////////////////////////////
     
    // 重置一切
    playerPitchSpring         = 0;
    playerPitchSpringVelocity = 0;
    playerPitchRoad           = 0;

    // 初始速度
    playerVelocity = new Vector3(0, 0, 0);

    // set player pos
    playerPos = new Vector3(0, PLAYER_HEIGHT, 0);


    // randomize world heading
    worldHeading = randomSeed;
    console.log(worldHeading);
}

// 上次执行 update 的时间
let lastUpdate = 0;
// frame rate adjustment
let timeBuffer = 0;

/**
 * 动画循环
 */
function Update()
{
    // 防止帧率超过60帧
    //
    // 当下时刻
    const now = performance.now();

    // 不是第一次执行
    if (lastUpdate) {

        // 计算和前一次的时间差
        const delta = now - lastUpdate;

        // limit to 60 fps
        if (timeBuffer + delta < 0)
        {
            // 太快了，本次作废，请求下次执行
            requestAnimationFrame(Update);
            return;
        }
        
        timeBuffer += (delta - 1000/60);

        // if running too slow
        if (timeBuffer > 1000/60)
        {
            timeBuffer = 0;
        }
    }

    // 记住当下时刻，作为下次的参照
    lastUpdate = now;
    

    // start frame
    // 重新调整尺寸，清除画布
    CAN.width  = WIDTH;
    CAN.height = HEIGHT;
    
    /////////////////////////////////////////////////////////////////////////////////////
    // update player - controls and physics
    /////////////////////////////////////////////////////////////////////////////////////
    

    playerRoad.setPosition( playerPos.z );

    const playerRoadSegment = playerRoad.Index(0);
    // how for player is along current segment
    const playerRoadSegmentPercent = ( playerPos.z / ROAD_SEGMENT_LENGTH )%1;
    
    // get lerped values between last and current road segment
    const playerRoadX = Lerp(playerRoadSegmentPercent, playerRoad.roadSeg.x, playerRoad.nextRoadSeg.x);

    // ground plane
    const playerRoadY = Lerp(playerRoadSegmentPercent, playerRoad.roadSeg.y, playerRoad.nextRoadSeg.y) + PLAYER_HEIGHT;

    // 路的倾斜程度
    const roadPitch = Lerp(playerRoadSegmentPercent, playerRoad.roadSeg.ang, playerRoad.nextRoadSeg.ang);

    // save last velocity
    const playerVelocityLast = playerVelocity.copy();


    // 施加在 Y 轴上的重力
    // 就是物体下落的速度，标准是每次-1
    playerVelocity.y -= 0.1;

    // apply lateral 阻尼
    // dampen player x speed
    playerVelocity.x *= .7;

    // apply 阻尼
    // dampen player z speed
    // forward damping
    playerVelocity.z *= .999;
        
    // 只须前进，不许倒退
    if (playerVelocity.z < 0)
        playerVelocity.z = 0;

    // 按照速度前进
    playerPos.addVector(playerVelocity);
    
    const playerTurnAmount = Lerp(playerVelocity.z/MAX_SPEED, mouseX * playerTurnControl, 0); // turning

    // update x velocity
    playerVelocity.x +=
        playerVelocity.z * playerTurnAmount -                // apply turn
        playerVelocity.z ** 2 * centrifugal * playerRoadX;   // apply centrifugal force

    // 检查是否在地面上
    if (playerPos.y < playerRoadY)
    {
        // bounce velocity against ground normal

        // 没有这一行，赛车会因为重力沉入地下
        playerPos.y = playerRoadY;

        // reset air grace frames
        playerAirFrame = 0;

        {
            // get ground normal
            let a = new Vector3(0, Math.cos(roadPitch), Math.sin(roadPitch));

            let b = Math.cos(roadPitch) * playerVelocity.y + Math.sin(roadPitch) * playerVelocity.z;

            // 弹跳
            // bounce elasticity (2 is fnull bounce, 1 is none)
            let c = -1.2 * b; // dot of road and velocity

            a.multiply(c);

            playerVelocity.addVector(a); // add velocity
        }


        if (gBreakOn) {
            // 刹车
            // 刹车相当于一个反向的加速度
            playerVelocity.z += -3;
        } else {
            // apply accel
            playerVelocity.z += Lerp(playerVelocity.z/MAX_SPEED, IsGameStart* 1, 0);
        }

        
        // check if off road
        if (Math.abs(playerPos.x) > playerRoad.roadSeg.w)
        {
            // 离开道路时，车速降低
            // 离开道路时，阻尼（damping）增大
            playerVelocity.z *= .98;

            // 离开道路时，颠簸行进
            playerPitchSpring += Math.sin(playerPos.z/99) ** 4 / 99;
        }
    }
    // in air
    else {
        playerAirFrame ++;
    }



    // update jump
    // check for jump
    //
    if (gState.has(JUMP))
    {
        gState.delete(JUMP);

        // 赛车在空中停留了几帧？
        if (playerAirFrame < 7)
        {
            console.log('JUMP ok', playerAirFrame);

            // z speed added for jump
            playerVelocity.y += 25;       // apply jump velocity
            playerAirFrame = 9;           // prevent jumping again
        }
    }


    const airPercent = (playerPos.y-playerRoadY)/99;                                  // calculate above ground percent
    playerPitchSpringVelocity += Lerp(airPercent,0,playerVelocity.y/4e4);             // pitch down with vertical velocity
    
    // update player pitch
    playerPitchSpringVelocity += (playerVelocity.z - playerVelocityLast.z)/2e3;       // pitch down with forward accel
    playerPitchSpringVelocity -= playerPitchSpring * playerSpringConstant;            // apply pitch spring constant
    playerPitchSpringVelocity *= pitchSpringDamping;                                  // dampen pitch spring
    playerPitchSpring += playerPitchSpringVelocity;                                   // update pitch spring        

    // match pitch to road
    playerPitchRoad = Lerp(pitchLerp, playerPitchRoad, Lerp(airPercent,-roadPitch,0));

    // update player pitch
    const playerPitch = playerPitchSpring + playerPitchRoad;
    
    
    /////////////////////////////////////////////////////////////////////////////////////
    // 绘制背景 - 天空，太阳/月亮, 群山, 和地平线
    /////////////////////////////////////////////////////////////////////////////////////
    
    randomSeed = SEED;                   // set start seed

    // how much to rotate world around turns
    //const worldRotateScale = .00005;     
    const worldRotateScale = .005;     

    // update world angle
    {
        //const angle = worldHeading + playerVelocity.z * playerRoadX * worldRotateScale;
        //worldHeading = ClampAngle( angle );
    }
    


    // scale of player turning to rotate camera(camera heading scale) = 2
    const cameraHeading = playerTurnAmount * 2;     // turn camera with player 
    const cameraOffset = Math.sin(cameraHeading) / 2;        // apply heading with offset



    
    // 绘制天空
    //
    // brightness from the sun * 10
    const lighting = Math.cos(worldHeading) * 10;
    gLighting = lighting;

    // get horizon line
    // 基本上在画面高度的一半
    const horizon = HEIGHT / 2 - Math.tan(playerPitch) * projectScale.y;


    // 使用线性渐变作为天空的颜色
    const g = CTX.createLinearGradient(0, horizon- HEIGHT / 2, 0, horizon);
    // top sky color
    g.addColorStop( 0, LSHA(39+lighting*25,49+lighting*19,230-lighting*19));
    // bottom sky color
    g.addColorStop( 1, LSHA(5,79,250-lighting*9));

    // draw sky
    DrawRect(0, 0, WIDTH, HEIGHT, g);
    
    {
        // 绘制月亮
        const ratio = worldHeading / Math.PI; // ratio is [-1, 1)
        const ratio2 = ratio / 2;   // ratio2 is [-0.5, 0.5)
        const ratio3 = ratio2 + 0.5;  // ratio3 is [0, 1)
        const ratio4 = (ratio3 + .5) % 1; // sun angle percent, angle 0 is center
        const ratio5 = Lerp(ratio4, 4, -4);

        const ratio6 = 0.5 + 0 - cameraOffset;

        // move far away for wrap
        const x = WIDTH * ratio6;

        const y = horizon - WIDTH / 5;

        const g = CTX.createRadialGradient(
                x, y, WIDTH / 25,
                x, y, WIDTH / 23);

        g.addColorStop(0, "#b3b3b3");
        g.addColorStop(1, "transparent");

        DrawRect(0, 0, WIDTH, HEIGHT, g);
    }

    {
        // 绘制太阳
        const x = WIDTH * ( .5 + Lerp (      // angle 0 is center
                    (worldHeading / Math.PI / 2 + .5 + 0 / 2) % 1,  // sun angle percent
                    4, -4) - cameraOffset); // sun x pos, move far away for wrap

        const y = horizon - WIDTH / 5;     // sun y pos

        const g = CTX.createRadialGradient(
            x, y, WIDTH / 25,
            x, y, WIDTH);

        g.addColorStop(0, "#fcfcfc");
        g.addColorStop(1, "transparent");

        DrawRect(0, 0, WIDTH, HEIGHT, g);
    }

    // draw every mountain (there are 30 mountains)
    for(let i = 30; i--; )  
    {
        const angle = ClampAngle(worldHeading+Random(19));           // mountain random angle
        const lighting = Math.cos(angle-worldHeading);               // mountain lighting

        // mountain x pos, move far away for wrap
        const x = c.width * (.5+Lerp(angle/Math.PI/2+.5, 4, -4)-cameraOffset);
        // mountain base
        const y = horizon;
        // mountain width 
        const w = Random(.2,.8)**2*c.width/2;

        DrawPoly(
                x, y, w,
                x+w*Random(-.5,.5),                                                 // random tip skew
                y - Random(.5,.8)*w, 0,                                             // mountain height
                LSHA(Random(15,25)+i/3-lighting*9,i/2+Random(19),Random(220,230))); // mountain color
    }

    
    // draw horizon
    //  horizon pos & size
    DrawRect(0, horizon, c.width, c.height - horizon, "#3d532d");

    //requestAnimationFrame(Update);
    //return;

    
    /////////////////////////////////////////////////////////////////////////////////////
    // draw road and objects
    /////////////////////////////////////////////////////////////////////////////////////
    
    // calculate road x offsets and projections
    {
        let w = 0;
        let i = 0;
        let x = 0;
        for( ; i < drawDistance+1; )
        {
            // create road world position
            let p = new Vector3(                                                     // set road position
                x += w += playerRoad.Segment(i).x,                               // sum local road offsets
                playerRoad.Segment(i).y,
                playerRoad.Index(i) * ROAD_SEGMENT_LENGTH);// road y and z pos

            {
                let a = playerPos.copy();

                a.multiply(-1);

                p.addVector(a);      // subtract to get local space
            }

            p.x = p.x*Math.cos(cameraHeading) - p.z*Math.sin(cameraHeading); // rotate camera heading
            
            // tilt camera pitch
            const z = 1 / (p.z*Math.cos(playerPitch) - p.y*Math.sin(playerPitch)); // invert z for projection
            p.y = p.y*Math.cos(playerPitch) - p.z*Math.sin(playerPitch);
            p.z = z;
            
            // project road segment to canvas space
            {
                let a = p.copy();

                a.multiplyVector(new Vector3(z, z, 1));  // projection
                a.multiplyVector(projectScale);  // scale
                // center on canvas
                a.add(WIDTH/2, HEIGHT/2, 0);

                // set projected road point
                road[playerRoadSegment+i++].p = a;
            }
        }
    }
    
    // draw the road segments
    let segment2 = playerRoad.Segment(drawDistance);                     // store the last segment
    for( let i = drawDistance; i--; )                                            // iterate in reverse
    {
        const segment1 = playerRoad.Segment(i);                         
        randomSeed = SEED + playerRoad.Index(i);                // random seed for this segment
        const lighting = Math.sin(segment1.ang) * Math.cos(worldHeading)*99;   // calculate segment lighting
        const p1 = segment1.p;                                               // projected point
        const p2 = segment2.p;                                               // last projected point
        
        if (p1.z < 1e5 && p1.z > 0)                                          // check near and far clip
        {
            // draw road segment
            if (i % (Lerp(i/drawDistance,1,9)|0) == 0)                       // fade in road resolution
            {
                // ground
                DrawPoly(c.width/2, p1.y, c.width/2, c.width/2, p2.y, c.width/2,    // ground top & bottom
                    LSHA(25+lighting, 30, 95));                                     // ground color

                {
                    const color2 = `hsl(0, 0%, ${ 7 + lighting }%)`;
                    // 绘制路面
                    DrawPoly(
                            p1.x, p1.y, p1.z*segment1.w,      // road top
                            p2.x, p2.y, p2.z*segment2.w,      // road bottom
                            color2); 
                }
                    
                segment2 = segment1;                                                // prep for next segment
            }

            // random object (tree or rock)
            if (Random()<.2 && playerRoad.Index(i) > 29)                           // check for road object
            {
                // player object collision check
                const z = playerRoad.Index(i) * ROAD_SEGMENT_LENGTH;            // segment distance
                const height = (Random(2)|0) * 400;                              // object type & height
                const x = 2 * ROAD_WIDTH * Random(10,-10) * Random(9);                    // choose object pos
                if (!segment1.h                                                  // prevent hitting the same object
                    && Math.abs(playerPos.x - x) < 200                           // x collision
                    && Math.abs(playerPos.z - z) < 200                           // z collision
                    && playerPos.y- PLAYER_HEIGHT < segment1.y+200+height)         // y collision + object height
                {
                    segment1.h = playerCollisionSlow;

                    playerVelocity.multiply(segment1.h); // stop player and mark hit
                }

                // draw road object
                const alpha = Lerp(i/drawDistance, 4, 0);                        // fade in object alpha
                if (height)                                                      // tree           
                {
                    const x1 = p1.x + p1.z * x;

                    DrawPoly(x1, p1.y, p1.z*29,                   // trunk bottom
                        x1, p1.y-99*p1.z, p1.z*29,                                // trunk top
                        LSHA(5+Random(9), 50+Random(9), 29+Random(9), alpha));   // trunk color

                    DrawPoly(x1, p1.y-Random(50,99)*p1.z, p1.z*Random(199,250),   // leaves bottom
                        x1, p1.y-Random(600,800)*p1.z, 0,                         // leaves top
                        LSHA(25+Random(9), 80+Random(9), 9+Random(29), alpha));  // leaves color
                }
                else                                                                           // rock
                {
                    const x1 = p1.x + p1.z * x;
                    const x2 = x1 + p1.z * (Random(99, -99));

                    DrawPoly(x1, p1.y, p1.z*Random(200,250),                    // rock bottom
                        x2, p1.y-Random(200,250)*p1.z, p1.z*Random(99),   // rock top
                        LSHA(50+Random(19), 25+Random(19), 209+Random(9), alpha));             // rock color
                }
            }
        }
    }
    // -------------------------- 绘制段到此结束
    
    // 计算帧率
    UpdateFps();
    
    /////////////////////////////////////////////////////////////////////////////////////
    // 显示各项数据
    /////////////////////////////////////////////////////////////////////////////////////
    HUD();
    
    requestAnimationFrame(Update);
}
    
    
/////////////////////////////////////////////////////////////////////////////////////
// init hue(color) jumper
/////////////////////////////////////////////////////////////////////////////////////
   
// startup and kick off update loop
StartLevel();
Update();
    

