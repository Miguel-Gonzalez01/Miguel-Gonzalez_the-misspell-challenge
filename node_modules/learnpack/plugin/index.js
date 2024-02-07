const { CompilationError } = require("./command/compile")
const { TestingError } = require("./command/test")
const utils = require("./utils")
const plugin = require("./plugin")

module.exports = { CompilationError, TestingError, Utils: utils, plugin }