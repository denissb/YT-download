'use strict';

var YTDownload = (function() {
    var section, button, dropdown, list, vid, vTitle,
        domId = 'ytdownload-section';

    function getVideoLinks(callback) {
        vid = getUrlParam('v');
        getVideoInfo(vid, function() {
            var videoInfo = decodeInfoMap(this.responseText);
            if (!videoInfo.url_encoded_fmt_stream_map) {
                if (videoInfo.reason) {
                    return callback({
                        'reason' : decodeURIComponent(videoInfo.reason).replace(/\+/g, ' ')
                    });
                } else {
                    return callback({
                        'reason' : 'Sorry, an error occured while attempting to download'
                    });
                }
            }
            
            vTitle = videoInfo.title.replace(/\+/g, '_');
            var qObj = decodeQualityMap(videoInfo.url_encoded_fmt_stream_map);
            callback(qObj);
        });
    };
    
    // TODO:Primary method - body parsing        
    function getFMTString() {
        var scripts = window.document.body.getElementsByTagName("script"),
            fmtString = '';
            
        var match = 'url_encoded_fmt_stream_map":"';
        for (var i = 0; i < scripts.length; i++) {
            var text = scripts[i].text;
            var index = text.indexOf(match);
            if (index != -1) {
                var beforePart = text.slice(index + match.length);
                    endIndex = beforePart.indexOf('"');
                fmtString = beforePart.slice(0, endIndex);
                break;
            }
        }
        return fmtString;    
    }
    
    // Fallback method - AJAX 
    function getVideoInfo(vid, callback) {
        var xmlHttp=new XMLHttpRequest();
        xmlHttp.open('GET','get_video_info?video_id=' + vid);
        xmlHttp.onload = callback;
        xmlHttp.send();
    }
    
    function decodeInfoMap(map) {
        var keyValPair, keyValArr, keyVal,
            result = {};
        keyValArr = map.split("&");
        for (var i = 0; i < keyValArr.length; i++) {
            keyValPair = keyValArr[i];
            keyVal = keyValPair.split('=');
            result[keyVal[0]] = (keyVal[1] || '');
        }
        return result;
    };
    
    // TODO: simplify this?
    function decodeQualityMap(urlMap) {
        var uriDecodedMap = decodeURIComponent(urlMap);
        var paramArr, keyValArr, keyVal, q,
            result = {},
            hostArr = uriDecodedMap.split(",");
        
        for (var i = 0; i < hostArr.length; i++) {
            paramArr = hostArr[i];
            keyValArr = paramArr.split('&');
            
            for (var n = 0; n < keyValArr.length; n++) {
                keyVal = keyValArr[n].split('=');
                if (keyVal[0] === 'quality') {
                    q = keyVal[1];
                } else if (keyVal[0] === 'url') {
                    result[q || 'default'] = decodeURIComponent(keyVal[1]);
                }
            }
        }
        return result;
    }

    function getUrlParam(name) {
        var regex = new RegExp('[\?|&]' +  name + '=([\\w-]+)');
        return regex.exec(window.location.search)[1];
    }
    
    // Creating download UI
    var createUI = function() {
        //Checking if the element is allready present - then skipping
        var existElem = document.getElementById(domId);
        if (existElem) {
            return;
        }
        
        var container  = document.getElementById('watch8-secondary-actions');
        
        if (!container) {
            console.log('UI could not be modified');
            return;
        }
        
        function makeDomEl(tag, className) {
            var el = document.createElement(tag);
            el.className = className || '';
            return el;
        }
        
        // TODO: Cache response until video URL changes
        function populateLinks() {
            getVideoLinks(function (qLinks) {
                if (qLinks.reason) {
                    list.innerHTML = '';
                    var listItem = makeDomEl('li', 'yt-ui-menu-item ');
                    listItem.innerHTML = qLinks.reason;
                    list.appendChild(listItem);
                    return;
                }
            
                list.innerHTML = '';
                for (var prop in qLinks){
                    if (prop === 'default') {
                        continue;
                    }
                    var listItem = makeDomEl('li', 'yt-ui-menu-item ');
                    var link = makeDomEl('a', 'yt-ui-menu-item-label');
                    link.innerText = prop;
                    link.href = qLinks[prop];
                    link.setAttribute('download', vTitle + '_' + prop);
                    listItem.appendChild(link);
                    list.appendChild(listItem);
                }
            });
        }
        
        section = makeDomEl('div', 'yt-uix-menu');
        section.setAttribute('id', domId);
        var subSection = makeDomEl('div', 'yt-uix-menu-trigger');
        
        button = makeDomEl('button', 'yt-uix-button yt-uix-button-size-default yt-uix-button-opacity');
        
        var span = makeDomEl('span', 'yt-uix-button-content');
        span.innerText = '▽ Download';
        
        dropdown = makeDomEl('div', 'yt-uix-menu-content yt-ui-menu-content yt-uix-menu-content-hidden');
        
        list = makeDomEl('ul', 'action-panel-overflow-menu');
        
        var listItem = makeDomEl('li', 'yt-ui-menu-item');
        
        // TODO use i18n API
        listItem.innerText = 'Loading...';
        
        list.appendChild(listItem);
        dropdown.appendChild(list);
        button.appendChild(span);
        subSection.appendChild(button);
        section.appendChild(subSection);
        section.appendChild(dropdown);
        container.appendChild(section);
        
        button.addEventListener('click', populateLinks);
    }

    return {
        createUI: createUI,
        getVideoLinks: getVideoLinks
    }
})();

var domReadyCheck = setInterval(function(){ 
    if (document.readyState === "complete") {
        clearInterval(domReadyCheck);    
        YTDownload.createUI();
        
        // TODO: do this by monitoring Chrome tabs?
        window.setInterval(function() {
            YTDownload.createUI();
        }, 1000);
    }
}, 10);