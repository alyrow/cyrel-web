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

            let xUp = evt.touches[0].clientX;
            let yUp = evt.touches[0].clientY;

            let xDiff = xDown - xUp;
            let yDiff = yDown - yUp;

            if (Math.abs(xDiff) > Math.abs(yDiff)) {/*most significant*/
                if (xDiff < 0) { // swipe left
                    document.getElementsByClassName("sidebar icon").item(null).click()
                }
            }

            xDown = null;
            yDown = null;
        };

        document.addEventListener('touchstart', handleTouchStart, false);
        document.addEventListener('touchmove', function (evt) {
            setTimeout(handleTouchMove, 500, evt)
        }, false);

        pagesConf.forEach(page => {
            if (document.location.pathname.indexOf(page.url) === 0 || (page.url.indexOf("/index.html") !== -1 &&
                document.location.pathname.indexOf(page.url.replace("/index.html", "/")) === 0))
                thisPage = page;
        });

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
