require('colors');

//Establish a serial connection with the Arduino

const fs = require('fs');
const SerialPort = require('serialport');
const Readline = SerialPort.parsers.Readline;

const commands = require('./Commands');
const config = JSON.parse(fs.readFileSync('./Properties.json', 'utf8'));

const portPath = config.port;
const port = new SerialPort(portPath, {baudRate: 57600});
const parser = port.pipe(new Readline({delimiter: '\n'}));

const NODE_PREFIX = '[PGController]';
const ARD_PREFIX = '[ARDUINO]'

let lastCommand = '';

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
        case 'EXEC_OK': /*console.log(`${ARD_PREFIX} Command '${lastCommand}' executed successfully`.green);*/ break;
        case 'READY': console.log(`${ARD_PREFIX} Ready to accept commands`.magenta); break;
        case 'COMM_REC': /*console.log(`${ARD_PREFIX} Command '${lastCommand}' received`.cyan);*/ break;
        case 'TIMEOUT': console.log(`${ARD_PREFIX} Command '${lastCommand}' timed out`.red); break;
        case 'UNK_COMM': console.log(`${ARD_PREFIX} Command '${lastCommand}' not recognized`.red); break;
        case 'PARSE_FAIL': console.log(`${ARD_PREFIX} Command '${lastCommand}' not parsed`.red); break;
        default: console.log(`${ARD_PREFIX} ${data}`.yellow); break;
    }
});

const sendCommand = (command, params) => {
    fullCommand = getCommand(command, params);
    lastCommand = fullCommand;
    port.write(fullCommand, (error) => {
    if(error) return console.log(`${NODE_PREFIX} Failed to send command '${fullCommand}' to Arduino, ${error}`.red);
    });
};

const getCommand = (command, params) => {
    let result = command + ',';
    for(let i = 0; i < params.length; ++i) {
        result = result + params[i] + ',';
    }
    return result + 'END;';
}

const setup = () => {
    console.log(`${NODE_PREFIX} Initiating setup`.cyan);
    const properties = Object.keys(config);
    const values = Object.values(config);

    for(let i = 0; i < properties.length; ++i) {
        switch(properties[i]) {
            case 'PenWidth': sendCommand(commands.CHANGEPENWIDTH, [values[i]]); break;
            case 'StepsPerRev': sendCommand(commands.CHANGEMACHINESTEPSPERREV, [values[i]]); break;
            case 'MotorMaxSpeed': sendCommand(commands.SETMOTORSPEED, [values[i]]); break;
            case 'HomePoint': sendCommand(commands.SETHOMEPOINT, values[i]); break;

        }
    }
}