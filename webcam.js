const NodeWebcam = require('node-webcam');

var opts = {
    width: 640,
    height: 480,
    quality: 50,
    delay: 0, //delay of shots to take
    saveShots: true, //save shots in memory
    // [jpeg, png] support varies
    // Webcam.OutputTypes
    output: "jpeg",
    //Which camera to use
    //Use Webcam.list() for results
    //false for default device
    device: false,
    // [location, buffer, base64]
    // Webcam.CallbackReturnTypes
    callbackReturn: "buffer",
    //Logging
    verbose: false
};

//Create webcam instance
const Webcam = NodeWebcam.create(opts);

exports.getPictureBuffer = () => {
    return new Promise((resolve, reject) => {
        Webcam.capture("stream", (err, data) => {
            if(err) reject(err);
            resolve(data);
        });
    });
}