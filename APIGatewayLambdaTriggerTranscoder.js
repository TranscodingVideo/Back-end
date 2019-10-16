var AWS = require('aws-sdk');
var path = require('path');

var s3 = new AWS.S3({
    apiVersion: '2012–09–25'
});

var eltr = new AWS.ElasticTranscoder({
    apiVersion: '2012–09–25',
    region: 'us-east-1'
});
var pipelineId = '1571142214435-e1xxd0';

let responseCode = 200;
exports.handler = function(event, context, callback) {
    console.log('Executing Elastic Transcoder Orchestrator');
    var key;
    var getParams = {
        Bucket: 'cc2019upload', 
        Key: event['queryStringParameters']['filename']
    };
    
    if(!event['queryStringParameters']['email'] || !event['queryStringParameters']['filename']){
        responseCode = 400;
        let responseBody = {
            message: "Wrong email or file name!"
        };
        let response = {
            statusCode: responseCode,
            headers: {
            },
            body: JSON.stringify(responseBody)
        };
        callback(null,response) ;
    }
    
    
    key = event['queryStringParameters']['filename'];
    s3.headObject(getParams, function (err, metadata) {  
        if (err && err.code === 'NotFound') { 
            responseCode = 400;
            let responseBody = {
                message: "File not found!"
            };
            let response = {
                statusCode: responseCode,
                headers: {
                },
                body: JSON.stringify(responseBody)
            };
             callback(null,response) ;
        }
    });
    
    var srcKey = decodeURIComponent(key.replace(/\+/g, " ")); //the object may have spaces
    var newKey = srcKey.split('.')[0] ;
    var params = {
    PipelineId: pipelineId,
    Input: {
        Key: srcKey,
        FrameRate: 'auto',
        Resolution: 'auto',
        AspectRatio: 'auto',
        Interlaced: 'auto',
        Container: 'auto'
    },
    Outputs: [{
        Key: event['queryStringParameters']['email'] + '__'+ newKey +'__'+ path.extname(srcKey).split('.')[1] + '.mp4',
        PresetId: '1351620000001-000010', //Generic 720p
    }]
    };
    console.log('Starting Job');
    eltr.createJob(params, function(err, data){
        
        if (err){
            responseCode = 500;
            let responseBody = {
                message: "Failed to create job! Please contact provider!"
            };
            let response = {
                statusCode: responseCode,
                headers: {
                },
                body: JSON.stringify(responseBody)
            };
            
             callback(null,response) ;
        } else {
            console.log("i'm here3345345");
            
            let message = {
                'messageResponse':'Job Created! You will receieve email when the file is ready.'
            };

            let response = {
                statusCode: responseCode,
                headers: {
                    "x-custom-header" : ""
                },
                body: JSON.stringify(message)
            };
            console.log(response);
             callback(null,response) ;
        }
    });
};
