module.exports = {
    config: {
        port: 3000,
        address: "http://localhost",
        editor: {
            mode: null, //[standalone, preview]
            agent: null, //[vscode, theia]
            version: null
        },
        dirPath: './.learn',
        configPath: './learn.json',
        outputPath: './.learn/dist',
        publicPath: '/preview',
        publicUrl: null,
        language: "auto",
        grading: 'isolated', // [isolated, incremental]
        exercisesPath: './', // path to the folder that contains the exercises
        webpackTemplate: null, // if you want webpack to use an HTML template
        disableGrading: false,
        disabledActions: [], //Possible: 'build', 'test' or 'reset'
        actions: [], // ⚠️ deprecated, leave empty )
        entries: {
            html: "index.html",
            vanillajs: "index.js",
            react: "app.jsx",
            node: "app.js",
            python3: "app.py",
            java: "app.java",
        }
    },
    currentExercise: null
}