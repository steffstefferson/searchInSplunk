
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
    if (isNan(date)) {
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
    var date = new Date(match[3], match[2], match[1])
    if (match[6]) date.setHours(match[6]);
    if (match[7]) date.setMinutes(match[7]);
    if (match[9]) date.setSeconds(match[9]);
    if (match[11]) date.setMilliseconds(match[11]);

    return { isValid: true, input: textInput, parsedDate: date };
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
            timespanFromSearchWord = { input: info.selectionText, parsedDate: dateCheck.parsedDate };
        } else {
            searchQuery.push(info.selectionText);
            console.log("\"" + info.selectionText + "\" added to searchQuery: " + searchQuery.join(" "));
        }

        if (info.menuItemId == "addAndSearch") {
            SearchInSplunk(searchQuery);
        }
    };

    function getTimespan(timespanOption, parsedDate) {

        if (parsedDate) {
            var hasTime = parsedDate.getSeconds() || parsedDate.getMinutes() || parsedDate.getHours();
            if (hasTime) {
                return "&earliest=" + parsedDate.setSeconds(parsedDate.getSeconds() - 2) / 1000 + "&latest=" + parsedDate.setSeconds(parsedDate.getSeconds() + 2) / 1000;
            } else {
                return "&earliest=" + parsedDate / 1000 + "&latest=" + parsedDate.setHours(parsedDate.getHours() - 2) / 1000;
            }
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
            var params = params + getTimespan(items.timespan, timespanFromSearchWord ? timespanFromSearchWord.parsedDate : null);
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
