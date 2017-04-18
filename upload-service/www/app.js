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
      console.log(data);
      if (data.status === 0) {
        setTimeout(() => refreshMetadata(session), 2000);
      }
      return data;
    });

const refreshMetadata = (session) =>
  getMetadata(session)
    .then(insertSessionToLocalStorage);


const insertSessionToLocalStorage = (data) => {
  localStorage.setItem(`session-${data.id}`, JSON.stringify(data));
  refreshList();
  return data;
};

const refreshList = () => {
  const sessions =
    Object.keys(localStorage)
      .filter((key) => key.substr(0,8) === 'session-')
      .sort()
      .reverse()
      .map((session) => {
        const {
          id,
          gifUrl,
          videoUrl,
          message,
          status,
          labels,
        } = JSON.parse(localStorage.getItem(session));
        console.log({
          id,
          gifUrl,
          videoUrl,
          message,
          status,
          labels,
        });
        let elements = '';
        if(status === 1) {
          const labelsList = labels.map(label => `<li>${label.Name} [${label.Confidence}]</li>`).join('');
          const videoElement = `<video width="320" height="240" controls src="${videoUrl}"></video>`;
          const gifElement = `<img src=${gifUrl}>`;
          const labelsElement = `<ul>${labelsList}</ul>`;
          elements = `${videoElement}<br>${gifElement}<br>${labelsElement}`;
        }
        // else {
        //   d = `<button class="refresh" id="${id}">Refresh</button>`;
        // }

        return `<li><div>${id} - ${message}<br>${elements}</div></li>`;
      });
  $('#videos').html(sessions);
};

$(() => {
  refreshList();

  $('body').on('click', 'button.refresh', (event) => {
    const id = $(event.target).attr('id');
    getMetadata(id)
      .then(insertSessionToLocalStorage)
      .then(refreshList);
  });

  $('#upload-video')
    .on('submit', (event) => {
      const file = $('#upload-video #video')[0].files[0];
      const formData = new FormData($('#upload-video')[0]);
      console.log(formData);
      event.preventDefault();
      console.log('SUBMIT!', event);
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
