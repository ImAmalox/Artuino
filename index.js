const cv = require('opencv4nodejs');

const {getPictureBuffer} = require('./webcam');

const lowerBlue = new cv.Vec(120, 0, 0);
const upperBlue = new cv.Vec(140, 255, 255);

let frame = 0;

const makeDotMask = (img) => {
    // filter by skin color
    const imgHSV = img.cvtColor(cv.COLOR_BGR2HSV);
    const flipped = imgHSV.flip(1);
    const rangeMask = flipped.inRange(lowerBlue, upperBlue);
    cv.imwrite('./hsv.jpg', imgHSV);
    // remove noise
    const blurred = rangeMask.blur(new cv.Size(10, 10));
    return blurred;
};

setInterval(() => {
    getPictureBuffer()
    .then(imgBuffer => {
        let img = cv.imdecode(imgBuffer);
        const handMask = makeDotMask(img);
        cv.imwrite(`./frames/${frame}.jpg`, handMask);
    })
    .catch(err => {
        console.log('bruh ', err);
    });
    frame++;
}, 1000 / 24);