const fs = require('fs')
const fetch = require('node-fetch')
const {validateExerciseDirectoryName} = require('../managers/config/exercise.js')
const { flags } = require('@oclif/command')
const Console = require('../utils/console')
const { isUrl, findInFile, checkForEmptySpaces, showErrors, showWarnings } = require('../utils/audit')
const SessionCommand = require('../utils/SessionCommand');
const fm = require("front-matter")
const path = require('path')

class AuditCommand extends SessionCommand {
    async init() {
        const { flags } = this.parse(AuditCommand)
        await this.initSession(flags)
    }
    async run() {
        const { flags } = this.parse(AuditCommand)

        Console.log("Running command audit...")

        // Build exercises if they are not built yet.
        if (!this.configManager.get().exercises) this.configManager.buildIndex()

        // Get configuration object.
        const config = this.configManager.get();

        let errors = []
        let warnings = []
        let counter = {
            images: {
                error: 0,
                total: 0,
            },
            links: {
                error: 0,
                total: 0,
            },
            exercises: 0,
            readmeFiles: 0
        }

        // Check if the exercises folder has some files within any ./exercise
        const exercisesPath = config.config.exercisesPath
        fs.readdir(exercisesPath, (err, files) => {
            if (err) {
                return console.log('Unable to scan directory: ' + err);
            }
            //listing all files using forEach
            files.forEach(function (file) {
                // Do whatever you want to do with the file
                let filePath = path.join(exercisesPath, file)
                if (fs.statSync(filePath).isFile()) warnings.push({ exercise: file, msg: `This file is not inside any exercise folder.` })
            });
        })

        // This function checks that each of the url's are working.
        const checkUrl = async (file, exercise) => {
            if (!fs.existsSync(file.path)) return false
            const content = fs.readFileSync(file.path).toString();
            let isEmpty = checkForEmptySpaces(content);
            if (isEmpty === true || content == false) errors.push({ exercise: exercise.title, msg: `This file (${file.name}) doesn't have any content inside.` })
            const frontmatter = fm(content).attributes
            for (const attribute in frontmatter) {
                if (attribute === "intro" || attribute === "tutorial") {
                    counter.links.total++
                    try {
                        let res = await fetch(frontmatter[attribute], { method: "HEAD" });
                        if (!res.ok) {
                            counter.links.error++;
                            errors.push({ exercise: exercise.title, msg: `This link is broken (${res.ok}): ${frontmatter[attribute]}` })
                        }
                    }
                    catch (error) {
                        counter.links.error++;
                        errors.push({ exercise: exercise.title, msg: `This link is broken: ${frontmatter[attribute]}` })
                    }
                }
            }

            // Check url's of each README file.
            const findings = findInFile(["relative_images", "external_images", "markdown_links"], content);
            for (const finding in findings) {
                let obj = findings[finding];
                // Valdites all the relative path images.
                if (finding === "relative_images" && Object.keys(obj).length > 0) {
                    for (const img in obj) {
                        // Validates if the image is in the assets folder.
                        counter.images.total++
                        let relativePath = path.relative(exercise.path.replace(/\\/gm, "/"), `${config.config.dirPath}/assets/${obj[img].relUrl}`).replace(/\\/gm, "/")
                        if (relativePath != obj[img].absUrl.split("?").shift()) {
                            counter.images.error++;
                            errors.push({ exercise: exercise.title, msg: `This relative path (${obj[img].relUrl}) is not pointing to the assets folder.` })
                        }
                        if (!fs.existsSync(`${config.config.dirPath}/assets/${obj[img].relUrl}`)) {
                            counter.images.error++;
                            errors.push({ exercise: exercise.title, msg: `The file ${obj[img].relUrl} doesn't exist in the assets folder.` })
                        }
                    }
                } else if (finding === "external_images" && Object.keys(obj).length > 0) {
                    // Valdites all the aboslute path images.
                    for (const img in obj) {
                        counter.images.total++
                        try {
                            let res = await fetch(obj[img].absUrl, { method: "HEAD" });
                            if (!res.ok) {
                                counter.images.error++;
                                errors.push({ exercise: exercise.title, msg: `This link is broken: ${obj[img].absUrl}` })
                            }
                        }
                        catch (error) {
                            counter.images.error++;
                            errors.push({ exercise: exercise.title, msg: `This link is broken: ${obj[img].absUrl}` })
                        }
                    }
                } else if (finding === "markdown_links" && Object.keys(obj).length > 0) {
                    for (const link in obj) {
                        counter.links.total++
                        try {
                            let res = await fetch(obj[link].mdUrl, { method: "HEAD" });
                            if (!res.ok) {
                                counter.links.error++;
                                errors.push({ exercise: exercise.title, msg: `This link is broken: ${obj[link].mdUrl}` })
                            }
                        }
                        catch (error) {
                            counter.links.error++;
                            errors.push({ exercise: exercise.title, msg: `This link is broken: ${obj[link].mdUrl}` })
                        }
                    }
                }
            }
            return true
        }

        // This function is being created because the find method doesn't work with promises.
        const find = async (file, lang, exercise) => {
            if (file.name === lang) {
                await checkUrl(file, exercise)
                return true
            }
            return false
        }

        Console.info(' Checking if the config file is fine...')
        // These two lines check if the 'slug' property is inside the configuration object.
        Console.debug("Checking if the slug property is inside the configuration object...")
        if (!config.config.slug) errors.push({ exercise: null, msg: "The slug property is not in the configuration object" })

        // These two lines check if the 'repository' property is inside the configuration object.
        Console.debug("Checking if the repository property is inside the configuration object...")
        if (!config.config.repository) errors.push({ exercise: null, msg: "The repository property is not in the configuration object" })
        else isUrl(config.config.repository, errors, counter)

        // These two lines check if the 'description' property is inside the configuration object.
        Console.debug("Checking if the description property is inside the configuration object...")
        if (!config.config.description) errors.push({ exercise: null, msg: "The description property is not in the configuration object" })

        if (errors.length == 0) Console.log("The config file is ok")

        // Validates if images and links are working at every README file.
        const exercises = config.exercises
        let readmeFiles = []

        if (exercises.length > 0) {
            Console.info(' Checking if the images are working...')
            for (const index in exercises) {
                let exercise = exercises[index]
                if (!validateExerciseDirectoryName(exercise.title)) errors.push({exercise: exercise.title, msg: `The exercise ${exercise.title} has an invalid name.`})
                let readmeFilesCount = { exercise: exercise.title, count: 0 };
                if (Object.keys(exercise.translations).length == 0) errors.push({ exercise: exercise.title, msg: `The exercise ${exercise.title} doesn't have a README.md file.` })

                if (exercise.language == "python3" || exercise.language == "python") {
                    exercise.files.map(f => f).find(f => {
                        if (f.path.includes('test.py') || f.path.includes('tests.py')) {
                            const content = fs.readFileSync(f.path).toString();
                            let isEmpty = checkForEmptySpaces(content);
                            if (isEmpty === true || content == false) errors.push({ exercise: exercise.title, msg: `This file (${f.name}) doesn't have any content inside.` })
                        }
                    });
                }
                else {
                    exercise.files.map(f => f).find(f => {
                        if (f.path.includes('test.js') || f.path.includes('tests.js')) {
                            const content = fs.readFileSync(f.path).toString();
                            let isEmpty = checkForEmptySpaces(content);
                            if (isEmpty === true || content == false) errors.push({ exercise: exercise.title, msg: `This file (${f.name}) doesn't have any content inside.` })
                        }
                    });
                }

                for (const lang in exercise.translations) {
                    let files = []
                    for (const file of exercise.files) {
                        let found = await find(file, exercise.translations[lang], exercise)
                        if (found == true) readmeFilesCount = { ...readmeFilesCount, count: readmeFilesCount.count + 1 }
                        files.push(found)
                    }
                    if (!files.includes(true)) errors.push({ exercise: exercise.title, msg: `This exercise doesn't have a README.md file.` })

                }
                readmeFiles.push(readmeFilesCount)
            }
        } else errors.push({ exercise: null, msg: "The exercises array is empty." })

        Console.log(`${counter.images.total - counter.images.error} images ok from ${counter.images.total}`)

        Console.info(" Checking if important files are missing... (README's, translations, gitignore...)")
        // Check if all the exercises has the same ammount of README's, this way we can check if they have the same ammount of translations.
        let files = [];
        readmeFiles.map((item, i, arr) => {
            if (item.count !== arr[0].count) files.push(` ${item.exercise}`)
        })
        if (files.length > 0) {
            files = files.join()
            warnings.push({ exercise: null, msg: `These exercises are missing translations: ${files}` })
        }

        // Checks if the .gitignore file exists.
        if (!fs.existsSync(`.gitignore`)) warnings.push(".gitignore file doesn't exist")

        counter.exercises = exercises.length;
        readmeFiles.forEach((readme) => {
            counter.readmeFiles += readme.count
        })

        await showWarnings(warnings)
        await showErrors(errors, counter)
    }
}

AuditCommand.description = `Check if the configuration object has slug, description and repository property
...
Extra documentation goes here
`

AuditCommand.flags = {
    // name: flags.string({char: 'n', description: 'name to print'}),
}

module.exports = AuditCommand