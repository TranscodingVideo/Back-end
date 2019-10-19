var AWS = require('aws-sdk');
var nodemailer = require('nodemailer');
var s3 = new AWS.S3({
    apiVersion: '2012–09–25'
});

var ses = new AWS.SES({
   region: 'us-east-1'
});


exports.handler = function(event, context) {
    var uploadBucket = "cc2019upload";
    var originalOutputFilename = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, ' '));
    var outputBucket = event.Records[0].s3.bucket.name;
    if( !originalOutputFilename.match(/^[^@]+@[^@]+__\w+__\w+.mp4$/)){
      return;
    }
    var email = originalOutputFilename.split('__')[0];
    var originalFilename = originalOutputFilename.split('__')[1] + '.' + originalOutputFilename.split('__')[2].split(".")[0] ;
    console.log(originalFilename);
    if (outputBucket !== 'cc2019output') {
         context.fail('wrong bucket!!');
        
    }
    var getParams = {
        Bucket: uploadBucket, 
        Key: originalFilename 
    };
    
    // console.log(originalFilename);
    // s3.headObject(getParams, function (err, metadata) {  
    //     if (err && err.code === 'NotFound') {  
    //         context.fail('Wrong filename!');
            
    //       }
    // });
    if (!email.match(/^[^@]+@[^@]+$/)) {
        console.log('Not sending: invalid email address');
        context.succeed(null, "Failed");
        
    } 
    
    var newOutputFilename = originalFilename.split('.')[0] + ".mp4";
    console.log(newOutputFilename);
    var copySource = "/" +outputBucket + "/" + originalOutputFilename;
    console.log(copySource);
    s3.copyObject({
      Bucket: outputBucket, 
      CopySource: copySource, 
      Key: newOutputFilename
     })
      .promise()
      .then(() => 
        // Delete the old object
        s3.deleteObject({
          Bucket: outputBucket, 
          Key: originalOutputFilename
        }).promise()
       )
      // Error handling is left up to reader
      .catch((e) => console.error(e));
      
      var params = {
        Bucket: outputBucket,
        Key: newOutputFilename
    };
    var objectUrl = s3.getSignedUrl('getObject', params);
    
    var s3object = s3.getObject(params, function(error) {
        if (error) {
            console.log(error);
            context.fail('file not found!');
        }
    }
    
    );
    var mailOptions = {
      from: "no-reply@easyvideotranscoder.tk",
      subject: "Your file is ready to download",
      html: `<p>Hi, We have completed transcoding your video.  <b><a href="${objectUrl}">Click here to watch it online</a></b> or please download the attachment Thank you for using our service.</p>`,
      to: email,
      attachments: [
          {
              filename: newOutputFilename,
              content: s3object.Body
          }
      ]
    };
    
    console.log('Creating SES transporter');
    // create Nodemailer SES transporter
    var transporter = nodemailer.createTransport({
      SES: ses
    });
    // send email
    transporter.sendMail(mailOptions, function(error) {
        if (error) {
            console.log(error);
            context.fail("Unable to send email!");
        } else {
            context.succeed('Message sent!');
        }
    });
};
