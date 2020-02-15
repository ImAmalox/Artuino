require('colors');

const cv = require('opencv4nodejs');
const EventEmitter = require('events');

//Activate and configure the webcam
const fs = require('fs');
const config = JSON.parse(fs.readFileSync('./Properties.json', 'utf8'));
let captureSession = new cv.VideoCapture(0);
captureSession.set(cv.CAP_PROP_FRAME_WIDTH, parseInt(config.Resolution[1]));
captureSession.set(cv.CAP_PROP_FRAME_HEIGHT, parseInt(config.Resolution[0]));

//Color ranges for the object to be tracked, in HSV format
const lowerColor = config.LowerColorRange || [23, 90, 70];
const upperColor = config.UpperColorRange || [122, 255, 255];
const lowerVector = new cv.Vec(lowerColor[0], lowerColor[1], lowerColor[2]);
const upperVector = new cv.Vec(upperColor[0], upperColor[1], upperColor[2]);

//Framerate of the tracker, a minimum of 30 is recommended
const framerate = 30;

//List of every point the object went past
let hitPoints = [];

//Max length of the contrail the object produces, -1 = infinite
const maxContrail = -1;

//EventEmitter for the points
const communicator = new EventEmitter();

//Pause the tracker?
let paused = true;

//Show the mask in the preview? Activated by specifying 'mask' as an argument
let maskOn = false;

//Flip the webcam feed vertically? Activated by specifying 'vflip' as an argument
let verticalFlip = false;

//Prefix for logging
const NODE_PREFIX = '[PointTracker]';

//Create a mask of the object to be tracked
const createMask = img => {
    //Blur the image to remove some noise
    const blurred = img.gaussianBlur(new cv.Size(5, 5), 0);
    //Convert image to HSV color format
    const imgHSV = blurred.cvtColor(cv.COLOR_BGR2HSV);
    //Create the mask based on the color range specified above
    let mask = imgHSV.inRange(lowerVector, upperVector);
    //Remove most remaining noise blobs
    mask = mask.erode(new cv.Mat(), new cv.Point(-1, -1,), 2);
    mask = mask.dilate(new cv.Mat(), new cv.Point(-1, -1,), 2);

    return mask;
};

//Get the contour of the largest area of the mask
const getContour = mask => {
    //Find all contours in the mask
    let contours = mask.findContours(cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
    //Return the largest contour, or null if there are none
    if(contours.length > 0) {
        return contours.sort((c0, c1) => c1.area - c0.area)[0];
    }else{
        return null;
    }
};

//Get the position of the object's center
const getObjectPosition = contour => {
    let moments = contour.moments();
    return new cv.Point2(moments['m10'] / moments['m00'], moments['m01'] / moments['m00']);
};

//Draw a red circle on the image, based on the object's position and size
const drawObjectCircle = (image, contour, center) => {
    //Calculate the circle's radius
    let {radius} = contour.minEnclosingCircle();
    //Draw the circle, and return the new image
    image.drawCircle(center, radius, new cv.Vec3(0, 0, 255), 2);
    return image;
};

//Draw a contrail after the object, based on the hit points
const drawObjectContrail = image => {
    let drawPoints = hitPoints;
    //If our list exceeds the maximum contrail length, trim the drawPoints list to the last points
    if(hitPoints.length > maxContrail && maxContrail !== -1) drawPoints.splice(0, drawPoints.length - maxContrail);
    //Loop through all the points and draw lines between them
    for(let i = 1; i < drawPoints.length; ++i) {
        //Make sure neither of our points are empty
        if(drawPoints[i].x !== -1 && drawPoints[i-1].x !== -1) {
            //Draw a line between the points
            image.drawLine(drawPoints[i-1], drawPoints[i], new cv.Vec3(255, 0, 0), 2);
        }
    }
    return image;
};

//Runs every frame
const handleFrame = () => {
    //Get current frame from webcam
    let frame = captureSession.read();
    //Rotate frame so it's in portrait mode
    frame = frame.rotate(verticalFlip ? cv.ROTATE_90_COUNTERCLOCKWISE : cv.ROTATE_90_CLOCKWISE);

    let finalFrame = frame;

    //Create mask of the current frame
    let mask = createMask(frame);
    //Get contour of the largest area of the mask
    let contour = getContour(mask);
    //If no object has been found, add an empty point to the list
    if(!contour) {
        //Add an empty point to the list if the tracker is on
        if(!paused) {
            hitPoints.push(new cv.Point2(-1, -1));
            communicator.emit('empty');
        }
    //If an object has been found, draw a circle and add it's position to the list of hit points
    }else{
        //Get object's position in the screen
        let position = getObjectPosition(contour);
        //Draw a circle on the current frame, based on the object's position and size
        finalFrame = drawObjectCircle(frame, contour, position);
        //Add the point to the list if the tracker is on
        if(!paused) {
            hitPoints.push(position);
            communicator.emit('point', position);
        }
    }

    if(paused) {
        hitPoints.push(new cv.Point2(-1, -1));
        communicator.emit('empty');
    }
    
    //If we have hit points, draw a contrail
    if(hitPoints.length > 0) {
        //Draw the contrail based on the hit points
        finalFrame = drawObjectContrail(frame);
    }
    
    //Show the feed and mask on screen
    cv.imshow('Tracking feed', finalFrame);
    if(maskOn) cv.imshow('Mask', mask);
    cv.waitKey(1);
};

const startTracker = () => {
    console.log(`${NODE_PREFIX} Starting point tracking`.green);
    paused = false;
    communicator.emit('pauseChange', paused);
};

const stopTracker = () => {
    console.log(`${NODE_PREFIX} Stopping point tracking`.red);
    paused = true;
    communicator.emit('pauseChange', paused);
};

const clearPoints = () => {
    hitPoints = [];
};

const setMaskOn = () => {
    maskOn = true;
};

const setVerticalFlipOn = () => {
    verticalFlip = true;
};

const setHitPoints = points => {
    hitPoints = points;
};

setInterval(() => handleFrame(), 1000 / framerate);

module.exports = {communicator, startTracker, stopTracker, clearPoints, setMaskOn, setVerticalFlipOn, setHitPoints, hitPoints, paused};