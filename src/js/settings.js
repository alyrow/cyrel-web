class Settings {
    #conf = {}

    constructor() {
        Config.loadConfig("settings", async settings => {
            console.log(settings);
            let needSync = false;
            let needReload = false;
            await new Promise(resolve => {
                Api.backend.client_configs_get(async success => {
                    for (const group of settings) {
                        for (const s of group.settings) {
                            this.#conf[s.path] = {};
                            if (success && success[s.path]) {
                                const distConf = success[s.path];
                                const localConf = {conf: localStorage.getItem(s.path), time: parseInt(localStorage.getItem(`${s.path}|time`))};
                                if (localConf.conf === null || isNaN(localConf.time)) localConf.time = 0;
                                if (distConf.time > localConf.time) {
                                    localStorage.setItem(s.path, distConf.conf);
                                    localStorage.setItem(`${s.path}|time`, distConf.time);
                                    this.#conf[s.path] = distConf;
                                    needReload = true;
                                } else if (distConf.time < localConf.time) {
                                    this.#conf[s.path] = localConf;
                                    needSync = true;
                                } else this.#conf[s.path] = localConf;
                            } else {
                                const localConf = {conf: localStorage.getItem(s.path), time: parseInt(localStorage.getItem(`${s.path}|time`))};
                                if (isNaN(localConf.time)) {
                                    localConf.time = await new Promise((resolve => Api.backend.time(time => resolve(new Date(time).valueOf()))));
                                    localStorage.setItem(`${s.path}|time`, localConf.time.toString());
                                }
                                if (localConf.conf === null) {
                                    s.value.forEach(val => {if (val.default) localConf.conf = val.data});
                                    localStorage.setItem(s.path, localConf.conf);
                                    needReload = true;
                                }
                                this.#conf[s.path] = localConf;
                                needSync = true;
                            }
                        }
                    }
                    resolve();
                }, err => console.error(err));
            });
            if (needSync) Api.backend.client_configs_set(this.#conf, () => {if (needReload) document.location.reload();}, err => console.error(err));
            if (!needSync && needReload) document.location.reload();
        });
    }

    get config() {
        return this.#conf;
    }

    getConfig(key) {
        return this.#conf[key].conf;
    }

    setConfig(key, value) {
        return new Promise(resolve => {
            this.#conf[key].conf = value;
            localStorage.setItem(key, value);
            Api.backend.time(time => {
                this.#conf[key].time = new Date(time).valueOf();
                localStorage.setItem(`${key}|time`, new Date(time).valueOf().toString());
                Api.backend.client_configs_set(this.#conf, () => resolve(), err => console.error(err));
            });
        });
    }

    static self;
}

Settings.self = new Settings();
