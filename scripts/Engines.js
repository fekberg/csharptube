var engines = (function () {
    function engines() {
        this._engines = {};
    }
    engines.prototype.add = function (name, object) {
        this._engines[name] = object;
    };

    engines.prototype.execute = function (name, template, model) {
        this._engines[name].template(template, model);
    };
    return engines;
})();
//# sourceMappingURL=Engines.js.map
