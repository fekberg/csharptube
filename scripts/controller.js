///<reference path="typings/jquery/jquery.d.ts" />

var csharptube;
(function (csharptube) {
    var Database = (function () {
        function Database(videos) {
            this._index = new Index(videos);
            this._tags = {};
            for (var i = 0; i < videos.length; i++) {
                if (videos[i].Tags) {
                    for (var t = 0; t < videos[i].Tags.length; t++) {
                        var tag = videos[i].Tags[t];
                        if (!this._tags[tag]) {
                            this._tags[tag] = 0;
                        }
                        this._tags[tag] += 1;
                    }
                }
            }

            //sort by tags
            this.InitializeTags();
            this.WireUpUI();
        }
        Database.prototype.InitializeTags = function () {
            var _this = this;
            var tags = Object.keys(this._tags).sort(function (a, b) {
                return -(_this._tags[a] - _this._tags[b]);
            });
            var template = tmpl("taglist", { Tags: tags });
            $("#sidebar").append(template);
        };

        Database.prototype.WireUpUI = function () {
            var _this = this;
            window.onhashchange = function () {
                _this.Navigate(window.location.hash);
            };

            $(document).on("click", "#search", function (e) {
                e.preventDefault();
                var terms = $("#q").val();
                window.location.hash = "/search/" + terms.replace("/", "+").replace(" ", "+");
            });

            //initialize view with recent data
            this.ShowHome();

            //check location for hash
            if (window.location.hash) {
                this.Navigate(window.location.hash);
            }
        };

        Database.prototype.Navigate = function (hash) {
            if (hash) {
                var parts = hash.split('/');
                switch (parts[1]) {
                    case "watch":
                        this.Watch(videos[parseInt(parts[2])]);
                        break;
                    case "search":
                    case "tags":
                        var terms = parts[2].replace("+", " ");
                        var results = this.Search(terms);
                        this.ShowResults(terms, results);
                        break;
                    case "":
                    case null:
                        console.log("home");
                        break;
                }
            } else {
                this.ShowHome();
            }
        };

        Database.prototype.ClearMain = function () {
            $("#contents").children().remove();
        };

        Database.prototype.Watch = function (video) {
            this.ClearMain();
            $("#contents").append(tmpl("watch", video));
            player.play(video.Video);
        };

        Database.prototype.ShowHome = function () {
            var results = Enumerable.from(videos).reverse().take(30).toArray();
            this.ClearMain();
            var template = tmpl("homeresults", { Results: results });
            $("#contents").append(template);
        };

        Database.prototype.ShowResults = function (terms, results) {
            var template = tmpl("searchresults", { Results: results, Query: terms });
            this.ClearMain();
            $("#contents").append(template);
        };

        Database.prototype.Search = function (terms) {
            var indexResults = this._index.Search(terms);
            var results = new Array();
            for (var i = 0; i < indexResults.length; i++) {
                var result = indexResults[i];
                var index = parseInt(result.ref);
                results.push(videos[index]);
            }
            return results;
        };
        return Database;
    })();
    csharptube.Database = Database;

    var Index = (function () {
        function Index(videos) {
            this._index = lunr(function () {
                this.field("Title", { boost: 10 });
                this.field("Description");
                this.field("Tags", { boost: 100 });
            });

            this.InitializeIndex(videos);
        }
        Index.prototype.InitializeIndex = function (videos) {
            for (var i = 0; i < videos.length; i++) {
                var video = videos[i];

                //add an index - not sure if this is necessary
                video["id"] = i;
                video["UrlTitle"] = video.Title.replace(/[^A-Za-z0-9_\-\s]/g, "");
                video.UrlTitle = video.UrlTitle.replace(/\s+/g, "-").trim().toLowerCase();
                while (video.UrlTitle.indexOf("--") !== -1)
                    video.UrlTitle = video.UrlTitle.replace("--", "-");

                this._index.add(video);
            }
        };

        Index.prototype.Search = function (terms) {
            return this._index.search(terms);
        };
        return Index;
    })();

    var Result = (function () {
        function Result() {
        }
        return Result;
    })();

    var Video = (function () {
        function Video() {
        }
        return Video;
    })();
})(csharptube || (csharptube = {}));
//# sourceMappingURL=controller.js.map
