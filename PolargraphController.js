require('colors');

const fs = require('fs');
const EventEmitter = require('events');
const SerialPort = require('serialport');
const Readline = SerialPort.parsers.Readline;

const commands = require('./Commands');
const utils = require('./Utils');
const config = JSON.parse(fs.readFileSync('./Properties.json', 'utf8'));

//Start serial connection
const portPath = config.port;
const port = new SerialPort(portPath, {baudRate: 57600});
const parser = port.pipe(new Readline({delimiter: '\n'}));

//Prefixes for logging
const NODE_PREFIX = '[PGController]';
const ARD_PREFIX = '[ARDUINO]'

//EventEmitter to allow communication
const communicator = new EventEmitter();

//Last executed command
let lastCommand = '';

//Command queue
let queue = [];

//Has every command in the queue executed?
let allExecuted = false;

//Is the pen currently up?
let penIsUp = false; //Welp that's an awkward variable name

//Is the machine turned on?
let machineOn = false;

//Machine properties
let penWidth = config.PenWidth || 0.8;
let motorMaxSpeed = config.MotorMaxSpeed || 600;
let motorAcceleration = config.MotorAcceleration || 400;
let homePoint = config.HomePoint || [230, 120];
let penUpPosition = config.PenUpPosition || 180;
let stepsPerRev = config.StepsPerRev || 400;
let mmPerRev = config.MMPerRev || 32;
let machineSize = config.MachineSize || [460, 705];
let penDownPosition = config.PenDownPosition || 90;

//Establish a serial connection with the Arduino
port.on('open', error => {
    if(error) {
        process.exit(1);
    }
    console.log(`${NODE_PREFIX} Serial connection opened`.green);
});

//Runs when we've received data from the Arduino
parser.on('data', data => {
    //Remove '\r' from the data
    if(data.includes('\r')) {
        data = data.substring(0, data.length - 1);
    }

    switch(data) {
        case 'STARTUP': 
        console.log(`${ARD_PREFIX} Connected and Polargraph started successfully`.green); 
        setup(); 
        break;
        case 'EXEC_OK': 
        // console.log(`${ARD_PREFIX} Command '${lastCommand}' executed successfully`.green);
        allExecuted = true;
        break;
        case 'EXEC_ABORT':
        /*console.log(`${ARD_PREFIX} Command '${lastCommand}' failed to execute`.red);*/ 
        allExecuted = true;
        break;
        case 'READY': 
        console.log(`${ARD_PREFIX} Ready to accept commands`.magenta); 
        allExecuted = true;
        break;
        case 'COMM_REC': /*console.log(`${ARD_PREFIX} Command '${lastCommand}' received`.cyan);*/ break;
        case 'TIMEOUT': console.log(`${ARD_PREFIX} Command '${lastCommand}' timed out`.red); break;
        case 'UNK_COMM': console.log(`${ARD_PREFIX} Command '${lastCommand}' not recognized`.red); break;
        case 'PARSE_FAIL': console.log(`${ARD_PREFIX} Command '${lastCommand}' not parsed`.red); break;
        default: console.log(`${ARD_PREFIX} ${data}`.yellow); break;
    }
});

const addToQueue = (command, params) => {
    queue.push(getCommand(command, params));
};

const removeFirstFromQueue = () => {
    queue.splice(0, 1);
};

const sendCommand = (command) => {
    lastCommand = command;
    port.write(command, (error) => {
    if(error) return console.log(`${NODE_PREFIX} Failed to send command '${command}' to Arduino, ${error}`.red);
    });
};

//Convert the command to be able to send it to the Arduino
const getCommand = (command, params) => {
    let result = command + ',';
    if(!params) return result + 'END;';
    if(Array.isArray(params)) {
        for(let i = 0; i < params.length; ++i) {
            result = result + params[i] + ',';
        }
    }else{
        result = result + params + ',';
    }
    return result + 'END;';
};

//Initial setup
const setup = () => {
    console.log(`${NODE_PREFIX} Initiating setup`.cyan);
    penIsUp = true;
    communicator.emit('penStatusChange', penIsUp);
    machineOn = true;
    //Add a set of commands to the queue to prepare the machine
    addToQueue(commands.CHANGEPENWIDTH, penWidth);
    addToQueue(commands.SETMOTORSPEED, motorMaxSpeed);
    addToQueue(commands.SETMOTORACCEL, motorAcceleration);
    addToQueue(commands.SETPENLIFTRANGE, penUpPosition, penDownPosition, 1);
    addToQueue(commands.CHANGEMACHINESTEPSPERREV, stepsPerRev);
    addToQueue(commands.CHANGEMACHINEMMPERREV, mmPerRev);
    addToQueue(commands.CHANGEMACHINESIZE, machineSize);
    addToQueue(commands.SETHOMEPOINT, utils.asNativeCoords(0, 0, false));
    communicator.emit('start');
};

//If there are any commands in the queue and the last command has finished executing, execute the next command in the queue
const processQueue = () => {
    if(queue.length !== 0 && allExecuted){
        allExecuted = false;
        sendCommand(queue[0]);
        removeFirstFromQueue();
    }
};

const returnHome = killQueue => {
    if(killQueue) queue = [];
    penUp();
    moveFast(0, 0);
};

const penUp = () => {
    addToQueue(commands.PENUP, null);
    penIsUp = true;
    communicator.emit('penStatusChange', penIsUp);
};

const penDown = () => {
    addToQueue(commands.PENDOWN, null);
    penIsUp = false;
    communicator.emit('penStatusChange', penIsUp);
};

const moveDirect = (x, y) => {
    addToQueue(commands.CHANGELENGTHDIRECT, utils.asNativeCoords(x, y, true));
};

const moveFast = (x, y) => {
    addToQueue(commands.CHANGELENGTH, utils.asNativeCoords(x, y));
};
//Loop to keep processing the command queue
setInterval(processQueue, 1);

const squareTest = () => {
    //Draws a square
    console.log(`${NODE_PREFIX} Attempting to draw a square`.blue);
    penDown();
    moveDirect(50,0);
    moveDirect(50,100);
    moveDirect(-50,100);
    moveDirect(-50,0);
    moveDirect(0,0);
    penUp();
};

const squareAccuracyTest = () => {
    //Draws 2 squares over each other
    console.log(`${NODE_PREFIX} Attempting to draw 2 squares over each other`.blue);
    penDown();
    moveDirect(50,0);
    moveDirect(50,100);
    moveDirect(-50,100);
    moveDirect(-50,0);
    moveDirect(0,0);
    moveDirect(100, 250);
    moveDirect(0,0);
    moveDirect(50,0);
    moveDirect(50,100);
    moveDirect(-50,100);
    moveDirect(-50,0);
    moveDirect(0,0);
    penUp();
};

const servoTest = () => {
    //Draws 2 squares over each other, lifting the pen up in between
    console.log(`${NODE_PREFIX} Attempting to draw 2 squares over each other with pen lift`.blue);
    penDown();
    moveDirect(50,0);
    moveDirect(50,100);
    moveDirect(-50,100);
    moveDirect(-50,0);
    moveDirect(0,0);
    penUp();
    moveDirect(100, 250);
    penDown();
    penUp();
    moveDirect(0,0);
    penDown();
    moveDirect(50,0);
    moveDirect(50,100);
    moveDirect(-50,100);
    moveDirect(-50,0);
    moveDirect(0,0);
    penUp();
}

const repeatedServoTest = () => {
    for(let i = 0; i < 30; ++i) {
        penUp();
        penDown();
    }
};
module.exports = {moveDirect, returnHome, penIsUp, penUp, penDown, machineOn, squareTest, squareAccuracyTest, servoTest, repeatedServoTest, communicator};