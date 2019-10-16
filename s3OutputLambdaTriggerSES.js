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
    if (outputBucket !== 'cc2019output') {
         context.fail('wrong bucket!!');
        
    }
    var getParams = {
        Bucket: uploadBucket, 
        Key: originalFilename 
    };
    
    console.log(originalFilename);
    s3.headObject(getParams, function (err, metadata) {  
        if (err && err.code === 'NotFound') {  
            context.fail('Wrong filename!');
            
          }
    });
    if (!email.match(/^[^@]+@[^@]+$/)) {
        console.log('Not sending: invalid email address');
        context.succeed(null, "Failed");
        
    } 
    var params = {
        Bucket: outputBucket,
        Key: originalOutputFilename
    };
    
    var objectUrl = s3.getSignedUrl('getObject', params);
  // //   console.log(objectUrl);
  // //   const htmlBody = `
  // //   <!DOCTYPE html>
  // //   <html>
  // //     <head>
  // //     </head>
  // //     <body>
  // //       <p>Hi,</p>
  // //       <br>
  // //       <p> We have completed transcoding your video.  <b><a href="${objectUrl}" download="${originalOutputFilename}">Click here to download</a></b></p>
  // //     </body>
  // //   </html>
  // // `;

  // // // Create sendEmail params
  // // const paramsEmail = {
  // //   Destination: {
  // //     ToAddresses: [email]
  // //   },
  // //   Message: {
  // //     Body: {
  // //       Html: {
  // //         Charset: "UTF-8",
  // //         Data: htmlBody
  // //       },
  // //     },
  // //     Subject: {
  // //       Charset: "UTF-8",
  // //       Data: "Your file is ready to download"
  // //     }
  // //   },
  // //   Source: "no-reply@easyvideotranscoder.tk"
  // // };

  // // // Create the promise and SES service object
  // // const sendPromise = ses.sendEmail(paramsEmail).promise();

  // // // Handle promise's fulfilled/rejected states
  // //   sendPromise
  // //       .then(data => {
  // //         console.log(data.MessageId);
  // //         context.done(null, "Success");
  // //       })
  // //       .catch(err => {
  // //         console.error(err, err.stack);
  // //         context.done(null, "Failed");
  // //   });
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
      html: `<p>Hi, We have completed transcoding your video.  <b><a href="${objectUrl}" download="${originalOutputFilename}">Click here to watch it online</a></b> or please download the attachment Thank you for using our service.</p>`,
      to: email,
      attachments: [
          {
              filename: originalOutputFilename,
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
