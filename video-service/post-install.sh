#!/usr/bin/env bash
curl -O https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-64bit-static.tar.xz
tar -xvf ffmpeg-release-64bit-static.tar.xz
rm ffmpeg-release-64bit-static.tar.xz
mv ffmpeg* ffmpeg
chmod 0755 ffmpeg/ffmpeg
