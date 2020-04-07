const core = require("@actions/core");
const exec = require("@actions/exec");
const github = require("@actions/github");
const Handlebars = require("handlebars");
const { App } = require("@slack/bolt");

// most @actions toolkit packages have async methods
async function run() {
  try {
    const token = core.getInput("token");
    const signingSecret = core.getInput("secret");
    const channel = core.getInput("channel");
    const raw = core.getInput("raw") || false;
    const message = core.getInput("message");
    const evalStrings = core.getInput("eval") || "";
    const context = github.context;

    // turn our eval strings into actionable commands
    const evals = evalStrings.split(/\n+/g).reduce((a, e) => {
      const [saveAs, cmd] = e.split(/\s*=\s*/).map((p) => p.trim());
      return {
        ...a,
        [saveAs]: cmd,
      };
    }, {});

    const app = new App({
      token,
      signingSecret,
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
      await exec.exec(command, options);
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
