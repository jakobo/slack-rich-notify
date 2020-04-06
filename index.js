const core = require("@actions/core");
const exec = require("@actions/exec");
const github = require("@actions/github");
const Handlebars = require("handlebars");
const { App } = require("@slack/bolt");

// most @actions toolkit packages have async methods
async function run() {
  try {
    const token = core.getInput("token");
    const channel = core.getInput("channel");
    const raw = core.getInput("raw") || false;
    const message = core.getInput("message");
    const evals = core.getInput("eval") || {};
    const context = github.context;

    const app = new App({
      token,
    });

    const payload = {
      vars: {
        channel,
        raw,
        message,
      },
      env: process.env,
      eval: {},
      context,
    };

    for (const e of Object.keys(evals)) {
      // from https://github.com/actions/toolkit/tree/master/packages/exec
      let output = "";
      let errors = "";
      const options = {};
      options.listeners = {
        stdout: (data) => {
          output += data.toString();
        },
        stderr: (data) => {
          errors += data.toString();
        },
      };

      const command = Handlebars.compile(evals[e])(payload);

      core.debug("Evaluating " + command);
      await exec(command, options);
      if (errors.length) {
        throw new Error(errors);
      }
      payload.eval[e] = output;
    }

    let formattedMessage = message;
    if (!raw) {
      formattedMessage = Handlebars.compile(message)(payload);
    } else {
      formattedMessage = raw;
    }

    const result = await app.client.chat.postMessage({
      token,
      channel,
      text: formattedMessage,
    });

    core.setOutput("message", formattedMessage);
    core.debug("Slack result", result);
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
