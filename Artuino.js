const cv = require('opencv4nodejs');

//Activate and configure the webcam
let captureSession = new cv.VideoCapture(0);
captureSession.set(cv.CAP_PROP_FRAME_WIDTH, 640);
captureSession.set(cv.CAP_PROP_FRAME_HEIGHT, 480);

//Color ranges for the object to be tracked, in HSV format
const lowerColor = new cv.Vec(23, 90, 70);
const upperColor = new cv.Vec(122, 255, 255);

//Framerate of the tracker, a minimum of 30 is recommended
const framerate = 144;

//List of every point the object went past
const hitPoints = [];

//Max length of the contrail the object produces, -1 = infinite
const maxContrail = 10;

//Create a mask of the object to be tracked
const createMask = img => {
    //Blur the image to remove some noise
    const blurred = img.gaussianBlur(new cv.Size(5, 5), 0);
    //Convert image to HSV color format
    const imgHSV = blurred.cvtColor(cv.COLOR_BGR2HSV);
    //Create the mask based on the color range specified above
    let mask = imgHSV.inRange(lowerColor, upperColor);
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
    console.log(drawPoints[drawPoints.length-1]);
    return image;
};

//Runs every frame
const handleFrame = () => {
    //Get current frame from webcam
    let frame = captureSession.read();
    let finalFrame = frame;
    //Create mask of current frame
    let mask = createMask(frame);
    //Get contour of the largest area of the mask
    let contour = getContour(mask);
    //If no object has been found, add an empty point to the list
    if(!contour) {
        //Add an empty point to the list
        hitPoints.push(new cv.Point2(-1, -1));
    //If an object has been found, draw a circle and add it's position to the list of hit points
    }else{
        //Get object's position in the screen
        let position = getObjectPosition(contour);
        //Draw a circle on the current frame, based on the object's position and size
        finalFrame = drawObjectCircle(frame, contour, position);
        //Add the point to the list
        hitPoints.push(position);
    }
    //If we have hit points, draw a contrail
    if(hitPoints.length > 0) {
        //Draw the contrail based on the hit points
        finalFrame = drawObjectContrail(frame);
    }
    //Show the feed and mask on screen
    cv.imshow('Tracking feed', finalFrame);
    cv.imshow('Mask', mask);
    cv.waitKey(1);
};

//Create a loop to perform actions every frame
setInterval(handleFrame, 1000 / framerate);