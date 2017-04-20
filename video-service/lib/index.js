'use strict';

const exec = require('child_process').exec;
const { ffprobe } = require('./spawn');

const probeVideo = (input) => new Promise((resolve) => {
  const cmd = `${ffprobe()} -v quiet -print_format json -show_format "${input}"`;
  exec(cmd, (error, stdout) => {
    resolve(JSON.parse(stdout));
  });
});

const getDuration = (input) =>
  probeVideo(input).then((data) => {
    console.log(JSON.stringify(data, null, 2));
    if (Object.keys(data).length === 0 && data.constructor === Object) {
      return Promise.reject('Failed to read video properties');
    }

    return parseFloat(data.format.duration);
  });

module.exports = {
  probeVideo,
  getDuration,
};
