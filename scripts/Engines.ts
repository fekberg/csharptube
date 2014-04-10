class engines {
    private _engines: { [id: string]: any };

    constructor() {
        this._engines = {};
    }

    public add(name: string, object: any): void {
        this._engines[name] = object;
    }

    public execute(name: string, template: string, model: any): any {
        this._engines[name].template(template, model);
    }
}