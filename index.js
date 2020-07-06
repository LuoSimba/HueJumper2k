'use strict';
    
const c = document.getElementById('c'); // <canvas>

const WIDTH  = 700;
const HEIGHT = 600;

const CHECKPOINT_DISTANCE = 100000;  // how far between checkpoints

// draw settings
const drawDistance = 800;            // how many road segments to draw in front of player
const cameraDepth = 1;               // FOV of camera (1 / Math.tan((fieldOfView/2) * Math.PI/180))
const roadSegmentLength = 100;       // length of each road segment
const ROAD_WIDTH = 500;               // how wide is road
const warningTrackWidth = 150;       // with of road plus warning track
const dashLineWidth = 9;             // width of the dashed line in the road
const maxPlayerX = 2e3;              // player can not move this far from center of road


// player settings
const PLAYER_HEIGHT = 150;            // how high is player above ground
const playerMaxSpeed = 300;          // limit max player speed
const playerBrake = -3;              // player acceleration when breaking
const playerTurnControl = .2;        // player turning rate
const playerJumpSpeed = 25;          // z speed added for jump
const playerSpringConstant = .01;    // spring players pitch
const playerCollisionSlow = .1;      // slow down from collisions
const pitchLerp = .1;                // speed that camera pitch changes
const pitchSpringDamping = .9;       // dampen the pitch spring
const centrifugal = .002;            // how much to pull player on turns


const worldRotateScale = .00005;     // how much to rotate world around turns
    
// level settings
const checkpointMaxDifficulty = 9;   // how many checkpoints before max difficulty
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
    for( let i = 0; i < ROAD_END * 2; i ++ )           // build road past end
    {
        if (roadGenSectionDistance++ > roadGenSectionDistanceMax)     // check for end of section
        {
            // calculate difficulty percent
            const difficulty = Math.min(
                    1,
                    i*roadSegmentLength/CHECKPOINT_DISTANCE/checkpointMaxDifficulty
                    ); // difficulty
            
            // randomize road settings
            roadGenWidth = ROAD_WIDTH * Random(1-difficulty*.7, 3-2*difficulty);        // road width
            roadGenWaveFrequencyX = Random(Lerp(difficulty, .01, .02));              // X frequency
            roadGenWaveFrequencyY = Random(Lerp(difficulty, .01, .03));              // Y frequency
            roadGenWaveScaleX = i > ROAD_END ? 0 : Random(Lerp(difficulty, .2, .6));  // X scale
            roadGenWaveScaleY = Random(Lerp(difficulty, 1e3, 2e3));                  // Y scale
            
            // apply taper and move back
            roadGenTaper = Random(99, 1e3)|0;                           // randomize taper
            roadGenSectionDistanceMax = roadGenTaper + Random(99, 1e3); // randomize segment distance
            roadGenSectionDistance = 0;                                 // reset section distance
            i -= roadGenTaper;                                          // subtract taper
        }
        
        // make a wavy road
        const x = Math.sin(i*roadGenWaveFrequencyX) * roadGenWaveScaleX;      // road X
        const y = Math.sin(i*roadGenWaveFrequencyY) * roadGenWaveScaleY;      // road Y
        road[i] = road[i]? road[i] : {x:x, y:y, w:roadGenWidth};              // get or make road segment
        
        // apply taper from last section
        const p = Clamp(roadGenSectionDistance / roadGenTaper, 0, 1);         // get taper percent
        road[i].x = Lerp(p, road[i].x, x);                                    // X pos and taper
        road[i].y = Lerp(p, road[i].y, y);                                    // Y pos and taper
        road[i].w = i > ROAD_END ? 0 : Lerp(p, road[i].w, roadGenWidth);       // check for road end, width and taper
        road[i].a = road[i-1] ? Math.atan2(road[i-1].y-road[i].y, roadSegmentLength) : 0; // road pitch angle
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
    
    // get player road segment
    const playerRoadSegment        = playerPos.z/roadSegmentLength|0;         // current player road segment 
    const playerRoadSegmentPercent = playerPos.z/roadSegmentLength%1;  // how far player is along current segment
    
    // get lerped values between last and current road segment
    const playerRoadX = Lerp(playerRoadSegmentPercent, road[playerRoadSegment].x, road[playerRoadSegment+1].x);

    const playerRoadY = Lerp(playerRoadSegmentPercent, road[playerRoadSegment].y, road[playerRoadSegment+1].y) + PLAYER_HEIGHT;

    const roadPitch   = Lerp(playerRoadSegmentPercent, road[playerRoadSegment].a, road[playerRoadSegment+1].a);

    // save last velocity
    const playerVelocityLast = playerVelocity.copy();


    // 施加在 Y 轴上的重力
    playerVelocity.y --;

    // apply lateral 阻尼
    // dampen player x speed
    playerVelocity.x *= .7;

    {
        // apply 阻尼
        // dampen player z speed
        // forward damping
        let aaa = playerVelocity.z * .999;

        // 只须前进，不许倒退
        if (aaa < 0)
            aaa = 0;

        playerVelocity.z = aaa;
    }

    // add player velocity
    playerPos.addVector(playerVelocity);
    
    const playerTurnAmount = Lerp(playerVelocity.z/playerMaxSpeed, mouseX * playerTurnControl, 0); // turning

    playerVelocity.x +=                                          // update x velocity
        playerVelocity.z * playerTurnAmount -                    // apply turn
        playerVelocity.z ** 2 * centrifugal * playerRoadX;       // apply centrifugal force

    playerPos.x = Clamp(playerPos.x, -maxPlayerX, maxPlayerX);   // limit player x position
    
    // check if on ground
    if (playerPos.y < playerRoadY)
    {
        // bounce velocity against ground normal
        playerPos.y = playerRoadY;                                                                // match y to ground plane

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
            playerVelocity.z += playerBrake;    // apply brake
        } else {
            playerVelocity.z += Lerp(playerVelocity.z/playerMaxSpeed, IsGameStart* 1, 0); // apply accel
        }

        
        if (Math.abs(playerPos.x) > road[playerRoadSegment].w)                      // check if off road
        {
            // 离开道路时，车速降低
            // 离开道路时，阻尼（damping）增大
            playerVelocity.z *= .98;

            // 离开道路时，颠簸行进
            playerPitchSpring += Math.sin(playerPos.z/99) ** 4 / 99;
        }
    }
  
    // update jump
    // check for jump
    if (playerAirFrame++ < 6)
    {
        if (gBreakOn) {
            if (mouseUpFrames && mouseUpFrames < 9) {
                playerVelocity.y += playerJumpSpeed;       // apply jump velocity
                playerAirFrame = 9;                        // prevent jumping again
            }
        }
    }

    // update mouse up frames for double click
    if (gBreakOn) {
        mouseUpFrames = 0;
    } else {
        mouseUpFrames ++;
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
    
    // multi use local variables
    let x, y, w, i;

    randomSeed = SEED;                   // set start seed

    // update world angle
    worldHeading = ClampAngle(
            worldHeading + playerVelocity.z * playerRoadX * worldRotateScale);
    
    // pre calculate projection scale, flip y because y+ is down on canvas
    // get projection scale
    const projectScale = new Vector3(1, -1, 1);
    projectScale.multiply(WIDTH/2/cameraDepth);

    // scale of player turning to rotate camera(camera heading scale) = 2
    const cameraHeading = playerTurnAmount * 2;     // turn camera with player 
    const cameraOffset = Math.sin(cameraHeading) / 2;        // apply heading with offset
    
    // 绘制天空
    const lighting = Math.cos(worldHeading);                                    // brightness from sun

    // get horizon line
    // 基本上在画面高度的一半
    const horizon = HEIGHT / 2 - Math.tan(playerPitch) * projectScale.y;

    // 使用线性渐变作为天空的颜色
    const g = CTX.createLinearGradient(0,horizon-c.height/2,0,horizon);
    g.addColorStop( 0, LSHA(39+lighting*25,49+lighting*19,230-lighting*19));      // top sky color
    g.addColorStop( 1, LSHA(5,79,250-lighting*9));                                // bottom sky color

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
        x = WIDTH * ( .5 + Lerp (      // angle 0 is center
                    (worldHeading / Math.PI / 2 + .5 + 0 / 2) % 1,  // sun angle percent
                    4, -4) - cameraOffset); // sun x pos, move far away for wrap

        y = horizon - WIDTH / 5;     // sun y pos

        const g = CTX.createRadialGradient(
            x, y, WIDTH / 25,
            x, y, WIDTH);

        g.addColorStop(0, "#fcfcfc");
        g.addColorStop(1, "transparent");

        DrawRect(0, 0, WIDTH, HEIGHT, g);
    }


    // draw every mountain (there are 30 mountains)
    for( i = 30; i--; )  
    {
        const angle = ClampAngle(worldHeading+Random(19));           // mountain random angle
        const lighting = Math.cos(angle-worldHeading);               // mountain lighting

        // mountain x pos, move far away for wrap
        x = c.width * (.5+Lerp(angle/Math.PI/2+.5, 4, -4)-cameraOffset);
        // mountain base
        y = horizon;
        // mountain width 
        w = Random(.2,.8)**2*c.width/2;

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
    for( x = w = i = 0; i < drawDistance+1; )
    {
        // create road world position
        let p = new Vector3(                                                     // set road position
            x += w += road[playerRoadSegment+i].x,                               // sum local road offsets
            road[playerRoadSegment+i].y, (playerRoadSegment+i)*roadSegmentLength);// road y and z pos

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
    
    // draw the road segments
    let segment2 = road[playerRoadSegment+drawDistance];                     // store the last segment
    for( i = drawDistance; i--; )                                            // iterate in reverse
    {
        const segment1 = road[playerRoadSegment+i];                         
        randomSeed = SEED + playerRoadSegment + i;                // random seed for this segment
        const lighting = Math.sin(segment1.a) * Math.cos(worldHeading)*99;   // calculate segment lighting
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

                // warning track
                if (segment1.w > 400)                                               // no warning track if thin
                    DrawPoly(p1.x, p1.y, p1.z*(segment1.w+warningTrackWidth),       // warning track top
                        p2.x, p2.y, p2.z*(segment2.w+warningTrackWidth),            // warning track bottom
                        LSHA(((playerRoadSegment+i)%19<9? 50: 20)+lighting));       // warning track stripe color
                
                // road
                const z = (playerRoadSegment+i)*roadSegmentLength;                  // segment distance
                // TODO delete z

                {
                    const color2 = `hsl(0, 0%, ${ 7 + lighting }%)`;

                    DrawPoly(
                            p1.x, p1.y, p1.z*segment1.w,      // road top
                            p2.x, p2.y, p2.z*segment2.w,      // road bottom
                            color2); 
                }
                    
                // dashed lines
                if ( (playerRoadSegment+i) % 9 == 0 )
                {
                    if (i < drawDistance/3) // make dashes and skip if far out
                    {
                        const color = LSHA(70 + lighting);

                        DrawPoly(
                                p1.x, p1.y, p1.z*dashLineWidth,        // dash lines top
                                p2.x, p2.y, p2.z*dashLineWidth,        // dash lines bottom
                                color);                                // dash lines color
                    }
                }

                segment2 = segment1;                                                // prep for next segment
            }

            // random object (tree or rock)
            if (Random()<.2 && playerRoadSegment+i>29)                           // check for road object
            {
                // player object collision check
                const z = (playerRoadSegment+i)*roadSegmentLength;               // segment distance
                const height = (Random(2)|0) * 400;                              // object type & height
                x = 2 * ROAD_WIDTH * Random(10,-10) * Random(9);                    // choose object pos
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
                    DrawPoly(x = p1.x+p1.z * x, p1.y, p1.z*29,                   // trunk bottom
                        x, p1.y-99*p1.z, p1.z*29,                                // trunk top
                        LSHA(5+Random(9), 50+Random(9), 29+Random(9), alpha));   // trunk color
                    DrawPoly(x, p1.y-Random(50,99)*p1.z, p1.z*Random(199,250),   // leaves bottom
                        x, p1.y-Random(600,800)*p1.z, 0,                         // leaves top
                        LSHA(25+Random(9), 80+Random(9), 9+Random(29), alpha));  // leaves color
                }
                else                                                                           // rock
                {
                    DrawPoly(x = p1.x+p1.z * x, p1.y, p1.z*Random(200,250),                    // rock bottom
                        x+p1.z*(Random(99,-99)), p1.y-Random(200,250)*p1.z, p1.z*Random(99),   // rock top
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
    

