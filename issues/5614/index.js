var xhr = new XMLHttpRequest();
xhr.open('GET', 'remote.js', true);
xhr.onreadystatechange = function () {
  if (xhr.readyState === 4) {
    eval(xhr.responseText);
  }
};
xhr.send();