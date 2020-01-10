require('colors');

//Establish a serial connection with the Arduino

const SerialPort = require('serialport');
const Readline = SerialPort.parsers.Readline;

const portPath = '/dev/tty.usbserial-70';
const port = new SerialPort(portPath, {baudRate: 57600});
const parser = port.pipe(new Readline({delimiter: '\n'}));

const NODE_PREFIX = '[PGController]';
const ARD_PREFIX = '[ARDUINO]'

const commands = require('./Commands');

port.on('open', error => {
    if(error) {
        return console.log(`${NODE_PREFIX} Failed to open serial! Make sure to close any programs using it (also wait a few seconds after uploading Arduino code before opening this program)`)
    }
    console.log(`${NODE_PREFIX} Serial connection opened`.green);
});

parser.on('data', data => {
    console.log(`${ARD_PREFIX} ${data}`.yellow);
});

const sendCommand = (command, params) => {
    const fullCommand = `${commands.CHANGEMACHINESTEPSPERREV},800,END;`;

    port.write(fullCommand, (error) => {
    if(error) {
        return console.log(`${NODE_PREFIX} Failed to send command '${fullCommand}' to Arduino, ${error}`.red);
    }
    console.log(`${NODE_PREFIX} Sent command '${fullCommand}' to Arduino`.green);
    });
};

setTimeout(() => sendCommand(null, null), 3000);