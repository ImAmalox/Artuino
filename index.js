const cv = require('opencv4nodejs');

const captureSession = new cv.VideoCapture(0);

const lowerGreen = new cv.Vec(40, 52, 70);
const upperGreen = new cv.Vec(100, 255, 255);

let frame = 0;
let framerate = 144;

const makeDotMask = (img) => {
    // filter by skin color
    const imgHSV = img.cvtColor(cv.COLOR_BGR2HSV);
    const rangeMask = imgHSV.inRange(lowerGreen, upperGreen);
    let channels = img.splitChannels();
    let maskedChannels = channels.map(c => c.bitwiseAnd(rangeMask));
    let output = new cv.Mat(maskedChannels);
    return output;
};

setInterval(() => {
    let frame = captureSession.read(); //read current webcam frame
    let handMask = makeDotMask(frame);
    // cv.imwrite(`frame.jpg`, handMask);
    cv.imshow('Preview', handMask);
    cv.waitKey(1);
    frame++;
}, 1000 / framerate);