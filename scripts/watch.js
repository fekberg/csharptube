﻿// parseUri 1.2.2
// (c) Steven Levithan <stevenlevithan.com>
// MIT License

function parseUri(str) {
    var o = parseUri.options,
		m = o.parser[o.strictMode ? "strict" : "loose"].exec(str),
		uri = {},
		i = 14;

    while (i--) uri[o.key[i]] = m[i] || "";

    uri[o.q.name] = {};
    uri[o.key[12]].replace(o.q.parser, function ($0, $1, $2) {
        if ($1) uri[o.q.name][$1] = $2;
    });

    return uri;
};

parseUri.options = {
    strictMode: false,
    key: ["source", "protocol", "authority", "userInfo", "user", "password", "host", "port", "relative", "path", "directory", "file", "query", "anchor"],
    q: {
        name: "queryKey",
        parser: /(?:^|&)([^&=]*)=?([^&]*)/g
    },
    parser: {
        strict: /^(?:([^:\/?#]+):)?(?:\/\/((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?))?((((?:[^?#\/]*\/)*)([^?#]*))(?:\?([^#]*))?(?:#(.*))?)/,
        loose: /^(?:(?![^:@]+:[^:@\/]*@)([^:\/?#.]+):)?(?:\/\/)?((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/
    }
};

var player = {
    youtubeApiReady: false,
    youtubeVideoId: ""
};

player.play = function (url) {

    $("#sidebar").hide();

    //extract id from url

    var domain = parseUri(url).host;
    var videoId = null;
    var type = null;

    switch (domain) {
        case "vimeo.com":
        case "www.vimeo.com":
            type = "vimeo";
            var id = url.match(/(\d+)/)[0];
            if (id) {
                videoId = id;
            }
            break;
        case "www.youtube.com":
        case "youtube.com":
        case "youtu.be":
            type = "youtube"
            var id = url.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/);
            if (id) {
                videoId = id[2];
            }
            break;
    }

    $("#video-item").empty();

    switch (type) {
        case "vimeo":
            this.vimeoPlayer(videoId);
            break;
        case "youtube":
            this.youtubeVideoId = videoId;
            this.youtubePlayer();
            break;
    }
};

player.vimeoPlayer = function (videoId) {
    //create an insert the iframe
    var frame = $("<iframe>").attr("id", "vimeoPlayer").attr("width", 960).attr("height", 540).attr("frameborder", 0).attr("webkitallowfullscreen", "");
    frame.appendTo($("#video-item"));
    frame.load(function () {
        setTimeout(function () {
            //this is stupid, i need something else here
            var vimeoPlayer = document.getElementById('vimeoPlayer');
            window.Froogaloop(vimeoPlayer).addEvent('ready', ready);
        }, 5000);
    });
    frame.attr("src", "http://player.vimeo.com/video/" + videoId + "?api=1&amp;player_id=vimeoPlayer");

    function ready(playerId) {
        window.Froogaloop(playerId).addEvent('playProgress', progress);
    }

    function progress(data) {
    }

};

//this method is required for youtube

function onYouTubePlayerAPIReady() {
    player.youtubeApiReady = true;
    player.youtubePlayer();
}

player.youtubePlayer = function () {
    if ($("script#youtube-player-api").length == 0) {
        var tag = document.createElement('script');
        tag.src = "http://www.youtube.com/player_api";
        tag.id = "youtube-player-api";
        var firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    }

    var youtube = {};
    var video;
    if (player.youtubeApiReady) {
        var div = $("<div>");
        div.attr("id", "player");
        div.appendTo($("#video-item"));

        video = new window.YT.Player('player', {
            height: '540',
            width: '960',
            videoId: player.youtubeVideoId,
            setPlaybackQuality: 'highres',
            events: {
            }
        });
    }
};

// Init style shamelessly stolen from jQuery http://jquery.com
var Froogaloop = (function () {
    // Define a local copy of Froogaloop

    function Froogaloop(iframe) {
        // The Froogaloop object is actually just the init constructor
        return new Froogaloop.fn.init(iframe);
    }

    var eventCallbacks = {},
        hasWindowEvent = false,
        isReady = false,
        slice = Array.prototype.slice,
        playerDomain = '';

    Froogaloop.fn = Froogaloop.prototype = {
        element: null,

        init: function (iframe) {
            if (typeof iframe === "string") {
                iframe = document.getElementById(iframe);
            }

            this.element = iframe;

            // Register message event listeners
            playerDomain = getDomainFromUrl(this.element.getAttribute('src'));

            return this;
        },

        /*
        * Calls a function to act upon the player.
        *
        * @param {string} method The name of the Javascript API method to call. Eg: 'play'.
        * @param {Array|Function} valueOrCallback params Array of parameters to pass when calling an API method
        *                                or callback function when the method returns a value.
        */
        api: function (method, valueOrCallback) {
            if (!this.element || !method) {
                return false;
            }

            var self = this,
                element = self.element,
                target_id = element.id !== '' ? element.id : null,
                params = !isFunction(valueOrCallback) ? valueOrCallback : null,
                callback = isFunction(valueOrCallback) ? valueOrCallback : null;

            // Store the callback for get functions
            if (callback) {
                storeCallback(method, callback, target_id);
            }

            postMessage(method, params, element);
            return self;
        },

        /*
        * Registers an event listener and a callback function that gets called when the event fires.
        *
        * @param eventName (String): Name of the event to listen for.
        * @param callback (Function): Function that should be called when the event fires.
        */
        addEvent: function (eventName, callback) {
            if (!this.element) {
                return false;
            }

            var self = this,
                element = self.element,
                target_id = element.id !== '' ? element.id : null;


            storeCallback(eventName, callback, target_id);

            // The ready event is not registered via postMessage. It fires regardless.
            if (eventName != 'ready') {
                postMessage('addEventListener', eventName, element);
            } else if (eventName == 'ready' && isReady) {
                callback.call(null, target_id);
            }

            return self;
        },

        /*
        * Unregisters an event listener that gets called when the event fires.
        *
        * @param eventName (String): Name of the event to stop listening for.
        */
        removeEvent: function (eventName) {
            if (!this.element) {
                return false;
            }

            var self = this,
                element = self.element,
                target_id = element.id !== '' ? element.id : null,
                removed = removeCallback(eventName, target_id);

            // The ready event is not registered
            if (eventName != 'ready' && removed) {
                postMessage('removeEventListener', eventName, element);
            }
        }
    };

    /**
    * Handles posting a message to the parent window.
    *
    * @param method (String): name of the method to call inside the player. For api calls
    * this is the name of the api method (api_play or api_pause) while for events this method
    * is api_addEventListener.
    * @param params (Object or Array): List of parameters to submit to the method. Can be either
    * a single param or an array list of parameters.
    * @param target (HTMLElement): Target iframe to post the message to.
    */

    function postMessage(method, params, target) {
        if (!target.contentWindow.postMessage) {
            return false;
        }

        var url = target.getAttribute('src').split('?')[0],
            data = JSON.stringify({
                method: method,
                value: params
            });

        target.contentWindow.postMessage(data, url);
    }

    /**
    * Event that fires whenever the window receives a message from its parent
    * via window.postMessage.
    */

    function onMessageReceived(event) {
        var data, method;

        try {
            data = JSON.parse(event.data);
            method = data.event || data.method;
        } catch (e) {
            //fail silently... like a ninja!
        }

        if (method == 'ready' && !isReady) {
            isReady = true;
        }

        // Handles messages from moogaloop only
        if (event.origin != playerDomain) {
            return false;
        }

        var value = data.value,
            eventData = data.data,
            target_id = target_id === '' ? null : data.player_id,
            callback = getCallback(method, target_id),
            params = [];

        if (!callback) {
            return false;
        }

        if (value !== undefined) {
            params.push(value);
        }

        if (eventData) {
            params.push(eventData);
        }

        if (target_id) {
            params.push(target_id);
        }

        return params.length > 0 ? callback.apply(null, params) : callback.call();
    }


    /**
    * Stores submitted callbacks for each iframe being tracked and each
    * event for that iframe.
    *
    * @param eventName (String): Name of the event. Eg. api_onPlay
    * @param callback (Function): Function that should get executed when the
    * event is fired.
    * @param target_id (String) [Optional]: If handling more than one iframe then
    * it stores the different callbacks for different iframes based on the iframe's
    * id.
    */

    function storeCallback(eventName, callback, target_id) {
        if (target_id) {
            if (!eventCallbacks[target_id]) {
                eventCallbacks[target_id] = {};
            }
            eventCallbacks[target_id][eventName] = callback;
        } else {
            eventCallbacks[eventName] = callback;
        }
    }

    /**
    * Retrieves stored callbacks.
    */

    function getCallback(eventName, target_id) {
        if (target_id) {
            return eventCallbacks[target_id][eventName];
        } else {
            return eventCallbacks[eventName];
        }
    }

    function removeCallback(eventName, target_id) {
        if (target_id && eventCallbacks[target_id]) {
            if (!eventCallbacks[target_id][eventName]) {
                return false;
            }
            eventCallbacks[target_id][eventName] = null;
        } else {
            if (!eventCallbacks[eventName]) {
                return false;
            }
            eventCallbacks[eventName] = null;
        }

        return true;
    }

    /**
    * Returns a domain's root domain.
    * Eg. returns http://vimeo.com when http://vimeo.com/channels is sbumitted
    *
    * @param url (String): Url to test against.
    * @return url (String): Root domain of submitted url
    */

    function getDomainFromUrl(url) {
        var url_pieces = url.split('/'),
            domain_str = '';

        for (var i = 0, length = url_pieces.length; i < length; i++) {
            if (i < 3) {
                domain_str += url_pieces[i];
            } else {
                break;
            }
            if (i < 2) {
                domain_str += '/';
            }
        }

        return domain_str;
    }

    function isFunction(obj) {
        return !!(obj && obj.constructor && obj.call && obj.apply);
    }

    function isArray(obj) {
        return toString.call(obj) === '[object Array]';
    }

    // Give the init function the Froogaloop prototype for later instantiation
    Froogaloop.fn.init.prototype = Froogaloop.fn;

    // Listens for the message event.
    // W3C
    if (window.addEventListener) {
        window.addEventListener('message', onMessageReceived, false);
    }
        // IE
    else {
        window.attachEvent('onmessage', onMessageReceived, false);
    }

    // Expose froogaloop to the global object
    return (window.Froogaloop = Froogaloop);

})();

/* 
* flowplayer.js 3.2.6. The Flowplayer API
* 
* Copyright 2009-2011 Flowplayer Oy
* 
* This file is part of Flowplayer.
* 
* Flowplayer is free software: you can redistribute it and/or modify
* it under the terms of the GNU General Public License as published by
* the Free Software Foundation, either version 3 of the License, or
* (at your option) any later version.
* 
* Flowplayer is distributed in the hope that it will be useful,
* but WITHOUT ANY WARRANTY; without even the implied warranty of
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
* GNU General Public License for more details.
* 
* You should have received a copy of the GNU General Public License
* along with Flowplayer.  If not, see <http://www.gnu.org/licenses/>.
* 
* Date: 2011-02-04 05:45:28 -0500 (Fri, 04 Feb 2011)
* Revision: 614 
*/
(function () {

    function g(o) { console.log("$f.fireEvent", [].slice.call(o)) }

    function k(q) {
        if (!q || typeof q != "object") {
            return q
        }
        var o = new q.constructor();
        for (var p in q) {
            if (q.hasOwnProperty(p)) {
                o[p] = k(q[p])
            }
        }
        return o
    }

    function m(t, q) {
        if (!t) {
            return
        }
        var o, p = 0, r = t.length;
        if (r === undefined) {
            for (o in t) {
                if (q.call(t[o], o, t[o]) === false) {
                    break
                }
            }
        } else {
            for (var s = t[0]; p < r && q.call(s, p, s) !== false; s = t[++p]) {
            }
        }
        return t
    }

    function c(o) { return document.getElementById(o) }

    function i(q, p, o) {
        if (typeof p != "object") {
            return q
        }
        if (q && p) {
            m(p, function (r, s) {
                if (!o || typeof s != "function") {
                    q[r] = s
                }
            })
        }
        return q
    }

    function n(s) {
        var q = s.indexOf(".");
        if (q != -1) {
            var p = s.slice(0, q) || "*";
            var o = s.slice(q + 1, s.length);
            var r = [];
            m(document.getElementsByTagName(p), function () {
                if (this.className && this.className.indexOf(o) != -1) {
                    r.push(this)
                }
            });
            return r
        }
    }

    function f(o) {
        o = o || window.event;
        if (o.preventDefault) {
            o.stopPropagation();
            o.preventDefault()
        } else {
            o.returnValue = false;
            o.cancelBubble = true
        }
        return false
    }

    function j(q, o, p) {
        q[o] = q[o] || [];
        q[o].push(p)
    }

    function e() { return "_" + ("" + Math.random()).slice(2, 10) }

    var h = function (t, r, s) {
        var q = this, p = {}, u = {};
        q.index = r;
        if (typeof t == "string") {
            t = { url: t }
        }
        i(this, t, true);
        m(("Begin*,Start,Pause*,Resume*,Seek*,Stop*,Finish*,LastSecond,Update,BufferFull,BufferEmpty,BufferStop").split(","), function () {
            var v = "on" + this;
            if (v.indexOf("*") != -1) {
                v = v.slice(0, v.length - 1);
                var w = "onBefore" + v.slice(2);
                q[w] = function (x) {
                    j(u, w, x);
                    return q
                }
            }
            q[v] = function (x) {
                j(u, v, x);
                return q
            };
            if (r == -1) {
                if (q[w]) {
                    s[w] = q[w]
                }
                if (q[v]) {
                    s[v] = q[v]
                }
            }
        });
        i(this, {
            onCuepoint: function (x, w) {
                if (arguments.length == 1) {
                    p.embedded = [null, x];
                    return q
                }
                if (typeof x == "number") {
                    x = [x]
                }
                var v = e();
                p[v] = [x, w];
                if (s.isLoaded()) {
                    s._api().fp_addCuepoints(x, r, v)
                }
                return q
            },
            update: function (w) {
                i(q, w);
                if (s.isLoaded()) {
                    s._api().fp_updateClip(w, r)
                }
                var v = s.getConfig();
                var x = (r == -1) ? v.clip : v.playlist[r];
                i(x, w, true)
            },
            _fireEvent: function (v, y, w, A) {
                if (v == "onLoad") {
                    m(p, function (B, C) {
                        if (C[0]) {
                            s._api().fp_addCuepoints(C[0], r, B)
                        }
                    });
                    return false
                }
                A = A || q;
                if (v == "onCuepoint") {
                    var z = p[y];
                    if (z) {
                        return z[1].call(s, A, w)
                    }
                }
                if (y && "onBeforeBegin,onMetaData,onStart,onUpdate,onResume".indexOf(v) != -1) {
                    i(A, y);
                    if (y.metaData) {
                        if (!A.duration) {
                            A.duration = y.metaData.duration
                        } else {
                            A.fullDuration = y.metaData.duration
                        }
                    }
                }
                var x = true;
                m(u[v], function () { x = this.call(s, A, y, w) });
                return x
            }
        });
        if (t.onCuepoint) {
            var o = t.onCuepoint;
            q.onCuepoint.apply(q, typeof o == "function" ? [o] : o);
            delete t.onCuepoint
        }
        m(t, function (v, w) {
            if (typeof w == "function") {
                j(u, v, w);
                delete t[v]
            }
        });
        if (r == -1) {
            s.onCuepoint = this.onCuepoint
        }
    };
    var l = function (p, r, q, t) {
        var o = this, s = {}, u = false;
        if (t) {
            i(s, t)
        }
        m(r, function (v, w) {
            if (typeof w == "function") {
                s[v] = w;
                delete r[v]
            }
        });
        i(this, {
            animate: function (y, z, x) {
                if (!y) {
                    return o
                }
                if (typeof z == "function") {
                    x = z;
                    z = 500
                }
                if (typeof y == "string") {
                    var w = y;
                    y = {};
                    y[w] = z;
                    z = 500
                }
                if (x) {
                    var v = e();
                    s[v] = x
                }
                if (z === undefined) {
                    z = 500
                }
                r = q._api().fp_animate(p, y, z, v);
                return o
            },
            css: function (w, x) {
                if (x !== undefined) {
                    var v = {};
                    v[w] = x;
                    w = v
                }
                r = q._api().fp_css(p, w);
                i(o, r);
                return o
            },
            show: function () {
                this.display = "block";
                q._api().fp_showPlugin(p);
                return o
            },
            hide: function () {
                this.display = "none";
                q._api().fp_hidePlugin(p);
                return o
            },
            toggle: function () {
                this.display = q._api().fp_togglePlugin(p);
                return o
            },
            fadeTo: function (y, x, w) {
                if (typeof x == "function") {
                    w = x;
                    x = 500
                }
                if (w) {
                    var v = e();
                    s[v] = w
                }
                this.display = q._api().fp_fadeTo(p, y, x, v);
                this.opacity = y;
                return o
            },
            fadeIn: function (w, v) { return o.fadeTo(1, w, v) },
            fadeOut: function (w, v) { return o.fadeTo(0, w, v) },
            getName: function () { return p },
            getPlayer: function () { return q },
            _fireEvent: function (w, v, x) {
                if (w == "onUpdate") {
                    var z = q._api().fp_getPlugin(p);
                    if (!z) {
                        return
                    }
                    i(o, z);
                    delete o.methods;
                    if (!u) {
                        m(z.methods, function () {
                            var B = "" + this;
                            o[B] = function () {
                                var C = [].slice.call(arguments);
                                var D = q._api().fp_invoke(p, B, C);
                                return D === "undefined" || D === undefined ? o : D
                            }
                        });
                        u = true
                    }
                }
                var A = s[w];
                if (A) {
                    var y = A.apply(o, v);
                    if (w.slice(0, 1) == "_") {
                        delete s[w]
                    }
                    return y
                }
                return o
            }
        })
    };

    function b(q, G, t) {
        var w = this, v = null, D = false, u, s, F = [], y = {}, x = {}, E, r, p, C, o, A;
        i(w, {
            id: function () { return E }, isLoaded: function () { return (v !== null && v.fp_play !== undefined && !D) }, getParent: function () { return q },
            hide: function (H) {
                if (H) {
                    q.style.height = "0px"
                }
                if (w.isLoaded()) {
                    v.style.height = "0px"
                }
                return w
            },
            show: function () {
                q.style.height = A + "px";
                if (w.isLoaded()) {
                    v.style.height = o + "px"
                }
                return w
            },
            isHidden: function () { return w.isLoaded() && parseInt(v.style.height, 10) === 0 },
            load: function (J) {
                if (!w.isLoaded() && w._fireEvent("onBeforeLoad") !== false) {
                    var H = function () {
                        u = q.innerHTML;
                        if (u && !flashembed.isSupported(G.version)) {
                            q.innerHTML = ""
                        }
                        if (J) {
                            J.cached = true;
                            j(x, "onLoad", J)
                        }
                        flashembed(q, G, { config: t })
                    };
                    var I = 0;
                    m(a, function () {
                        this.unload(function (K) {
                            if (++I == a.length) {
                                H()
                            }
                        })
                    })
                }
                return w
            },
            unload: function (J) {
                if (this.isFullscreen() && /WebKit/i.test(navigator.userAgent)) {
                    if (J) {
                        J(false)
                    }
                    return w
                }
                if (u.replace(/\s/g, "") !== "") {
                    if (w._fireEvent("onBeforeUnload") === false) {
                        if (J) {
                            J(false)
                        }
                        return w
                    }
                    D = true;
                    try {
                        if (v) {
                            v.fp_close();
                            w._fireEvent("onUnload")
                        }
                    } catch (H) {
                    }
                    var I = function () {
                        v = null;
                        q.innerHTML = u;
                        D = false;
                        if (J) {
                            J(true)
                        }
                    };
                    setTimeout(I, 50)
                } else {
                    if (J) {
                        J(false)
                    }
                }
                return w
            },
            getClip: function (H) {
                if (H === undefined) {
                    H = C
                }
                return F[H]
            },
            getCommonClip: function () { return s },
            getPlaylist: function () { return F },
            getPlugin: function (H) {
                var J = y[H];
                if (!J && w.isLoaded()) {
                    var I = w._api().fp_getPlugin(H);
                    if (I) {
                        J = new l(H, I, w);
                        y[H] = J
                    }
                }
                return J
            },
            getScreen: function () { return w.getPlugin("screen") },
            getControls: function () { return w.getPlugin("controls")._fireEvent("onUpdate") },
            getLogo: function () {
                try {
                    return w.getPlugin("logo")._fireEvent("onUpdate")
                } catch (H) {
                }
            },
            getPlay: function () { return w.getPlugin("play")._fireEvent("onUpdate") },
            getConfig: function (H) { return H ? k(t) : t },
            getFlashParams: function () { return G },
            loadPlugin: function (K, J, M, L) {
                if (typeof M == "function") {
                    L = M;
                    M = {}
                }
                var I = L ? e() : "_";
                w._api().fp_loadPlugin(K, J, M, I);
                var H = {};
                H[I] = L;
                var N = new l(K, null, w, H);
                y[K] = N;
                return N
            },
            getState: function () { return w.isLoaded() ? v.fp_getState() : -1 },
            play: function (I, H) {
                var J = function () {
                    if (I !== undefined) {
                        w._api().fp_play(I, H)
                    } else {
                        w._api().fp_play()
                    }
                };
                if (w.isLoaded()) {
                    J()
                } else {
                    if (D) {
                        setTimeout(function () { w.play(I, H) }, 50)
                    } else {
                        w.load(function () { J() })
                    }
                }
                return w
            },
            getVersion: function () {
                var I = "flowplayer.js 3.2.6";
                if (w.isLoaded()) {
                    var H = v.fp_getVersion();
                    H.push(I);
                    return H
                }
                return I
            },
            _api: function () {
                if (!w.isLoaded()) {
                    throw "Flowplayer " + w.id() + " not loaded when calling an API method"
                }
                return v
            },
            setClip: function (H) {
                w.setPlaylist([H]);
                return w
            },
            getIndex: function () { return p },
            _swfHeight: function () { return v.clientHeight }
        });
        m(("Click*,Load*,Unload*,Keypress*,Volume*,Mute*,Unmute*,PlaylistReplace,ClipAdd,Fullscreen*,FullscreenExit,Error,MouseOver,MouseOut").split(","), function () {
            var H = "on" + this;
            if (H.indexOf("*") != -1) {
                H = H.slice(0, H.length - 1);
                var I = "onBefore" + H.slice(2);
                w[I] = function (J) {
                    j(x, I, J);
                    return w
                }
            }
            w[H] = function (J) {
                j(x, H, J);
                return w
            }
        });
        m(("pause,resume,mute,unmute,stop,toggle,seek,getStatus,getVolume,setVolume,getTime,isPaused,isPlaying,startBuffering,stopBuffering,isFullscreen,toggleFullscreen,reset,close,setPlaylist,addClip,playFeed,setKeyboardShortcutsEnabled,isKeyboardShortcutsEnabled").split(","), function () {
            var H = this;
            w[H] = function (J, I) {
                if (!w.isLoaded()) {
                    return w
                }
                var K = null;
                if (J !== undefined && I !== undefined) {
                    K = v["fp_" + H](J, I)
                } else {
                    K = (J === undefined) ? v["fp_" + H]() : v["fp_" + H](J)
                }
                return K === "undefined" || K === undefined ? w : K
            }
        });
        w._fireEvent = function (Q) {
            if (typeof Q == "string") {
                Q = [Q]
            }
            var R = Q[0], O = Q[1], M = Q[2], L = Q[3], K = 0;
            if (t.debug) {
                g(Q)
            }
            if (!w.isLoaded() && R == "onLoad" && O == "player") {
                v = v || c(r);
                o = w._swfHeight();
                m(F, function () { this._fireEvent("onLoad") });
                m(y, function (S, T) { T._fireEvent("onUpdate") });
                s._fireEvent("onLoad")
            }
            if (R == "onLoad" && O != "player") {
                return
            }
            if (R == "onError") {
                if (typeof O == "string" || (typeof O == "number" && typeof M == "number")) {
                    O = M;
                    M = L
                }
            }
            if (R == "onContextMenu") {
                m(t.contextMenu[O], function (S, T) { T.call(w) });
                return
            }
            if (R == "onPluginEvent" || R == "onBeforePluginEvent") {
                var H = O.name || O;
                var I = y[H];
                if (I) {
                    I._fireEvent("onUpdate", O);
                    return I._fireEvent(M, Q.slice(3))
                }
                return
            }
            if (R == "onPlaylistReplace") {
                F = [];
                var N = 0;
                m(O, function () { F.push(new h(this, N++, w)) })
            }
            if (R == "onClipAdd") {
                if (O.isInStream) {
                    return
                }
                O = new h(O, M, w);
                F.splice(M, 0, O);
                for (K = M + 1; K < F.length; K++) {
                    F[K].index++
                }
            }
            var P = true;
            if (typeof O == "number" && O < F.length) {
                C = O;
                var J = F[O];
                if (J) {
                    P = J._fireEvent(R, M, L)
                }
                if (!J || P !== false) {
                    P = s._fireEvent(R, M, L, J)
                }
            }
            m(x[R], function () {
                P = this.call(w, O, M);
                if (this.cached) {
                    x[R].splice(K, 1)
                }
                if (P === false) {
                    return false
                }
                K++
            });
            return P
        };

        function B() {
            if ($f(q)) {
                $f(q).getParent().innerHTML = "";
                p = $f(q).getIndex();
                a[p] = w
            } else {
                a.push(w);
                p = a.length - 1
            }
            A = parseInt(q.style.height, 10) || q.clientHeight;
            E = q.id || "fp" + e();
            r = G.id || E + "_api";
            G.id = r;
            t.playerId = E;
            if (typeof t == "string") {
                t = { clip: { url: t } }
            }
            if (typeof t.clip == "string") {
                t.clip = { url: t.clip }
            }
            t.clip = t.clip || {};
            if (q.getAttribute("href", 2) && !t.clip.url) {
                t.clip.url = q.getAttribute("href", 2)
            }
            s = new h(t.clip, -1, w);
            t.playlist = t.playlist || [t.clip];
            var I = 0;
            m(t.playlist, function () {
                var K = this;
                if (typeof K == "object" && K.length) {
                    K = { url: "" + K }
                }
                m(t.clip, function (L, M) {
                    if (M !== undefined && K[L] === undefined && typeof M != "function") {
                        K[L] = M
                    }
                });
                t.playlist[I] = K;
                K = new h(K, I, w);
                F.push(K);
                I++
            });
            m(t, function (K, L) {
                if (typeof L == "function") {
                    if (s[K]) {
                        s[K](L)
                    } else {
                        j(x, K, L)
                    }
                    delete t[K]
                }
            });
            m(t.plugins, function (K, L) {
                if (L) {
                    y[K] = new l(K, L, w)
                }
            });
            if (!t.plugins || t.plugins.controls === undefined) {
                y.controls = new l("controls", null, w)
            }
            y.canvas = new l("canvas", null, w);
            u = q.innerHTML;

            function J(L) {
                var K = w.hasiPadSupport && w.hasiPadSupport();
                if (/iPad|iPhone|iPod/i.test(navigator.userAgent) && !/.flv$/i.test(F[0].url) && !K) {
                    return true
                }
                if (!w.isLoaded() && w._fireEvent("onBeforeClick") !== false) {
                    w.load()
                }
                return f(L)
            }

            function H() {
                if (u.replace(/\s/g, "") !== "") {
                    if (q.addEventListener) {
                        q.addEventListener("click", J, false)
                    } else {
                        if (q.attachEvent) {
                            q.attachEvent("onclick", J)
                        }
                    }
                } else {
                    if (q.addEventListener) {
                        q.addEventListener("click", f, false)
                    }
                    w.load()
                }
            }

            setTimeout(H, 0)
        }

        if (typeof q == "string") {
            var z = c(q);
            if (!z) {
                throw "Flowplayer cannot access element: " + q
            }
            q = z;
            B()
        } else {
            B()
        }
    }

    var a = [];

    function d(o) {
        this.length = o.length;
        this.each = function (p) { m(o, p) };
        this.size = function () { return o.length }
    }

    window.flowplayer = window.$f = function () {
        var p = null;
        var o = arguments[0];
        if (!arguments.length) {
            m(a, function () {
                if (this.isLoaded()) {
                    p = this;
                    return false
                }
            });
            return p || a[0]
        }
        if (arguments.length == 1) {
            if (typeof o == "number") {
                return a[o]
            } else {
                if (o == "*") {
                    return new d(a)
                }
                m(a, function () {
                    if (this.id() == o.id || this.id() == o || this.getParent() == o) {
                        p = this;
                        return false
                    }
                });
                return p
            }
        }
        if (arguments.length > 1) {
            var t = arguments[1], q = (arguments.length == 3) ? arguments[2] : {};
            if (typeof t == "string") {
                t = { src: t }
            }
            t = i({ bgcolor: "#000000", version: [9, 0], expressInstall: "http://static.flowplayer.org/swf/expressinstall.swf", cachebusting: false }, t);
            if (typeof o == "string") {
                if (o.indexOf(".") != -1) {
                    var s = [];
                    m(n(o), function () { s.push(new b(this, k(t), k(q))) });
                    return new d(s)
                } else {
                    var r = c(o);
                    return new b(r !== null ? r : o, t, q)
                }
            } else {
                if (o) {
                    return new b(o, t, q)
                }
            }
        }
        return null
    };
    i(window.$f, {
        fireEvent: function () {
            var o = [].slice.call(arguments);
            var q = $f(o[0]);
            return q ? q._fireEvent(o.slice(1)) : null
        },
        addPlugin: function (o, p) {
            b.prototype[o] = p;
            return $f
        },
        each: m,
        extend: i
    });
    if (typeof jQuery == "function") {
        jQuery.fn.flowplayer = function (q, p) {
            if (!arguments.length || typeof arguments[0] == "number") {
                var o = [];
                this.each(function () {
                    var r = $f(this);
                    if (r) {
                        o.push(r)
                    }
                });
                return arguments.length ? o[arguments[0]] : new d(o)
            }
            return this.each(function () { $f(this, k(q), p ? k(p) : {}) })
        }
    }
})();
(function () {
    var e = typeof jQuery == "function";
    var i = { width: "100%", height: "100%", allowfullscreen: true, allowscriptaccess: "always", quality: "high", version: null, onFail: null, expressInstall: null, w3c: false, cachebusting: false };
    if (e) {
        jQuery.tools = jQuery.tools || {};
        jQuery.tools.flashembed = { version: "1.0.4", conf: i }
    }

    function j() {
        if (c.done) {
            return false
        }
        var l = document;
        if (l && l.getElementsByTagName && l.getElementById && l.body) {
            clearInterval(c.timer);
            c.timer = null;
            for (var k = 0; k < c.ready.length; k++) {
                c.ready[k].call()
            }
            c.ready = null;
            c.done = true
        }
    }

    var c = e ? jQuery : function (k) {
        if (c.done) {
            return k()
        }
        if (c.timer) {
            c.ready.push(k)
        } else {
            c.ready = [k];
            c.timer = setInterval(j, 13)
        }
    };

    function f(l, k) {
        if (k) {
            for (key in k) {
                if (k.hasOwnProperty(key)) {
                    l[key] = k[key]
                }
            }
        }
        return l
    }

    function g(k) {
        switch (h(k)) {
            case "string":
                k = k.replace(new RegExp('(["\\\\])', "g"), "\\$1");
                k = k.replace(/^\s?(\d+)%/, "$1pct");
                return '"' + k + '"';
            case "array":
                return "[" + b(k, function (n) { return g(n) }).join(",") + "]";
            case "function":
                return '"function()"';
            case "object":
                var l = [];
                for (var m in k) {
                    if (k.hasOwnProperty(m)) {
                        l.push('"' + m + '":' + g(k[m]))
                    }
                }
                return "{" + l.join(",") + "}"
        }
        return String(k).replace(/\s/g, " ").replace(/\'/g, '"')
    }

    function h(l) {
        if (l === null || l === undefined) {
            return false
        }
        var k = typeof l;
        return (k == "object" && l.push) ? "array" : k
    }

    if (window.attachEvent) {
        window.attachEvent("onbeforeunload", function () {
            __flash_unloadHandler = function () {
            };
            __flash_savedUnloadHandler = function () {
            }
        })
    }

    function b(k, n) {
        var m = [];
        for (var l in k) {
            if (k.hasOwnProperty(l)) {
                m[l] = n(k[l])
            }
        }
        return m
    }

    function a(r, t) {
        var q = f({}, r);
        var s = document.all;
        var n = '<object width="' + q.width + '" height="' + q.height + '"';
        if (s && !q.id) {
            q.id = "_" + ("" + Math.random()).substring(9)
        }
        if (q.id) {
            n += ' id="' + q.id + '"'
        }
        if (q.cachebusting) {
            q.src += ((q.src.indexOf("?") != -1 ? "&" : "?") + Math.random())
        }
        if (q.w3c || !s) {
            n += ' data="' + q.src + '" type="application/x-shockwave-flash"'
        } else {
            n += ' classid="clsid:D27CDB6E-AE6D-11cf-96B8-444553540000"'
        }
        n += ">";
        if (q.w3c || s) {
            n += '<param name="movie" value="' + q.src + '" />'
        }
        q.width = q.height = q.id = q.w3c = q.src = null;
        for (var l in q) {
            if (q[l] !== null) {
                n += '<param name="' + l + '" value="' + q[l] + '" />'
            }
        }
        var o = "";
        if (t) {
            for (var m in t) {
                if (t[m] !== null) {
                    o += m + "=" + (typeof t[m] == "object" ? g(t[m]) : t[m]) + "&"
                }
            }
            o = o.substring(0, o.length - 1);
            n += '<param name="flashvars" value=\'' + o + "' />"
        }
        n += "</object>";
        return n
    }

    function d(m, p, l) {
        var k = flashembed.getVersion();
        f(this, { getContainer: function () { return m }, getConf: function () { return p }, getVersion: function () { return k }, getFlashvars: function () { return l }, getApi: function () { return m.firstChild }, getHTML: function () { return a(p, l) } });
        var q = p.version;
        var r = p.expressInstall;
        var o = !q || flashembed.isSupported(q);
        if (o) {
            p.onFail = p.version = p.expressInstall = null;
            m.innerHTML = a(p, l)
        } else {
            if (q && r && flashembed.isSupported([6, 65])) {
                f(p, { src: r });
                l = { MMredirectURL: location.href, MMplayerType: "PlugIn", MMdoctitle: document.title };
                m.innerHTML = a(p, l)
            } else {
                if (m.innerHTML.replace(/\s/g, "") !== "") {
                } else {
                    m.innerHTML = "<h2>Flash version " + q + " or greater is required</h2><h3>" + (k[0] > 0 ? "Your version is " + k : "You have no flash plugin installed") + "</h3>" + (m.tagName == "A" ? "<p>Click here to download latest version</p>" : "<p>Download latest version from <a href='http://www.adobe.com/go/getflashplayer'>here</a></p>");
                    if (m.tagName == "A") {
                        m.onclick = function () { location.href = "http://www.adobe.com/go/getflashplayer" }
                    }
                }
            }
        }
        if (!o && p.onFail) {
            var n = p.onFail.call(this);
            if (typeof n == "string") {
                m.innerHTML = n
            }
        }
        if (document.all) {
            window[p.id] = document.getElementById(p.id)
        }
    }

    window.flashembed = function (l, m, k) {
        if (typeof l == "string") {
            var n = document.getElementById(l);
            if (n) {
                l = n
            } else {
                c(function () { flashembed(l, m, k) });
                return
            }
        }
        if (!l) {
            return
        }
        if (typeof m == "string") {
            m = { src: m }
        }
        var o = f({}, i);
        f(o, m);
        return new d(l, o, k)
    };
    f(window.flashembed, {
        getVersion: function () {
            var m = [0, 0];
            if (navigator.plugins && typeof navigator.plugins["Shockwave Flash"] == "object") {
                var l = navigator.plugins["Shockwave Flash"].description;
                if (typeof l != "undefined") {
                    l = l.replace(/^.*\s+(\S+\s+\S+$)/, "$1");
                    var n = parseInt(l.replace(/^(.*)\..*$/, "$1"), 10);
                    var r = /r/.test(l) ? parseInt(l.replace(/^.*r(.*)$/, "$1"), 10) : 0;
                    m = [n, r]
                }
            } else {
                if (window.ActiveXObject) {
                    try {
                        var p = new ActiveXObject("ShockwaveFlash.ShockwaveFlash.7")
                    } catch (q) {
                        try {
                            p = new ActiveXObject("ShockwaveFlash.ShockwaveFlash.6");
                            m = [6, 0];
                            p.AllowScriptAccess = "always"
                        } catch (k) {
                            if (m[0] == 6) {
                                return m
                            }
                        }
                        try {
                            p = new ActiveXObject("ShockwaveFlash.ShockwaveFlash")
                        } catch (o) {
                        }
                    }
                    if (typeof p == "object") {
                        l = p.GetVariable("$version");
                        if (typeof l != "undefined") {
                            l = l.replace(/^\S+\s+(.*)$/, "$1").split(",");
                            m = [parseInt(l[0], 10), parseInt(l[2], 10)]
                        }
                    }
                }
            }
            return m
        },
        isSupported: function (k) {
            var m = flashembed.getVersion();
            var l = (m[0] > k[0]) || (m[0] == k[0] && m[1] >= k[1]);
            return l
        },
        domReady: c,
        asString: g,
        getHTML: a
    });
    if (e) {
        jQuery.fn.flashembed = function (l, k) {
            var m = null;
            this.each(function () { m = flashembed(this, l, k) });
            return l.api === false ? this : m
        }
    }
})();