const controller = require('./PolargraphController');
const tracker = require('./PointTracker');
const utils = require('./Utils');

//Allow for key input
const readline = require('readline');
readline.emitKeypressEvents(process.stdin);
process.stdin.setRawMode(true);

let lastPointEmpty = true;
let drawing = false;
let machineOn = false;
let penIsUp = false;

tracker.communicator.on('point', point => {
    if(!drawing) drawing = true;
    let adjusted = utils.adjustToMachine(point.x, point.y);
    controller.moveDirect(adjusted[0], adjusted[1]);
    if(lastPointEmpty) {
        controller.penDown();
        lastPointEmpty = false;
    }
});

tracker.communicator.on('empty', () => {
    if(drawing) drawing = false;
    lastPointEmpty = true;
    if(machineOn && !penIsUp) {
        controller.penUp();
    }
});

controller.communicator.on('start', () => {
    machineOn = true;
});

controller.communicator.on('penStatusChange', isUp => {
    penIsUp = isUp;
});

tracker.communicator.on('pauseChange', isPaused => {
    trackerPaused = isPaused;
});

process.stdin.on('keypress', (string, key) => {
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
            controller.returnHome(true); 
            break;
        }
    }
});
