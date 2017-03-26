// var requestData = { "action": "createContextMenuItem" };
// //send request to background script
// chrome.extension.sendRequest(requestData);

// var isInitialized;
// function onRequest(request, sender, callback) {
//     if (request.action == 'createContextMenuItem' && !isInitialized) {
//         console.log("got request createContextMenuItem");
//         isInitialized = true;
//     }
// }

// //subscribe on request from content.js:
// console.log("chrome.extension.onRequest.addListener(onRequest);");
// chrome.extension.onRequest.addListener(onRequest);


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
            console.log(info.selectionText + " parsed as date: " + parsedDate);
            //if we had already a timespanFromSearchWord we add it to the searchQuery and use the new one.
            if (timespanFromSearchWord) {
                searchQuery.push(info.timespanFromSearchWord);
            }
            timespanFromSearchWord = info.selectionText;
        } else {
            searchQuery.push(info.selectionText);
            console.log("\"" + info.selectionText + "\" added to searchQuery: " + searchQuery.join(" "));
        }

        if (info.menuItemId == "addAndSearch") {
            SearchInSplunk(searchQuery);
        }
        // console.log("item " + info.menuItemId + " was clicked");
        //console.log("selected Text is: " + info.selectionText);
        //console.log("serach query looks like: " + JSON.stringify(searchQuery));
        //console.log("info: " + JSON.stringify(info));
        //console.log("tab: " + JSON.stringify(tab));
    };

    function getTimespan(timespanOption, m) {
        var splunkFormat = function (m) { return m.format("M/D/Y:H:m:s"); };
        if (m) {
            var hasTime = m.minutes() || m.hours() || m.seconds();
            if (hasTime) {
                return "&earliest=" + splunkFormat(m.second(t.second() - 2)) + "&latest=" + splunkFormat(t.second(t.second() + 2));
            } else {
                return "&earliest=" + splunkFormat(m) + "&latest=" + splunkFormat(t.date(t.date() + 1));
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
                searchQuery.push(timespanFromSearchWord);
                timespanFromSearchWord = null;
            }

            var defaultWords = items.defaultWords ? items.defaultWords + " " : "";
            var params = "search?q=search%20" + encodeURIComponent(defaultWords + " " + searchQuery.join(" "));
            var params = params + getTimespan(items.timespan, moment(timespanFromSearchWord));
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
