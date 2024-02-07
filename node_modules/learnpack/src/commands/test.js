const Console = require("../utils/console");
const SessionCommand = require("../utils/SessionCommand");
const socket = require("../managers/socket.js");

const createServer = require("../managers/server");
const ExercisesQueue = require("../utils/exercisesQueue");

class TestCommand extends SessionCommand {
  async init() {
    const { flags } = this.parse(TestCommand);
    await this.initSession(flags);
  }
  async run() {
    const {
      args: { exerciseSlug },
    } = this.parse(TestCommand);

    // Build exercises index
    this.configManager.buildIndex();

    let exercises = [];

    // test all exercises
    if (!exerciseSlug) {
      exercises = this.configManager.getAllExercises();
    } else {
      exercises = [this.configManager.getExercise(exerciseSlug)];
    }

    const exercisesQueue = new ExercisesQueue(exercises);

    const configObject = this.configManager.get();

    let hasFailed = false;
    let failedTestsCount = 0;
    let successTestsCount = 0;
    let testsToRunCount = exercisesQueue.size();

    configObject.config.testingFinishedCallback = ({ result }) => {
      if (result === "failed") {
        hasFailed = true;
        failedTestsCount++;
      } else {
        successTestsCount++;
      }

      if (exercisesQueue.isEmpty()) {
        Console.info(
          `${testsToRunCount} test${testsToRunCount > 1 ? "s" : ""} runned`
        );
        Console.success(
          `${successTestsCount} test${successTestsCount > 1 ? "s" : ""} passed`
        );
        Console.error(
          `${failedTestsCount} test${failedTestsCount > 1 ? "s" : ""} failed`
        );

        process.exit(hasFailed ? 1 : 0);
      } else {
        exercisesQueue.pop().test(this.config, config, socket);
      }
    };

    const { config } = configObject;

    const server = await createServer(configObject, this.configManager, true);

    socket.start(config, server, true);

    exercisesQueue.pop().test(this.config, config, socket);
  }
}

TestCommand.description = `Test exercises`;

TestCommand.args = [
  {
    name: "exerciseSlug",
    required: false,
    description: "The name of the exercise to test",
    hidden: false,
  },
];

module.exports = TestCommand;
