const fs = require('fs');
const config = JSON.parse(fs.readFileSync('./Properties.json', 'utf8'));

exports.asNativeCoords = (x, y, direct) => {

    x = parseInt(config.HomePoint[0]) + x;
    y = parseInt(config.HomePoint[1]) + y;

    let stepsPerMM = config.StepsPerRev / config.MMPerRev;
    let width = config.MachineSize[0];

    let leftDistance = distance(0, 0, x, y);
    let rightDistance = distance(width, 0, x, y);

    let leftSteps = leftDistance * stepsPerMM;
    let rightSteps = rightDistance * stepsPerMM;

    if(!direct) return [Math.round(leftSteps), Math.round(rightSteps)];
    return [Math.round(leftSteps), Math.round(rightSteps), 2];
};

const distance = (x1, y1, x2, y2) => {
    return Math.sqrt((Math.pow((Math.abs(x1 - x2)), 2) + Math.pow((Math.abs(y1 - y2)), 2)));
};