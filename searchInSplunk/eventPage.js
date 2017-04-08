
var searchQuery = [];
var timespanFromSearchWord = null;

function checkIsDate(textInput) {
    var deFormatted = checkIsDEDate(textInput);
    if (deFormatted.isValid) {
        return deFormatted;
    }
    var deFormatted = checkIsParsable(textInput);
    if (deFormatted.isValid) {
        return deFormatted;
    }
    return checkIsEnDate(textInput);
}

function checkIsParsable(textInput) {
    var date = Date.parse(textInput);
    if (isNaN(date)) {
        return { isValid: false };
    }
    return { isValid: true, input: textInput, parsedDate: new Date(date) };
}

function checkIsEnDate(textInput) {
    console.log('checkIsEnDate not implemented');
    return { isValid: false };
}

function checkIsDEDate(textInput) {
    //matches the following examples
    //12.2.2015 or 12.2.04 or 12.10.2017 12:00 or 12.10.2017 um 12:00 or 12.10.2017 12:00:00 or 12.10.2017 12:00:00.000
    const deFormattedDate = /^(\d{1,2}).(\d{1,2}).(\d{4}|\d{2})((\s|\sum\s)(\d{1,2}):(\d{1,2})(:(\d{1,2}))?(\.(\d{1,3}))?)?$/g;
    //const str = `12.4.2016 12:13:14.999`;
    let match = deFormattedDate.exec(textInput);
    if (match == null) {
        return { isValid: false };
    }
    //new Date(year, month, day, hours, minutes, seconds, milliseconds)
    var secondsDefined = false;
    var date = new Date(match[3], match[2] - 1, match[1])
    if (match[6]) date.setHours(match[6]);
    if (match[7]) date.setMinutes(match[7]);
    if (match[9]) {
        date.setSeconds(match[9]);
        secondsDefined = true;
    }
    if (match[11]) date.setMilliseconds(match[11]);

    return { isValid: true, input: textInput, parsedDate: date, secondsDefined: secondsDefined };
}


function extendContextMenu() {
    // The onClicked callback function.
    function onClickHandler(info, tab) {
        if (info.menuItemId == "addEmpty") {
            searchQuery = [];
            timespanFromSearchWord = null;
        }

        var dateCheck = checkIsDate(info.selectionText);
        if (dateCheck.isValid) {
            console.log(info.selectionText + " parsed as date: " + dateCheck.parsedDate);
            //if we had already a timespanFromSearchWord we add it to the searchQuery and use the new one.
            if (timespanFromSearchWord) {
                searchQuery.push(info.timespanFromSearchWord.input);
            }
            timespanFromSearchWord = { input: info.selectionText, parsedDate: dateCheck.parsedDate, secondsDefined: dateCheck.secondsDefined };
        } else {
            searchQuery.push(info.selectionText);
            console.log("\"" + info.selectionText + "\" added to searchQuery: " + searchQuery.join(" "));
        }

        if (info.menuItemId == "addAndSearch") {
            SearchInSplunk(searchQuery);
        }
    };

    function getTimespan(timespanOption, timespanFromSearchWord) {
        var parsedDate = timespanFromSearchWord ? timespanFromSearchWord.parsedDate : null;
        if (parsedDate) {
            var { earliest, latest } = calculateTimespan(parsedDate, timespanFromSearchWord.secondsDefined);
            console.log("provided timespan from " + new Date(earliest) + " to " + new Date(latest));
            return "&earliest=" + earliest / 1000 + "&latest=" + latest / 1000;
        } else if (timespanOption == "15min") {
            return "&earliest=-15m&latest=now"
        } else {
            var now = new Date();
            if (timespanOption == "today") {
                var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                return "&earliest=" + today / 1000 + "&latest=now";
            } else if (timespanOption == "thisyear") {
                var thisyear = new Date(now.getFullYear(), 0, 1);
                return "&earliest=" + thisyear / 1000 + "&latest=now";
            }
        }
        return "";
    }

    function calculateTimespan(parsedDate, secondsDefined) {
        var latest = new Date(parsedDate);
        var hasTime = parsedDate.getSeconds() || parsedDate.getMinutes() || parsedDate.getHours();
        if (hasTime) {
            if (secondsDefined) {
                //if seconds are defined we want a timeslot of 4 seconds
                return { earliest: parsedDate.setSeconds(parsedDate.getSeconds() - 2), latest: latest.setSeconds(latest.getSeconds() + 2) };
            } else {
                // if no seconds are defined we want a time slot of one minute
                return { earliest: parsedDate, latest: latest.setMinutes(latest.getMinutes() + 1) };
            }
        }
        //we want the whole day, since no time provided
        return { earliest: parsedDate, latest: latest.setHours(24) };
    }

    function SearchInSplunk(searchQuery) {
        chrome.storage.sync.get({
            url: 'notset',
            defaultWords: null,
            timespan: '15min',
            tryConvertDateTime: true
        }, function (items) {
            if (items.url == "notset") {
                alert('define your splunk url in the options dialog');
                return;
            }
            //if option tryConvertDateTime is not checked, but we have a candiate as date, we simple add the
            // candate as search word
            if (!items.tryConvertDateTime && timespanFromSearchWord) {
                searchQuery.push(timespanFromSearchWord.input);
                timespanFromSearchWord = null;
            }

            var defaultWords = items.defaultWords ? items.defaultWords + " " : "";
            var params = "?q=search%20" + encodeURIComponent(defaultWords + " " + searchQuery.join(" "));
            var params = params + getTimespan(items.timespan, timespanFromSearchWord);
            window.open(items.url + params);
            timespanFromSearchWord = null;
            searchQuery = [];
        })
    }

    chrome.contextMenus.onClicked.addListener(onClickHandler);
    // Create a parent item and two children.
    chrome.contextMenus.create({ "title": "Add to empty search query", contexts: ["selection"], "id": "addEmpty" });
    chrome.contextMenus.create({ "title": "Add to search query", contexts: ["selection"], "id": "add" });
    chrome.contextMenus.create({ "title": "Add and search in splunk", contexts: ["selection"], "id": "addAndSearch" });
}

extendContextMenu();
