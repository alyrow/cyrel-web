self.addEventListener("install", (event) => {
    event.waitUntil(
        (async () => {
            console.log("Installing CYREL...");
            const req = await fetch("/ressources.json");
            const ressources = await req.json();
            const urls = [];
            ressources.forEach(res => {
                urls.push(res.url);
            });
            await caches.open('res').then(function (cache) {
                return cache.add("/ressources.json");
            });
            await caches.open('cache').then(function (cache) {
                return cache.addAll(urls);
            }).then(() => {
                console.log("Installed!");
            });
        })()
    );
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        (async () => {
            if ("navigationPreload" in self.registration) {
                await self.registration.navigationPreload.enable();
            }
        })()
    );
    self.clients.claim();
});

self.addEventListener("fetch", (event) => {
    event.respondWith(caches.open("cache").then(cache => {
        return cache.match(event.request)
    }).then(function (response) {
        if (response !== undefined) {
            if (event.request.url.indexOf("/ressources.json") && event.request.headers.get("Cyrel") === "internal") {
                return fetch(event.request).then(function (response) {
                    return response;
                });
            } else return response;
        } else {
            return fetch(event.request).then(function (response) {
                return response;
            }).catch(function () {
                return caches.open("cache").then(cache => {
                    return cache.match('/404.html')
                });
            });
        }
    }));
});


const updateCache = () => {
    return new Promise(((resolve, reject) => {
        console.log("Running update-cache task...");
        let appUpdate = false;
        const myHeaders = new Headers({
            'Cyrel': 'internal'
        });
        fetch("/ressources.json", {cache: "no-store", headers: myHeaders}).then(req => {
            return req.json();
        }).then(ressourcesMaster => {
            caches.open("res").then(cache => {
                return cache.match("/ressources.json")
            }).then(jj => {
                return jj.json()
            }).then(ressourcesLocal => {
                const urls = [];
                ressourcesMaster.forEach(res => {
                    let found = false;
                    ressourcesLocal.forEach(local => {
                        if (local.url === res.url) {
                            found = true;
                            if (local.hash !== res.hash) {
                                console.log("Updating " + local.url);
                                if (local.url === "/service-worker.js") appUpdate = true;
                                urls.push(res.url);
                            }
                        }
                    });
                    if (!found) {
                        console.log("Adding " + res.url);
                        urls.push(res.url);
                    }
                });
                caches.open('cache').then(async function (cache) {
                    await caches.delete('res');
                    const myHeaders = new Headers({
                        'Cyrel': 'internal'
                    });
                    await caches.open('res').then(function (cache2) {
                        return cache2.add(new Request("/ressources.json", {cache: "no-store", headers: myHeaders}));
                    });
                    for (let i = 0; i < urls.length; i++) {
                        console.log(urls[i] + " deleted: " + await cache.delete(urls[i]));
                        urls[i] = new Request(urls[i], {cache: "no-store", headers: myHeaders});
                    }
                    await cache.addAll(urls);
                    console.log("Cache updated!");
                    resolve(appUpdate);
                });
            });
        });
    }));


}

self.addEventListener('periodicsync', (syncEvent) => {
    if (syncEvent.tag === 'update-cache') {
        syncEvent.waitUntil(
            updateCache()
        );
    }
});

self.addEventListener('message', function (event) {
    console.log('Handling message event:', event);
    let p;
    switch (event.data.command) {
        case 'check-update':
            p = updateCache().then(up => event.ports[0].postMessage({update: up}));
            break;

        default:
            // This will be handled by the outer .catch().
            throw Error('Unknown command: ' + event.data.command);
    }

    if ('waitUntil' in event && p) {
        event.waitUntil(p);
    }
});
