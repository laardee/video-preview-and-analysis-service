'use strict';

const api = 'https://dmiq0jckrd.execute-api.us-east-1.amazonaws.com/dev';

const uploadFile = ({ url, session, file }) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () =>
      fetch(url, {
        method: 'PUT',
        mode: 'cors',
        headers: {
          'content-length': file.size,
        },
        body: reader.result,
      })
        .then(() => resolve(session));
    reader.readAsArrayBuffer(file);
  });

const getMetadata = (session) =>
  fetch(`${api}/metadata/${session}`)
    .then(data => data.json())
    .then((data) => {
      if (data.status === 0) {
        setTimeout(() => refreshMetadata(session), 2000);
      }
      return data;
    });

const refreshMetadata = (session) =>
  getMetadata(session)
    .then(insertSessionToLocalStorage);


const insertSessionToLocalStorage = (data) => {
  localStorage.setItem('video-session', JSON.stringify(data));
  refreshContent();
  return data;
};

const refreshContent = () => {
  if (Object.keys(localStorage).indexOf('video-session')>-1) {
    const {
      id,
      gifUrl,
      videoUrl,
      message,
      status,
      labels,
    } = JSON.parse(localStorage.getItem('video-session'));

    $('#status').html(`${message} [${id}]`);
    if(status === 1) {
      $('#video-container').attr('src', videoUrl);
      $('#preview-container').attr('src', gifUrl);
      const labelsList = labels.map(label => `<li>${label.Name} [${label.Confidence}]</li>`).join('');
      $('#labels-container').html(labelsList);
    } else {
      $('#video-container').attr('src', '');
      $('#preview-container').attr('src', '');
      $('#labels-container').html('');
    }
  }
};

$(() => {
  refreshContent();

  $('body').on('click', 'button.refresh', (event) => {
    const id = $(event.target).attr('id');
    getMetadata(id)
      .then(insertSessionToLocalStorage)
      .then(refreshContent);
  });

  $('#upload-video #video').change((event) => {
    const file = $('#upload-video #video')[0].files[0];
    $('#status').html(`Press Submit to upload ${file.name}`);
  });

  $('#upload-video')
    .on('submit', (event) => {
      event.preventDefault();
      const file = $('#upload-video #video')[0].files[0];
      fetch(`${api}/signed-url?file=${file.name}`)
        .then((response) => response.json())
        .then((data) => {
          insertSessionToLocalStorage({ id: data.session, message: 'Uploading' });
          return data;
        })
        .then(({ url, session }) => uploadFile({ url, session, file }))
        .then(refreshMetadata)
        .then(console.log);
    });
});
