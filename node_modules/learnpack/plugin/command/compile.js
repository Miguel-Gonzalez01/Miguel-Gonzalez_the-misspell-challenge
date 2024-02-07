
const CompilationError = (messages) => {
    const _err = new Error(messages)
    _err.status = 400
    _err.stdout = messages
    _err.type = 'compiler-error'
    return _err
}

module.exports = {
    CompilationError,
    default: async ({ action, ...rest }) => {

        const stdout = await action.run(rest)
        return stdout
    }
}