# Serverless Video Service

This is a serverless event-driven service for creating preview and labels from video file. [FFMPEG](https://ffmpeg.org/) is used to create the preview and capturing the keyframes for [Amazon Rekognition](https://aws.amazon.com/rekognition/) labels. 

This repository includes video service and two use cases, upload service for uploading a video file from a browser and Facebook bot backend service.

## Architecture

**Video Service**

![Video Service Architecture](https://raw.githubusercontent.com/laardee/video-service/master/images/video-service.png)

1. Video file is added to Source bucket which sends Session SNS message (object create /videos).

2. Create Session Lambda function catches the message and creates sessions and sends Render Start SNS message.

3. Both, Create Gif and Create Captures Lambda functions catches the message and starts processing video file.

4. Create Gif Lambda function created preview gif and adds the file to Render Bucket and adds gif details to session table. Then it triggers Status SNS.

5. Create Captures Lambda function creates png captures from keyframes of the source video file and puts those to Source Bucket and saves capture names to Labels table.

6. Source bucket sends Capture SNS messages (object create /captures). Every png triggers own SNS message.

7. Get Labels Lambda function catches Capture SNS and gets labels from current capture file using Amazon Rekognition. Then it updates Labels table with labels and sends Status SNS.

8. Status Lambda function catches Status SNS messages and when all labels are fetched and gif preview rendered it writes metadata.json to Render bucket which triggers Render Ready SNS message that can be subscribed from other services (upload-service or facebook bot in this case).
