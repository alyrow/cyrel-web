function test() {
    return "Hello World!"
}


class UiCore {
    static customTags = [];

    static get mobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|SamsungBrowser/i.test(navigator.userAgent);
    }

    static get dark() {
        return localStorage.getItem("dark") === "1";
    }

    /**
     * Register a custom tag
     * @type {(tagName: string, tagManager: function) => void}
     * @param tagName Name of the tag
     * @param tagManager Function which will apply code to custom tags
     */
    static registerTag(tagName, tagManager) {
        const tags = document.getElementsByTagName(tagName);
        for (let tag of tags) {
            tagManager(tag);
        }
        this.customTags.push({tagName: tagName, tagManager: tagManager});
    }

    /**
     * Add an element in another element
     * @type {(parent: HTMLElement, element: HTMLElement) => void}
     * @param parent The parent element to append child
     * @param element The child to add
     */
    static appendChild(parent, element) {
        const tagName = element.tagName.toLowerCase();
        this.customTags.forEach(customTag => {
            if (customTag.tagName.toLowerCase() === tagName) customTag.tagManager(element);
        });
        parent.appendChild(element);
    }

    static setDarkAutoDestruct() {
        MutationObserver = window.MutationObserver || window.WebKitMutationObserver;

        const observer = new MutationObserver(function (mutations, observer) {
            const recursive = (node) => {
                if (node.classList.contains("ui") && !node.classList.contains("inverted")) node.classList.add("inverted");
                for (let i = 0; i < node.children.length; i++) {
                    recursive(node.children[i]);
                }
            }
            mutations.forEach(mutation => {
                try {
                    mutation.addedNodes.forEach(node => {
                        try {
                            if (node.classList.contains("ui") && !node.classList.contains("inverted")) {
                                node.classList.add("inverted");
                            } else if (node.classList.contains("pusher"))
                                node.style.background = "#080808";
                            recursive(node);
                        } catch (e) {
                        }
                    });
                } catch (e) {
                }
            });
        });

        observer.observe(document, {
            subtree: true,
            childList: true
        });

        window.addEventListener("load", () => {
            document.body.style.background = "#080808";
            document.children[0].style.background = "#080808";
            const recursive = (node) => {
                if (node.classList.contains("ui") && !node.classList.contains("inverted")) node.classList.add("inverted");
                for (let i = 0; i < node.children.length; i++) {
                    recursive(node.children[i]);
                }
            }
            recursive(document.body);
        });
        UiCore.setDarkAutoDestruct = null;
    }

    static switchTheme() {
        const p = UiCore.dark ? Settings.self.setConfig("dark", "0") : Settings.self.setConfig("dark", "1");
        p.then(() => document.location.reload());
    }

    static translateError(err) {
        const errors = Config.getConfig("errors");
        const keys = Object.keys(errors);
        for (let i = 0; i < keys.length; i++) {
            // console.log(errors[keys[i]].code + "   " + err.code)
            if (errors[keys[i]].code === err.code) return errors[keys[i]].message;
        }
        return err.message;
    }
}

if (UiCore.dark) UiCore.setDarkAutoDestruct();

window.addEventListener("load", () => {
    if ("serviceWorker" in navigator) {
        navigator.serviceWorker.register("service-worker.js");

        const getPermission = async () => {
            const status = await navigator.permissions.query({
                name: 'periodic-background-sync',
            });
            return status.state === 'granted';
        };

        const registerPeriodicBackgroundSync = async () => {
            const registration = await navigator.serviceWorker.ready;
            try {
                registration.periodicSync.register('update-cache', {
                    minInterval: 10 * 3600 * 1000,
                });
            } catch (err) {
                console.error(err.name, err.message);
            }
        };

        const register = async () => {
            if (await getPermission())
                registerPeriodicBackgroundSync();
        }

        setTimeout(register, 5000);
    }

    if (localStorage.getItem("changelog") === "1") {
        localStorage.setItem("changelog", "0");
        fetch("/changelog.json").then(res => res.json()).then(changelog => {
            if (changelog.exist) {
                $('body').modal({
                    title: 'Notes de mise à jour',
                    closeIcon: false,
                    content: changelog.content,
                    actions: [{
                        text: 'OK',
                        class: 'green'
                    }],
                    onHide: () => document.location.reload()
                }).modal('show');
            }
        });
    }
});

window.addEventListener('online', () => {
    $('body').toast({
        class: 'success',
        message: 'En-ligne !'
    });
});
window.addEventListener('offline', () => {
    $('body').toast({
        title: 'Hors-ligne',
        message: "Vous n'êtes plus connecté à internet. Les fonctionnalités de CYREL vont être limitées..."
    });
});
