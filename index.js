const fs = require("fs");
const path = require('path');
const crypto = require('crypto');
const ProgressBar = require('progress');
const fetch = require("node-fetch");
const writeFile = fs.writeFile;
const promisify = require("util").promisify;
const writeFilePromise = promisify(writeFile);
const chokidar = require("chokidar");
const { spawn, exec } = require('child_process');

const VERSION = "0.2";

class RessourcesGenerator {
    static #exclude = [
        "/ressources.json",
    ];

    static getAllFiles(dir) {
        return new Promise((resolve, reject) => {
            let result = [];
            fs.readdir(dir, async (err, files) => {
                for (let i = 0; i < files.length; i++) {
                    const file = path.join(dir, files[i]);//path.resolve(dir, files[i]);
                    const stat = fs.statSync(file);
                    if (stat.isDirectory())
                        result = result.concat(await this.getAllFiles(file));
                    else result.push(file);
                }
                resolve(result);
            });
        });
    }

    static generate(src, dest) {
        return new Promise((resolve, reject) => {
            this.getAllFiles(src).then(list => {
                this.#exclude.forEach(file => {
                    list.splice(list.indexOf(path.join(src, file)), 1);
                });
                const ressources = [];
                list.forEach(p => {
                    const file = fs.readFileSync(p);
                    const hash = crypto.createHash("sha512");
                    hash.update(file);
                    const hex = hash.digest('hex');
                    ressources.push({
                        "url": p.replace(src, ""),
                        "hash": hex
                    });
                });
                fs.writeFileSync(dest, JSON.stringify(ressources));
                resolve();
            });
        });
    }
}

class Dependencies {
    static downloadDependencies(dependencies, location) {
        return new Promise(async (resolve, reject) => {
            console.log("Downloading dependencies...");
            const bar = new ProgressBar('[:bar] :current/:total', {
                complete: '=',
                incomplete: ' ',
                head: '>',
                width: 20,
                total: dependencies.length
            });
            for (const dependency of dependencies) {
                const bar2 = new ProgressBar('Downloading ' + dependency.name + '  [:bar] :percent :etas', {
                    complete: '=',
                    incomplete: ' ',
                    head: '>',
                    width: 20,
                    clear: true,
                    total: dependencies.length
                });
                for (const data of dependency.data) {
                    try {
                        fs.mkdirSync(path.join(location, data.dest.split("/").slice(0, -1).join("/")), {recursive: true});
                    } catch (e) {
                        console.error(e);
                    }
                    await fetch(data.src, {
                        "headers": {
                            "accept-language": "en-US,en;q=0.9"
                        },
                        "body": null,
                        "method": "GET",
                        "mode": "cors"
                    }).then(x => x.arrayBuffer()).then(async function (x) {
                        writeFilePromise(path.join(location, data.dest), Buffer.from(x))
                    });
                    bar2.tick(1);
                }
                bar.tick(1);
            }
            console.log("Done!");
            resolve();
        });
    }
}

class Arguments {
    static parse(args) {
        const result = {
            environment: "release",
            config: "./conf.js",
            action: null,
            changelog: null
        };
        for (let i = 0; i < args.length; i++) {
            if (args[i].indexOf("env:") === 0) {
                switch (args[i].slice(4)) {
                    case "release":
                        result.environment = "release";
                        break;
                    case "debug":
                        result.environment = "debug";
                        break;
                    default:
                        throw "Unknown environment. Please specify either `release` or `debug`.";
                }
            } else if (args[i].indexOf("conf:") === 0)
                result.config = args[i].slice(5);
            else if (args[i].indexOf("changelog:") === 0)
                result.changelog = args[i].slice(10);
            else if (result.action)
                throw "An action is already specified.";
            else {
                switch (args[i]) {
                    case "dist":
                        result.action = "dist";
                        break;
                    case "dev":
                        result.action = "dev";
                        break;
                    case "help":
                        result.action = "help";
                        break;
                    default:
                        throw "Unknown action."
                }
            }

        }
        if (!result.action)
            throw "Missing action."
        return result;
    }
}

const args = Arguments.parse(process.argv.slice(2));


function dist(configuration, root) {
    fs.mkdirSync(path.join(root, "dependencies"), {recursive: true});
    return new Promise((resolve, reject) => {
        Dependencies.downloadDependencies(configuration.dependencies, path.join(root, "dependencies"))
            .then(() => {
                return RessourcesGenerator.getAllFiles("src")
            })
            .then(list => {
                console.log("Copying src files...");
                list.forEach(file => {
                    try {
                        fs.mkdirSync(path.join(root, file.slice(3)).split("/").slice(0, -1).join("/"), {recursive: true});
                    } catch (e) {
                        console.error(e);
                    }
                    fs.copyFileSync(file, path.join(root, file.slice(3)));
                });
                console.log("Done!");
                console.log("Creating `departments.json`...");
                fs.writeFileSync(path.join(root, "config", "departments.json"), JSON.stringify(configuration.departments));
                console.log("Done!");
                console.log("Setting up backend url...");
                fs.writeFileSync(path.join(root, "js", "api.js"), fs.readFileSync(path.join(root, "js", "api.js")).toString().replace("__BACKEND_URL__", configuration.backend));
                fs.writeFileSync(path.join(root, "js", "api.js"), fs.readFileSync(path.join(root, "js", "api.js")).toString().replaceAll("__CLIENT_ID__", configuration.client_id));
                console.log("Done!");
                console.log("Creating version file...");
                exec("git log -1 --format=%cd --date=raw", (error, stdout, stderr) => {
                    if (error) {
                        console.error(`error: ${error.message}`);
                        return;
                    }
                    if (stderr) {
                        console.error(`stderr: ${stderr}`);
                        return;
                    }
                    const version = VERSION + "." + stdout.split(" ")[0];
                    fs.writeFileSync(path.join(root, "version"), version);
                    console.log("Done!");
                    console.log("Generating `changelog.json`...");
                    const changelog = {};
                    if (args.changelog) {
                        changelog.exist = true;
                        changelog.content = fs.readFileSync(args.changelog, {encoding: "utf8"});
                    } else
                        changelog.exist = false;
                    fs.writeFileSync(path.join(root, "changelog.json"), JSON.stringify(changelog));
                    console.log("Done!");
                    console.log("Generating `ressources.json`...");
                    RessourcesGenerator.generate(root, path.join(root, "ressources.json")).then(() => resolve());
                });
            });
    });

}

switch (args.action) {
    case "help":
        console.log("cyrel-web set-up tool.");
        console.log("Arguments:");
        console.log("  - env:[environment] - Set the environment can be debug or release.");
        console.log("  - conf:[path]       - Set the config file.");
        console.log("  - changelog:[path]  - Set the changelog path.");
        console.log("Commands:");
        console.log("  - help              - Show this page.");
        console.log("  - dist              - Generate the website.");
        console.log("  - dev               - Run a local webserver on 8080 for dev.");
        break;
    case "dist":
        dist(require(args.config), path.join("dist", args.environment)).then(() => console.log("Dist finished"));
        break;
    case "dev":
        const configuration = require(args.config);
        const root = path.join("dist", "debug");
        dist(configuration, root).then(() => {
            const watcher = chokidar.watch("src", {persistent: true});
            watcher.on("ready", () => {
                console.log("Ready to watch changes")
                watcher
                    .on("add", file => {
                        console.log(`File ${file} has been added`);
                        fs.copyFileSync(file, path.join(root, file.slice(3)));
                        fs.writeFileSync(path.join(root, "js", "api.js"), fs.readFileSync(path.join(root, "js", "api.js")).toString().replace("__BACKEND_URL__", configuration.backend));
                        fs.writeFileSync(path.join(root, "js", "api.js"), fs.readFileSync(path.join(root, "js", "api.js")).toString().replaceAll("__CLIENT_ID__", configuration.client_id));
                        RessourcesGenerator.generate(root, path.join(root, "ressources.json"));
                    })
                    .on("change", file => {
                        console.log(`File ${file} has been changed`);
                        fs.copyFileSync(file, path.join(root, file.slice(3)));
                        fs.writeFileSync(path.join(root, "js", "api.js"), fs.readFileSync(path.join(root, "js", "api.js")).toString().replace("__BACKEND_URL__", configuration.backend));
                        fs.writeFileSync(path.join(root, "js", "api.js"), fs.readFileSync(path.join(root, "js", "api.js")).toString().replaceAll("__CLIENT_ID__", configuration.client_id));
                        RessourcesGenerator.generate(root, path.join(root, "ressources.json"));
                    })
                    .on('unlink', file => {
                        console.log(`File ${file} has been removed`);
                        fs.rmSync(path.join(root, file.slice(3)));
                        RessourcesGenerator.generate(root, path.join(root, "ressources.json"));
                    })
                    .on('addDir', dir => {
                        console.log(`Directory ${dir} has been added`);
                        fs.mkdirSync(path.join(root, dir.slice(3)), {recursive: true});
                        RessourcesGenerator.generate(root, path.join(root, "ressources.json"));
                    })
                    .on('unlinkDir', dir => {
                        console.log(`Directory ${dir} has been removed`);
                        fs.rmdirSync(path.join(root, dir.slice(3)));
                        RessourcesGenerator.generate(root, path.join(root, "ressources.json"));
                    });
                console.log("Starting http-server")
                const server = spawn("node_modules/http-server/bin/http-server", [`${root}`], {stdio: [process.stdin, process.stdout, process.stderr]});
            });
        });
        break;
}



