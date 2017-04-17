#!/usr/bin/env bash
cd video-service && sls deploy
cd ../upload-service && sls deploy
cd ../facebook-service && sls deploy
