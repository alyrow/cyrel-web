class TopBar {
    /**
     * @type {(element: HTMLElement, title: string, pagesConf: Array<any>) => TopBar}
     * @param element TopBar dom element
     * @param title Title of the page
     * @param pagesConf Pages configuration
     */
    constructor(element, title, pagesConf) {
        let thisPage = null;
        let xDown = null;
        let yDown = null;
        let jSidebar = null;

        const getTouches = (evt) => {
            return evt.touches ||             // browser API
                evt.originalEvent.touches; // jQuery
        };

        const handleTouchStart = (evt) => {
            const firstTouch = getTouches(evt)[0];
            xDown = firstTouch.clientX;
            yDown = firstTouch.clientY;
        };

        const handleTouchMove = (evt) => {
            if (!xDown || !yDown) {
                return;
            }

            if (xDown > visualViewport.width / 15) return;

            const sidebar = document.getElementsByClassName("sidebar icon").item(null);

            let xUp = evt.touches[0].clientX;
            let yUp = evt.touches[0].clientY;

            let xDiff = xDown - xUp;
            let yDiff = yDown - yUp;

            for (let i = 0; i < evt.changedTouches.length; i++) {
                xUp = evt.changedTouches[i].clientX;
                yUp = evt.changedTouches[i].clientY;

                xDiff = xDown - xUp;
                yDiff = yDown - yUp;

                if (Math.abs(xDiff) < 3 * visualViewport.width / 15) {
                    const ratio = Math.abs(xDiff) / (3 * visualViewport.width / 15);
                    sidebar.style.boxShadow = `0 0 0 ${ratio * 50}px rgba(0, ${ratio * 200}, 0, ${ratio * 0.3})`
                } else {
                    xDown = null;
                    yDown = null;
                    sidebar.style.boxShadow = `0 0 0 0px rgba(0, 0, 0, 0)`
                    if (evt.touches.length === 1 && visualViewport.scale === 1 && Math.abs(xDiff) > Math.abs(yDiff)) {/*most significant*/
                        if (xDiff < 0) { // swipe left
                            jSidebar = $('.ui.sidebar').sidebar({ closable: false }).sidebar('show');
                        }
                    }
                    break;
                }
            }
        };

        document.addEventListener('touchstart', handleTouchStart, false);
        document.addEventListener('touchmove', handleTouchMove, false);
        document.addEventListener('touchend', () => {
            document.getElementsByClassName("sidebar icon").item(null).style.boxShadow = `0 0 0 0px rgba(0, 0, 0, 0)`
            if (jSidebar) {
                document.querySelector(".pusher.dimmed").onclick = () => {
                    document.querySelector(".pusher.dimmed").onclick = undefined;
                    jSidebar.sidebar('hide');
                    jSidebar = null;
                }
            }
        }, false);

        for (let i = 0; i < pagesConf.length; i++) {
            if (document.location.pathname.indexOf(pagesConf[i].url) === 0 || (pagesConf[i].url.indexOf("/index.html") !== -1 &&
                document.location.pathname.indexOf(pagesConf[i].url.replace("/index.html", "/")) === 0))
                thisPage = pagesConf[i];
            if (UiCore.dark && pagesConf[i].darkIcon) pagesConf[i].icon = pagesConf[i].darkIcon;
        }

        new Template("top-bar", {
            "page_title": title,
            "page_icon": thisPage.icon,
            "pages": pagesConf,
            "menu": thisPage && thisPage.menu,
            "logged": localStorage.getItem("__") !== null && localStorage.getItem("__") !== "",
            "serviceWorker": "serviceWorker" in navigator
        }, element, async () => {
            if (thisPage && thisPage.menu) {
                $('.ui.left.vertical.menu.sidebar').first()
                    .sidebar('attach events', '.sidebar.icon')
                    .sidebar('setting', 'transition', 'overlay')
                ;
                if (localStorage.getItem("__") !== null && localStorage.getItem("__") !== "")
                    $('.ui.icon.item.dropdown')
                        .dropdown()
                    ;

                if ("serviceWorker" in navigator) {
                    const result = await navigator.serviceWorker.ready;
                    const sendMessage = (message) => {
                        return new Promise(function (resolve, reject) {
                            const messageChannel = new MessageChannel();
                            messageChannel.port1.onmessage = function (event) {
                                if (event.data.error) {
                                    reject(event.data.error);
                                } else {
                                    resolve(event.data);
                                }
                            };
                            result.active.postMessage(message, [messageChannel.port2]);
                        });
                    };
                    if (result.active.state === "activated") {
                        const elem = document.getElementById("sw");
                        elem.onclick = () => {
                            console.log("Checking and updating...");
                            sendMessage({command: "check-update"}).then(msg => {
                                console.log("Checked!");
                                elem.classList.remove("active", "selected");
                                if (msg.update) {
                                    console.log("Update available");
                                    console.log("Updating...");
                                    result.update();
                                }
                            });
                        }
                        elem.style.display = "block";
                    }
                }
            }
        });
    }

    static logout() {
        localStorage.removeItem("__");
        document.location.href = "/login.html";
    }
}

UiCore.registerTag("top-bar", element => {
    Config.loadConfig("pages", conf => {
        new TopBar(element, document.title, conf);
    });
});
