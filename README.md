# cyrel-web

cyrel-web is a web handmade frontend for [cyrel](https://github.com/alyrow/cyrel) written in html and plain javascript.

Sources of the website are included in `src/` folder.

cyrel-web is brought with a set-up tool made with nodejs.

## Setting-up cyrel-web

Clone this repository and be sure to have nodejs installed on your system.

Create the main configuration file, which looks like this:

```js
module.exports = {
    dependencies: require("../dependencies.json"), // Supplied
    backend: "some url here",                      // Not supplied
    departments: require("./departments.json")     // Not supplied
}
```

Run the tool:

```shell
$ node index.js env:environment conf:path dist
```

Where `environment` is either release or debug. Note: actually there is no differences between release and debug but in
the future, release environment will have all js files (excepting dependencies one) merged and minified into one file.

It will download dependencies, copy src files, create config files, set-up backend url and generate a file which
contains a list of all files and their sha512 hash, into `/dist/environment`

### Example

```shell
$ node index.js env:debug conf:./config/conf.js dist
```
