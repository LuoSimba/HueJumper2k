'use strict';
    
const c = document.getElementById('c'); // <canvas>

// draw settings
const context = c.getContext('2d');  // canvas 2d context
const drawDistance = 800;            // how many road segments to draw in front of player
const cameraDepth = 1;               // FOV of camera (1 / Math.tan((fieldOfView/2) * Math.PI/180))
const roadSegmentLength = 100;       // length of each road segment
const roadWidth = 500;               // how wide is road
const warningTrackWidth = 150;       // with of road plus warning track
const dashLineWidth = 9;             // width of the dashed line in the road
const maxPlayerX = 2e3;              // player can not move this far from center of road
const mountainCount = 30;            // how many mountains are there
const timeDelta = 1/60;              // inverse frame rate

// player settings
const playerHeight = 150;            // how high is player above ground
const playerMaxSpeed = 300;          // limit max player speed
const playerAccel = 1;               // player acceleration
const playerBrake = -3;              // player acceleration when breaking
const playerTurnControl = .2;        // player turning rate
const playerJumpSpeed = 25;          // z speed added for jump
const playerSpringConstant = .01;    // spring players pitch
const playerCollisionSlow = .1;      // slow down from collisions
const pitchLerp = .1;                // speed that camera pitch changes
const pitchSpringDamping = .9;       // dampen the pitch spring
const elasticity = 1.2;              // bounce elasticity (2 is full bounce, 1 is none)
const centrifugal = .002;            // how much to pull player on turns
const forwardDamping = .999;         // dampen player z speed
const lateralDamping = .7;           // dampen player x speed
const offRoadDamping = .98;          // more damping when off road
const gravity = -1;                  // gravity to apply in y axis
const cameraHeadingScale = 2;        // scale of player turning to rotate camera
const worldRotateScale = .00005;     // how much to rotate world around turns
    
// level settings
const MAX_TIME = 20;                  // time to start with
const CHECKPOINT_DISTANCE = 1e5;      // how far between checkpoints
const checkpointMaxDifficulty = 9;   // how many checkpoints before max difficulty
const roadEnd = 1e4;                 // how many sections until end of the road
    
// global game variables  
let playerPos;                  // player position 3d vector
let playerVelocity;             // player velocity 3d vector
let playerPitchSpring;          // spring for player pitch bounce
let playerPitchSpringVelocity;  // velocity of pitch spring
let playerPitchRoad;            // pitch of road, or 0 if player is in air
let playerAirFrame;             // how many frames player has been in air
let worldHeading;               // heading to turn skybox
let randomSeed;                 // random seed for level
let startRandomSeed;            // save the starting seed for active use
let nextCheckPoint;             // distance of next checkpoint
let road;                       // the list of road segments
let gTime;                       // time left before game over
let lastUpdate = 0;             // time of last update
let timeBuffer = 0;             // frame rate adjustment


function StartLevel()
{ 
    /////////////////////////////////////////////////////////////////////////////////////
    // build the road with procedural generation
    /////////////////////////////////////////////////////////////////////////////////////

    let roadGenSectionDistanceMax = 0;          // init end of section distance
    let roadGenWidth = roadWidth;               // starting road width
    let roadGenSectionDistance = 0;             // distance left for this section
    let roadGenTaper = 0;                       // length of taper
    let roadGenWaveFrequencyX = 0;              // X wave frequency 
    let roadGenWaveFrequencyY = 0;              // Y wave frequency
    let roadGenWaveScaleX = 0;                  // X wave amplitude (turn size)
    let roadGenWaveScaleY = 0;                  // Y wave amplitude (hill size)


    // 初始化随机种子
    startRandomSeed = randomSeed = Date.now();
    console.log('random seed', randomSeed);

    road = [];                                  // clear list of road segments
    
    // generate the road
    for( let i = 0; i < roadEnd*2; ++i )                                      // build road past end
    {
        if (roadGenSectionDistance++ > roadGenSectionDistanceMax)             // check for end of section
        {
            // calculate difficulty percent
            const difficulty = Math.min(1, i*roadSegmentLength/CHECKPOINT_DISTANCE/checkpointMaxDifficulty); // difficulty
            
            // randomize road settings
            roadGenWidth = roadWidth*Random(1-difficulty*.7, 3-2*difficulty);        // road width
            roadGenWaveFrequencyX = Random(Lerp(difficulty, .01, .02));              // X frequency
            roadGenWaveFrequencyY = Random(Lerp(difficulty, .01, .03));              // Y frequency
            roadGenWaveScaleX = i > roadEnd ? 0 : Random(Lerp(difficulty, .2, .6));  // X scale
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
        road[i].w = i > roadEnd ? 0 : Lerp(p, road[i].w, roadGenWidth);       // check for road end, width and taper
        road[i].a = road[i-1] ? Math.atan2(road[i-1].y-road[i].y, roadSegmentLength) : 0; // road pitch angle
    }  
    
    /////////////////////////////////////////////////////////////////////////////////////
    // init game
    /////////////////////////////////////////////////////////////////////////////////////
     
    // 重置一切
    playerPitchSpring         = 0;
    playerPitchSpringVelocity = 0;
    playerPitchRoad           = 0;
    gHueShift                 = 0;

    playerVelocity = new Vector3(0, 0, 0);

    playerPos = new Vector3(0, playerHeight, 0);   // set player pos
    worldHeading = randomSeed;                  // randomize world heading
    // 初始化下一个检查点
    nextCheckPoint = CHECKPOINT_DISTANCE;
    // 初始化时间
    gTime = MAX_TIME;
}
    
/**
 * 最长的函数
 *
 * 是一个动画循环
 */
function Update()
{
    // time regulation, in case running faster then 60 fps, though it causes judder REMOVE FROM MINFIED
    const now = performance.now();
    if (lastUpdate)
    {
        // limit to 60 fps
        const delta = now - lastUpdate;
        if (timeBuffer + delta < 0)
        {
            // running fast
            requestAnimationFrame(Update);
            return;
        }
        
        // update time buffer
        timeBuffer += delta;
        timeBuffer -= timeDelta * 1e3;
        if (timeBuffer > timeDelta * 1e3)
            timeBuffer = 0; // if running too slow
    }
    lastUpdate = now;
    
    // start frame
    if (false) { // screen-shot
        c.width | 0;   // ???
    } else {                                 // DEBUG REMOVE FROM MINFIED
        // clear the screen and set size
        c.width = window.innerWidth;
        c.height = window.innerHeight;
    }
    
    if (!c.width) // REMOVE FROM MINFIED
    {
        // fix bug on itch, wait for canvas before updating
        requestAnimationFrame(Update);
        return;
    }

    // set mouse down if pointer lock released
    if (document.pointerLockElement !== c && !touchMode) // NOTE: use pointer lock
        mouseDown = 1; 
    
    UpdateDebugPre(); // DEBUG REMOVE FROM MINFIED
    
    /////////////////////////////////////////////////////////////////////////////////////
    // update player - controls and physics
    /////////////////////////////////////////////////////////////////////////////////////
    
    // get player road segment
    const playerRoadSegment = playerPos.z/roadSegmentLength|0;         // current player road segment 
    const playerRoadSegmentPercent = playerPos.z/roadSegmentLength%1;  // how far player is along current segment
    
    // get lerped values between last and current road segment
    const playerRoadX = Lerp(playerRoadSegmentPercent, road[playerRoadSegment].x, road[playerRoadSegment+1].x);
    const playerRoadY = Lerp(playerRoadSegmentPercent, road[playerRoadSegment].y, road[playerRoadSegment+1].y) + playerHeight;
    const roadPitch = Lerp(playerRoadSegmentPercent, road[playerRoadSegment].a, road[playerRoadSegment+1].a);
    
    const playerVelocityLast = playerVelocity.Add(0);                      // save last velocity
    playerVelocity.y += gravity;                                           // gravity
    playerVelocity.x *= lateralDamping;                                    // apply lateral damping
    playerVelocity.z = Math.max(0, gTime ? forwardDamping*playerVelocity.z : 0); // apply damping, prevent moving backwards
    playerPos = playerPos.Add(playerVelocity);                             // add player velocity
    
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
        playerAirFrame = 0;                                                                       // reset air grace frames
        playerVelocity = new Vector3(0, Math.cos(roadPitch), Math.sin(roadPitch))                 // get ground normal
            .Multiply(-elasticity *                                                               // apply bounce
               (Math.cos(roadPitch) * playerVelocity.y + Math.sin(roadPitch) * playerVelocity.z)) // dot of road and velocity
            .Add(playerVelocity);                                                                 // add velocity

        playerVelocity.z += 
            mouseDown? playerBrake :                                                // apply brake              
            Lerp(playerVelocity.z/playerMaxSpeed, IsGameStart*playerAccel, 0);  // apply accel
        
        if (Math.abs(playerPos.x) > road[playerRoadSegment].w)                      // check if off road
        {
            playerVelocity.z *= offRoadDamping;                                     // slow down when off road
            playerPitchSpring += Math.sin(playerPos.z/99)**4/99;                    // bump when off road
        }
    }
  
    // update jump
    if (playerAirFrame++<6 && mouseDown && mouseUpFrames && mouseUpFrames<9 && gTime)  // check for jump
    {
        playerVelocity.y += playerJumpSpeed;                                          // apply jump velocity
        playerAirFrame = 9;                                                           // prevent jumping again
    }
    mouseUpFrames = mouseDown? 0 : mouseUpFrames+1;                                   // update mouse up frames for double click
    const airPercent = (playerPos.y-playerRoadY)/99;                                  // calculate above ground percent
    playerPitchSpringVelocity += Lerp(airPercent,0,playerVelocity.y/4e4);             // pitch down with vertical velocity
    
    // update player pitch
    playerPitchSpringVelocity += (playerVelocity.z - playerVelocityLast.z)/2e3;       // pitch down with forward accel
    playerPitchSpringVelocity -= playerPitchSpring * playerSpringConstant;            // apply pitch spring constant
    playerPitchSpringVelocity *= pitchSpringDamping;                                  // dampen pitch spring
    playerPitchSpring += playerPitchSpringVelocity;                                   // update pitch spring        
    playerPitchRoad = Lerp(pitchLerp, playerPitchRoad, Lerp(airPercent,-roadPitch,0));// match pitch to road
    const playerPitch = playerPitchSpring + playerPitchRoad;                          // update player pitch
    
    if (playerPos.z > nextCheckPoint)          // crossed checkpoint
    {
        // 通过检查点，奖励时间
        gTime += 10;
        // 设置下一个检查点
        nextCheckPoint += CHECKPOINT_DISTANCE;
        // 色彩偏移
        gHueShift += 36;
    }
    
    /////////////////////////////////////////////////////////////////////////////////////
    // 绘制背景 - 天空，太阳/月亮, 群山, 和地平线
    /////////////////////////////////////////////////////////////////////////////////////
    
    // multi use local variables
    let x, y, w, i;

    randomSeed = startRandomSeed;                                                                 // set start seed
    worldHeading = ClampAngle(worldHeading + playerVelocity.z * playerRoadX * worldRotateScale);  // update world angle
    
    // pre calculate projection scale, flip y because y+ is down on canvas
    const projectScale = (new Vector3(1, -1, 1)).Multiply(c.width/2/cameraDepth);                 // get projection scale
    const cameraHeading = playerTurnAmount * cameraHeadingScale;                                  // turn camera with player 
    const cameraOffset = Math.sin(cameraHeading)/2;                                               // apply heading with offset
    
    // 绘制天空
    const lighting = Math.cos(worldHeading);                                    // brightness from sun
    const horizon = c.height/2 - Math.tan(playerPitch) * projectScale.y;        // get horizon line

    // 使用线性渐变作为天空的颜色
    const g = context.createLinearGradient(0,horizon-c.height/2,0,horizon);
    g.addColorStop( 0, LSHA(39+lighting*25,49+lighting*19,230-lighting*19));      // top sky color
    g.addColorStop( 1, LSHA(5,79,250-lighting*9));                                // bottom sky color
    // draw sky
    DrawPoly(
            c.width/2, 0, c.width/2,
            c.width/2, c.height, c.width/2,
            g);
    
    // draw sun and moon
    for( i = 2; i--; )                                                          // 0 is sun, 1 is moon
    {
        const g = context.createRadialGradient(                                 // radial gradient for sun
            x = c.width*(.5+Lerp(                                               // angle 0 is center
                (worldHeading/Math.PI/2+.5+i/2)%1,                              // sun angle percent 
                4, -4)-cameraOffset),                                           // sun x pos, move far away for wrap
            y = horizon - c.width/5,                                            // sun y pos
            c.width/25,                                                         // sun size
            x, y, i?c.width/23:c.width);                                        // sun end pos & size
        g.addColorStop(0, LSHA(i?70:99));                                       // sun start color
        g.addColorStop(1, LSHA(0,0,0,0));                                       // sun end color
        DrawPoly(c.width/2, 0, c.width/2, c.width/2, c.height, c.width/2, g);   // draw sun
    }

    // draw mountains
    for( i = mountainCount; i--; )                                              // draw every mountain
    {
        const angle = ClampAngle(worldHeading+Random(19));                      // mountain random angle
        const lighting = Math.cos(angle-worldHeading);                          // mountain lighting
        DrawPoly(
            x = c.width*(.5+Lerp(angle/Math.PI/2+.5, 4, -4)-cameraOffset),      // mountain x pos, move far away for wrap
            y = horizon,                                                        // mountain base
            w = Random(.2,.8)**2*c.width/2,                                     // mountain width
            x+w*Random(-.5,.5),                                                 // random tip skew
            y - Random(.5,.8)*w, 0,                                             // mountain height
            LSHA(Random(15,25)+i/3-lighting*9,i/2+Random(19),Random(220,230))); // mountain color
    }
    
    // draw horizon
    DrawPoly(c.width/2, horizon, c.width/2, c.width/2, c.height, c.width/2,     // horizon pos & size
        LSHA(25, 30, 95));                                                      // horizon color
    
    /////////////////////////////////////////////////////////////////////////////////////
    // draw road and objects
    /////////////////////////////////////////////////////////////////////////////////////
    
    // calculate road x offsets and projections
    for( x = w = i = 0; i < drawDistance+1; )
    {
        // create road world position
        let p = new Vector3(                                                     // set road position
            x += w += road[playerRoadSegment+i].x,                               // sum local road offsets
            road[playerRoadSegment+i].y, (playerRoadSegment+i)*roadSegmentLength)// road y and z pos
                .Add(playerPos.Multiply(-1));                                    // subtract to get local space

        p.x = p.x*Math.cos(cameraHeading) - p.z*Math.sin(cameraHeading); // rotate camera heading
        
        // tilt camera pitch
        const z = 1 / (p.z*Math.cos(playerPitch) - p.y*Math.sin(playerPitch)); // invert z for projection
        p.y = p.y*Math.cos(playerPitch) - p.z*Math.sin(playerPitch);
        p.z = z;
        
        // project road segment to canvas space
        road[playerRoadSegment+i++].p =                 // set projected road point
            p.Multiply(new Vector3(z, z, 1))            // projection
            .Multiply(projectScale)                     // scale
            .Add(new Vector3(c.width/2,c.height/2, 0))  // center on canvas
    }
    
    // draw the road segments
    let segment2 = road[playerRoadSegment+drawDistance];                     // store the last segment
    for( i = drawDistance; i--; )                                            // iterate in reverse
    {
        const segment1 = road[playerRoadSegment+i];                         
        randomSeed = startRandomSeed + playerRoadSegment + i;                // random seed for this segment
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
                DrawPoly(p1.x, p1.y, p1.z*segment1.w,                               // road top
                    p2.x, p2.y, p2.z*segment2.w,                                    // road bottom
                    LSHA((z%CHECKPOINT_DISTANCE < 300 ? 70 : 7)+lighting)); // road color and checkpoint
                    
                // dashed lines
                if (segment1.w > 300)                                               // no dash lines if very thin
                    (playerRoadSegment+i)%9==0 && i < drawDistance/3 &&             // make dashes and skip if far out
                        DrawPoly(p1.x, p1.y, p1.z*dashLineWidth,                    // dash lines top
                        p2.x, p2.y, p2.z*dashLineWidth,                             // dash lines bottom
                        LSHA(70+lighting));                                         // dash lines color

                segment2 = segment1;                                                // prep for next segment
            }

            // random object (tree or rock)
            if (Random()<.2 && playerRoadSegment+i>29)                           // check for road object
            {
                // player object collision check
                const z = (playerRoadSegment+i)*roadSegmentLength;               // segment distance
                const height = (Random(2)|0) * 400;                              // object type & height
                x = 2*roadWidth * Random(10,-10) * Random(9);                    // choose object pos
                if (!segment1.h                                                  // prevent hitting the same object
                    && Math.abs(playerPos.x - x) < 200                           // x collision
                    && Math.abs(playerPos.z - z) < 200                           // z collision
                    && playerPos.y-playerHeight < segment1.y+200+height)         // y collision + object height
                {
                    playerVelocity = playerVelocity.Multiply(segment1.h = playerCollisionSlow); // stop player and mark hit
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
    
    // UPDATE DEBUG POST
    {
        UpdateInput();
        
        // 计算帧率
        UpdateFps();

        if (false) // DEBUG
        {
            context.font='2em"';
            for (let i in debugPrintLines)
            {
                let line = debugPrintLines[i];
                context.fillStyle = line.color;
                context.fillText(line.text,c.width/2,35+35*i);
            }
        }
    }
    
    /////////////////////////////////////////////////////////////////////////////////////
    // update time
    /////////////////////////////////////////////////////////////////////////////////////
    if (IsGameStart) {
        // 更新时间。控制时间的流逝
        gTime = Clamp(gTime - timeDelta, 0, MAX_TIME);
    }

    /////////////////////////////////////////////////////////////////////////////////////
    // 显示各项数据
    /////////////////////////////////////////////////////////////////////////////////////
    HUD(context);
    
    
    // 开始下一帧
    requestAnimationFrame(Update);
}
    
/////////////////////////////////////////////////////////////////////////////////////
// DEBUG stuff
/////////////////////////////////////////////////////////////////////////////////////

let debugPrintLines;
    
function UpdateDebugPre()
{
    debugPrintLines = [];
    
    if (inputWasPushed[82]) // R = restart
    {
        mouseLockX = 0;
        StartLevel(); 
    }
    
    if (inputWasPushed[49]) // 1 = screenshot
    {
        // use 1080p resolution
        c.width = 1920;
        c.height = 1080;

        console.log('snapshot.png');
    }
}
    
    
/**
 * DEBUG
 */
function DebugPrint(text, color='#F00')
{
    if (typeof text == 'object')
        text += JSON.stringify(text);
    
    let line = {text:text, color:color};
    debugPrintLines.push(line);
}
    
/////////////////////////////////////////////////////////////////////////////////////
// init hue(color) jumper
/////////////////////////////////////////////////////////////////////////////////////
   
// startup and kick off update loop
StartLevel();
Update();
    
