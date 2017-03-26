// Saves options to chrome.storage
function save_options() {
  var url = document.getElementById('url').value;
  var defaultWords = document.getElementById('defaultWords').value;
  var tryConvertDateTime = document.getElementById('chkTryConvertDate').checked;

  var options = {
    url: url,
    defaultWords: defaultWords,
    tryConvertDateTime: tryConvertDateTime
  };

  if (document.getElementById('15min').checked) {
    options.timespan = "15min";
  } else if (document.getElementById('today').checked) {
    options.timespan = "today";
  } else if (document.getElementById('thisyear').checked) {
    options.timespan = "thisyear";
  }

  chrome.storage.sync.set(options, function () {
    // Update status to let user know options were saved.
    var status = document.getElementById('status');
    status.textContent = 'Options saved.';
    setTimeout(function () {
      status.textContent = '';
    }, 750);
  });
}

// Restores select box and checkbox state using the preferences
// stored in chrome.storage.
function restore_options() {
  chrome.storage.sync.get({
    url: 'https://splunk.myserver.ch/de-DE/app/my_app/search',
    defaultWords: 'host=PROD',
    timespan: '15min',
    tryConvertDateTime: true
  }, function (options) {
    document.getElementById('url').value = options.url;
    document.getElementById('defaultWords').value = options.defaultWords;

    if (options.timespan == "15min") {
      document.getElementById('15min').checked = true;
    } else if (options.timespan == "today") {
      document.getElementById('today').checked = true;
    } else if (options.timespan == "thisyear") {
      document.getElementById('thisyear').checked = true;
    }

    document.getElementById('chkTryConvertDate').checked = options.tryConvertDateTime;
  });
}



document.addEventListener('DOMContentLoaded', restore_options);
document.getElementById('save').addEventListener('click', save_options);

//for test puropses
if (!chrome.storage) {
  chrome.storage = {
    sync: {
      get: function (item, fn) { fn(item); },
      set: function (item, fn) { console.log('save: ', item); fn(item); },
    }
  }
}