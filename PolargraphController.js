require('colors');

//Establish a serial connection with the Arduino

const fs = require('fs');
const SerialPort = require('serialport');
const Readline = SerialPort.parsers.Readline;

const commands = require('./Commands');
const utils = require('./Utils');
const config = JSON.parse(fs.readFileSync('./Properties.json', 'utf8'));

const portPath = config.port;
const port = new SerialPort(portPath, {baudRate: 57600});
const parser = port.pipe(new Readline({delimiter: '\n'}));

const NODE_PREFIX = '[PGController]';
const ARD_PREFIX = '[ARDUINO]'

let lastCommand = '';
let queue = [];
let allExecuted = false;

let penWidth = 0.8;
let motorMaxSpeed = 600;
let motorAcceleration = 400;
let homePoint = [230, 120];
let penUpPosition = 180;
let stepsPerRev = 400;
let mmPerRev = 32;
let machineSize = [460, 705];
let penDownPosition = 90;


port.on('open', error => {
    if(error) {
        process.exit(1);
    }
    console.log(`${NODE_PREFIX} Serial connection opened`.green);
});

parser.on('data', data => {
    if(data.includes('\r')) {
        data = data.substring(0, data.length - 1);
    }
    switch(data) {
        case 'STARTUP': console.log(`${ARD_PREFIX} Connected and Polargraph started successfully`.green); setup(); break;
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

const setup = () => {
    console.log(`${NODE_PREFIX} Initiating setup`.cyan);
    const properties = Object.keys(config);
    const values = Object.values(config);

    for(let i = 0; i < properties.length; ++i) {
        switch(properties[i]) {
            case 'PenWidth': penWidth = values[i]; break;
            case 'MotorMaxSpeed': motorMaxSpeed = values[i]; break;
            case 'MotorAcceleration': motorAcceleration = values[i]; break;
            case 'HomePoint': homePoint = values[i]; break;
            case 'PenUpPosition': penUpPosition = values[i]; break;
            case 'StepsPerRev': stepsPerRev = values[i]; break;
            case 'MMPerRev': mmPerRev = values[i]; break;
            case 'MachineSize': machineSize = values[i]; break;
            case 'PenDownPosition': penDownPosition = values[i]; break;
        }
    }
    prepareQueue();
    // squareTest();
    swastikaTest();
};

const prepareQueue = () => {
    addToQueue(commands.CHANGEPENWIDTH, penWidth);
    addToQueue(commands.SETMOTORSPEED, motorMaxSpeed);
    addToQueue(commands.SETMOTORACCEL, motorAcceleration);
    addToQueue(commands.SETPENLIFTRANGE, 90, 180, 1);
    addToQueue(commands.CHANGEMACHINESTEPSPERREV, stepsPerRev);
    addToQueue(commands.CHANGEMACHINEMMPERREV, mmPerRev);
    addToQueue(commands.CHANGEMACHINESIZE, machineSize);
    addToQueue(commands.SETHOMEPOINT, utils.asNativeCoords(0, 0, false));
};

const processQueue = () => {
    if(queue.length !== 0 && allExecuted){
        allExecuted = false;
        sendCommand(queue[0]);
        removeFirstFromQueue();
    }
};

setInterval(processQueue, 1);

const squareTest = () => {
    //draws a square
    addToQueue(commands.PENDOWN, null);
    addToQueue(commands.CHANGELENGTHDIRECT, utils.asNativeCoords(50,0, true));
    addToQueue(commands.CHANGELENGTHDIRECT, utils.asNativeCoords(50,100, true));
    addToQueue(commands.CHANGELENGTHDIRECT, utils.asNativeCoords(-50,100, true));
    addToQueue(commands.CHANGELENGTHDIRECT, utils.asNativeCoords(-50,0, true));
    addToQueue(commands.CHANGELENGTHDIRECT, utils.asNativeCoords(0,0, true));
    addToQueue(commands.PENUP, null);
};

const swastikaTest = () => {
    //don't ask
    addToQueue(commands.PENDOWN, null);
    addToQueue(commands.CHANGELENGTHDIRECT, utils.asNativeCoords(0,-100, true));
    addToQueue(commands.CHANGELENGTHDIRECT, utils.asNativeCoords(100,-100, true));
    addToQueue(commands.PENUP, null);
    addToQueue(commands.CHANGELENGTH, utils.asNativeCoords(0,0, false));
    addToQueue(commands.PENDOWN, null);
    addToQueue(commands.CHANGELENGTHDIRECT, utils.asNativeCoords(100,0, true));
    addToQueue(commands.CHANGELENGTHDIRECT, utils.asNativeCoords(100,100, true));
    addToQueue(commands.PENUP, null);
    addToQueue(commands.CHANGELENGTH, utils.asNativeCoords(0,0, false));
    addToQueue(commands.PENDOWN, null);
    addToQueue(commands.CHANGELENGTHDIRECT, utils.asNativeCoords(0,100, true));
    addToQueue(commands.CHANGELENGTHDIRECT, utils.asNativeCoords(-100,100, true));
    addToQueue(commands.PENUP, null);
    addToQueue(commands.CHANGELENGTH, utils.asNativeCoords(0,0, false));
    addToQueue(commands.PENDOWN, null);
    addToQueue(commands.CHANGELENGTHDIRECT, utils.asNativeCoords(-100,0, true));
    addToQueue(commands.CHANGELENGTHDIRECT, utils.asNativeCoords(-100,-100, true));
    addToQueue(commands.PENUP, null);
    addToQueue(commands.CHANGELENGTHDIRECT, utils.asNativeCoords(0,-150, true));
};