const Console = require('./console')
const fetch = require('node-fetch')


module.exports = {
    // This function checks if a url is valid.
    isUrl: async (url, errors, counter) => {
        let regex_url = /(https?:\/\/[a-zA-Z_\-.\/0-9]+)/gm
        counter.links.total++
        if (!regex_url.exec(url)) {
            counter.links.error++
            errors.push({ exercise: null, msg: `The repository value of the configuration file is not a link: ${url}` })
            return false;
        }
        let res = await fetch(url, { method: "HEAD" });
        if (!res.ok) {
            counter.links.error++
            errors.push({ exercise: null, msg: `The link of the repository is broken: ${url}` })
        }
        return true;
    },
    checkForEmptySpaces: (str) => {
        let isEmpty = true;
        for(let letter of str){
            if (letter !== " ") {
                isEmpty = false;
                return isEmpty;
            }
        }
        return isEmpty;
    },
    findInFile: (types, content) => {
        const regex = {
            relative_images: /!\[.*\]\s*\((((\.\/)?(\.{2}\/){1,5})(.*\/)*(.[^\/\s]*\.[a-zA-Z]{2,4})[^\s]*)\)/gm,
            external_images: /!\[.*\]\((https?:\/(\/{1}[^/)]+)+\/?)\)/gm,
            markdown_links: /(\s)+\[.*\]\((https?:\/(\/{1}[^/)]+)+\/?)\)/gm,
            url: /(https?:\/\/[a-zA-Z_\-.\/0-9]+)/gm,
            uploadcare: /https:\/\/ucarecdn.com\/(?:.*\/)*([a-zA-Z_\-.\/0-9]+)/gm
        }

        const validTypes = Object.keys(regex);
        if (!Array.isArray(types)) types = [types];

        let findings = {}

        types.forEach(type => {
            if (!validTypes.includes(type)) throw Error("Invalid type: " + type)
            else findings[type] = {};
        });

        types.forEach(type => {

            let count = 0;
            let m;
            while ((m = regex[type].exec(content)) !== null) {
                // This is necessary to avoid infinite loops with zero-width matches
                if (m.index === regex.lastIndex) {
                    regex.lastIndex++;
                }

                // The result can be accessed through the `m`-variable.
                // m.forEach((match, groupIndex) => values.push(match));
                count++;

                findings[type][m[0]] = {
                    content: m[0],
                    absUrl: m[1],
                    mdUrl: m[2],
                    relUrl: m[6]
                }
            }
        })

        return findings;
    },
    // This function checks if there are errors, and show them in the console at the end.
    showErrors: (errors, counter) => {
        return new Promise((resolve, reject) => {
            if (errors) {
                if (errors.length > 0) {
                    Console.log("Checking for errors...")
                    errors.forEach((error, i) => Console.error(`${i + 1}) ${error.msg} ${error.exercise != null ? `(Exercise: ${error.exercise})` : ""}`))
                    Console.error(` We found ${errors.length} errors among ${counter.images.total} images, ${counter.links.total} link, ${counter.readmeFiles} README files and ${counter.exercises} exercises.`)
                    process.exit(1)
                } else {
                    Console.success(`We didn't find any errors in this repository among ${counter.images.total} images, ${counter.links.total} link, ${counter.readmeFiles} README files and ${counter.exercises} exercises.`)
                    process.exit(0)
                }
                resolve("SUCCESS")
            } else {
                reject("Failed")
            }
        })
    },
    // This function checks if there are warnings, and show them in the console at the end.
    showWarnings: (warnings) => {
        return new Promise((resolve, reject) => {
            if (warnings) {
                if (warnings.length > 0) {
                    Console.log("Checking for warnings...")
                    warnings.forEach((warning, i) => Console.warning(`${i + 1}) ${warning.msg} ${warning.exercise ? `File: ${warning.exercise}` : ""}`))
                }
                resolve("SUCCESS")
            } else {
                reject("Failed")
            }
        })
    }
}