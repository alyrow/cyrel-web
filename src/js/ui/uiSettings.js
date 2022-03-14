class UiSettings {
    static createSetting(cat) {
        const name = cat.name;
        const root = document.createElement("div");
        root.style.display = "none";
        root.id = `s-${name}`;
        for (let setting of cat.settings) {
            switch (setting.type) {
                case "dropdown": {
                    const element = document.createElement("div");
                    const title = document.createElement("h3");
                    title.style.display = "inline";
                    title.innerText = setting.name;
                    element.appendChild(title);
                    const dropdown = document.createElement("select");
                    dropdown.classList.add("ui", "selection", "dropdown", "inline");
                    dropdown.id = `dropdown-${setting.path}`;

                    setTimeout(() => {
                        const j = $(`#dropdown-${setting.path}`);
                        let enabled = false;
                        j.dropdown({
                            onChange: value => {
                                if (!enabled) return;
                                console.log(value);
                                Settings.self.setConfig(setting.path, value).then(r => {
                                    $('body')
                                        .toast({
                                            class: 'info',
                                            displayTime: 0,
                                            message: `Il est surement nécessaire de recharger la page pour appliquer les modifications.`
                                        });
                                });
                            }
                        });
                        j.dropdown('set selected', localStorage.getItem(setting.path));
                        enabled = true;
                    }, 0);

                    for (let val of setting.value) {
                        const e = document.createElement("option");
                        e.value = val.data;
                        e.innerText = val.name;
                        dropdown.appendChild(e);
                    }
                    element.appendChild(dropdown);
                    root.appendChild(element);
                    break;
                }
                default: {
                    console.error(`Unknown setting type "${setting.type}"`);
                    break
                }
            }
        }
        document.getElementById("scontent").appendChild(root);
    }

    static showSetting(name) {
        for (let child of document.getElementById("smenu").children) {
            if (child.id === `i-${name}`) child.classList.add("active", "blue");
            else child.classList.remove("active", "blue");
        }
        document.getElementById("stitle").innerText = name;
        for (let child of document.getElementById("scontent").children) {
            if (child.id === `s-${name}`) child.style.display = "block";
            else child.style.display = "none";
        }
    }
}

UiCore.registerTag("settings-categories", element => {
    Config.loadConfig("settings", conf => {
        new Template("settings-categories", {categories: conf}, element, () => {
            for (let cat of conf) {
                UiSettings.createSetting(cat);
            }
            UiSettings.showSetting(conf[0].name);
        });
    });

});

