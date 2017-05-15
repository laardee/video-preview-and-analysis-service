'use strict';

const exec = require('child_process').exec;
const spawn = require('child_process').spawn;
const { ffprobe, spawnPromise } = require('./spawn');

/**
 * Probes video format with FFPROBE
 * @param input
 */
const probeVideo = (input) => new Promise((resolve) => {
  const cmd = `${ffprobe()} -v quiet -print_format json -show_format "${input}"`;
  exec(cmd, (error, stdout) => {
    resolve(JSON.parse(stdout));
  });
});

const probe = (params) =>
  spawnPromise(spawn(ffprobe(), (params).split(' ')))
    .then(({ stdout }) => stdout);

/**
 * Returns video duration in seconds
 * @param input
 */
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
  probe,
  getDuration,
};
