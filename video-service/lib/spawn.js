'use strict';

const path = require('path');

/**
 * Promisified spawn process
 * @param spawnProcess
 */
const spawnPromise = (spawnProcess) => new Promise((resolve, reject) => {
  let stdout = '';
  let stderr = '';
  spawnProcess.stdout.on('data', (data) => {
    console.log(`stdout: ${data}`);
    stdout += data;
  });

  spawnProcess.stderr.on('data', (data) => {
    console.log(`stderr: ${data}`);
    stderr += data;
  });

  spawnProcess.on('close', (code) => {
    console.log(`child process exited with code ${code}`);
    if (code === 0) {
      return resolve({ stdout, stderr });
    }
    return reject(code);
  });
});

/**
 * Left pads number with zeros
 * @param number
 * @param size
 * @returns {string}
 */
const pad = (number, size) => {
  let result = `${number}`;
  while (result.length < size) result = `0${result}`;
  return result;
};

/**
 * returns FFMPEG, defaults to included ffmpeg binary
 */
const ffmpeg = () =>
  process.env.FFMPEG
    || path.resolve(
        process.env.LAMBDA_TASK_ROOT,
        '_optimize',
        process.env.AWS_LAMBDA_FUNCTION_NAME,
        'ffmpeg/ffmpeg');

/**
 * returns FFPROBE, defaults to included ffprobe binary
 */
const ffprobe = () =>
  process.env.FFPROBE
    || path.resolve(
        process.env.LAMBDA_TASK_ROOT,
        '_optimize',
        process.env.AWS_LAMBDA_FUNCTION_NAME,
        'ffmpeg/ffprobe');

module.exports = {
  spawnPromise,
  pad,
  ffmpeg,
  ffprobe,
};
