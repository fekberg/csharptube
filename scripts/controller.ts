///<reference path="typings/jquery/jquery.d.ts" />
declare var player: any;
declare var lunr: any;
declare var videos: any;
declare var tmpl: any;
module csharptube {
    export class Database {
        private _index: Index;
        private _videos: Array<any>;
        private _pages: Array<Array<any>>;
        private _tags: { [name: string]: number };

        constructor(videos: Array<any>) {
            this._index = new Index(videos);
            this._tags = {};
            for (var i = 0; i < videos.length; i++) {
                if (videos[i].Tags) {
                    for (var t = 0; t < videos[i].Tags.length; t++) {
                        var tag: string = <string>videos[i].Tags[t];
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

        private InitializeTags(): void {
            var tags = Object.keys(this._tags).sort((a, b) => { return -(this._tags[a] - this._tags[b]); });
            var template = tmpl("taglist", { Tags: tags });
            $("#sidebar").append(template);
        }

        private WireUpUI(): void {
            window.onhashchange = () => {
                this.Navigate(window.location.hash);
            };

            $(document).on("click", "#search", (e) => {
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
        }

        private Navigate(hash: string): void {
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
        }

        private ClearMain(): void {
            $("#contents").children().remove();
        }

        private Watch(video: Video): void {
            this.ClearMain();
            $("#contents").append(tmpl("watch", video));
            player.play(video.Video);
        }

        private ShowHome(): void {
            var results = Enumerable.from(videos).reverse().take(30).toArray();
            this.ClearMain();
            var template = tmpl("homeresults", { Results: results });
            $("#contents").append(template);
        }

        private ShowResults(terms: string, results: any): void {
            var template = tmpl("searchresults", { Results: results, Query: terms });
            this.ClearMain();
            $("#contents").append(template);
        }

        private Search(terms: string): Array<Video> {
            var indexResults = this._index.Search(terms);
            var results = new Array<Video>();
            for (var i = 0; i < indexResults.length; i++) {
                var result: Result = indexResults[i];
                var index: number = parseInt(result.ref);
                results.push(videos[index]);
            }
            return results;
        }
    }

    class Index {
        private _index: any;

        constructor(videos: Array<any>) {
            this._index = lunr(function () {
                this.field("Title", { boost: 10 });
                this.field("Description");
                this.field("Tags", { boost: 100 });
            });

            this.InitializeIndex(videos);
        }

        private InitializeIndex(videos: Array<any>): void {
            for (var i = 0; i < videos.length; i++) {
                var video = videos[i];
                //add an index - not sure if this is necessary
                video["id"] = i;
                video["UrlTitle"] = video.Title.replace(/[^A-Za-z0-9_\-\s]/g, "");
                video.UrlTitle = video.UrlTitle.replace(/\s+/g, "-").trim().toLowerCase();
                while (video.UrlTitle.indexOf("--") !== -1) video.UrlTitle = video.UrlTitle.replace("--", "-");

                this._index.add(video);
            }
        }

        public Search(terms: string): Array<Result> {
            return this._index.search(terms);
        }
    }

    class Result {
        public ref: string;
        public score: number;
    }

    class Video {
        public Title: string;
        public Description: string;
        public Author: string;
        public Tags: Array<string>;
        public Video: string;
    }
}