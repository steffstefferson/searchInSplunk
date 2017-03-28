
var searchQuery = [];
var timespanFromSearchWord = null;

function extendContextMenu() {
    // The onClicked callback function.
    function onClickHandler(info, tab) {
        if (info.menuItemId == "addEmpty") {
            searchQuery = [];
            timespanFromSearchWord = null;
        }

        if (moment(info.selectionText).isValid()) {
            console.log(info.selectionText + " parsed as date: " + moment(info.selectionText).toDate());
            //if we had already a timespanFromSearchWord we add it to the searchQuery and use the new one.
            if (timespanFromSearchWord) {
                searchQuery.push(info.timespanFromSearchWord.input);
            }
            timespanFromSearchWord = { input: info.selectionText, parsedDate: moment(info.selectionText) };
        } else if (moment(new Date(Date.parse(info.selectionText))).isValid()) {
            console.log(info.selectionText + " parsed as date: " + moment(info.selectionText).toDate());
            //if we had already a timespanFromSearchWord we add it to the searchQuery and use the new one.
            if (timespanFromSearchWord) {
                searchQuery.push(info.timespanFromSearchWord.input);
            }
            timespanFromSearchWord = { input: info.selectionText, parsedDate: moment(new Date(Date.parse(info.selectionText))) };
        } else {
            searchQuery.push(info.selectionText);
            console.log("\"" + info.selectionText + "\" added to searchQuery: " + searchQuery.join(" "));
        }

        if (info.menuItemId == "addAndSearch") {
            SearchInSplunk(searchQuery);
        }
    };

    function getTimespan(timespanOption, momDate) {
        var splunkFormat = function (momDate) { return momDate.format("M/D/Y:H:m:s"); };
        if (momDate) {
            var hasTime = momDate.minutes() || momDate.hours() || momDate.seconds();
            if (hasTime) {
                return "&earliest=" + splunkFormat(momDate.second(momDate.second() - 2)) + "&latest=" + splunkFormat(momDate.second(momDate.second() + 2));
            } else {
                return "&earliest=" + splunkFormat(momDate) + "&latest=" + splunkFormat(momDate.date(momDate.date() + 1));
            }
        } else if (timespanOption == "15min") {
            return "&earliest=-15m&latest=now"
        } else {
            var today = new Date();
            var dd = today.getDate();
            var mm = today.getMonth() + 1; //January is 0!
            var yyyy = today.getFullYear();
            if (timespanOption == "today") {
                var today = mm + '/' + dd + '/' + yyyy + ":00:00:00";
                //earliest="11/5/2015:20:00:00"
                return "&earliest=" + today + "&latest=now";
            } else if (timespanOption == "thisyear") {
                var thisyear = '01/01/' + yyyy + ":00:00:00";
                return "&earliest=" + thisyear + "&latest=now";
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
            var params = "search?q=search%20" + encodeURIComponent(defaultWords + " " + searchQuery.join(" "));
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
