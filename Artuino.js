const fs = require('fs');
const cv = require('opencv4nodejs');
require('colors');

const controller = require('./PolargraphController');
const tracker = require('./PointTracker');
const utils = require('./Utils');

//Allow for key input
const args = process.argv.splice(2);
const readline = require('readline');
readline.emitKeypressEvents(process.stdin);
process.stdin.setRawMode(true);

for(let i = 0; i < args.length; ++i) {
    switch(args[i]) {
        case 'mask': tracker.setMaskOn(); break;
        case 'vflip': tracker.setVerticalFlipOn(); break;
    }
}


let lastPointEmpty = true;
let drawing = false;
let machineOn = false;
let penIsUp = false;
let isInputting = false;
let trackerPaused = true;

tracker.communicator.on('point', point => {
    drawPoint(point);
});

const drawPoint = point => {
    if(!drawing) {
        drawing = true;
        console.log('[Artuino] Drawing!'.green);
    }
    let adjusted = utils.adjustToMachine(point.x, point.y);
    controller.moveDirect(adjusted[0], adjusted[1]);
    if(lastPointEmpty) {
        controller.penDown();
        lastPointEmpty = false;
    }
};

tracker.communicator.on('empty', () => {
    processEmptyPoint();
});

const processEmptyPoint = () => {
    lastPointEmpty = true;
    if(machineOn && !penIsUp) {
        controller.penUp();
    }
};

controller.communicator.on('start', () => {
    machineOn = true;
    // controller.repeatedServoTest();
});

controller.communicator.on('penStatusChange', isUp => {
    penIsUp = isUp;
});

tracker.communicator.on('pauseChange', isPaused => {
    trackerPaused = isPaused;
});

process.stdin.on('keypress', (string, key) => {
    if(!isInputting) {
        if (key.ctrl && key.name === 'c') {
            process.exit();
        }else{
            switch(key.name) {
                case 'd': tracker.startTracker(); break;
                case 's': tracker.stopTracker(); break;
                case 'h': 
                if(!trackerPaused) {
                    tracker.stopTracker();
                }
                tracker.clearPoints();
                lastPointEmpty = true;
                controller.returnHome(true);
                drawing = false;
                console.log('[Artuino] Stopped drawing'.red);
                break;
                case 'o':
                if(!trackerPaused) {
                    tracker.stopTracker();
                }
                let points = tracker.hitPoints;
                let toWrite = JSON.stringify(points);
                fs.writeFileSync('Saved/drawing.json', toWrite);
                console.log('[Artuino] Saved the drawing'.magenta);
                break;
                case 'l':
                if(!trackerPaused) {
                    tracker.stopTracker();
                }
                tracker.clearPoints();
                controller.returnHome(true);
                const loaded = JSON.parse(fs.readFileSync('Saved/drawing.json', 'utf8'));
                if(!loaded) {
                    console.log(`[Artuino] Couldn't load the file, make sure the name is correct and the file exists`.red);
                }else{
                    console.log('[Artuino] Loaded saved drawing'.green);
                    let pointList = [];
                    for(let i = 0; i < loaded.length; ++i) {
                        if(loaded[i].x === -1) {
                            processEmptyPoint();
                            pointList.push(new cv.Point2(-1,-1));
                        }else{
                            let point = new cv.Point2(loaded[i].x, loaded[i].y);
                            drawPoint(point);
                            pointList.push(point);
                        }
                        
                    }
                    tracker.setHitPoints(pointList);
                }
                break;
            }
        }
    }
});
