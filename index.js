const core = require("@actions/core");
const exec = require("@actions/exec");
const github = require("@actions/github");
const Handlebars = require("handlebars");
const { App } = require("@slack/bolt");
const execa = require("execa");

const hbOptions = {
  data: false,
  noEscape: true,
};

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

    core.setSecret(token);
    core.setSecret(signingSecret);

    // turn our eval strings into actionable commands
    const evals = evalStrings.split(/\n+/g).reduce((a, e) => {
      const [saveAs, ...cmd] = e.split(/=/g);
      return {
        ...a,
        [saveAs.trim()]: cmd.join("=").trim(),
      };
    }, {});

    const app = new App({
      token,
      signingSecret,
    });

    core.debug("Eval Statements:");
    core.debug(JSON.stringify(evals));

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
      // or execa...
      const command = Handlebars.compile(evals[e], hbOptions)(payload);
      core.debug("Evaluating " + command);
      const result = await execa(command);

      if (result.exitCode !== 0) {
        throw new Error(result.stderr.toString());
      }

      payload.eval[e] = result.stdout.toString();
    }

    core.debug("Formatting with payload: " + JSON.stringify(payload));

    let formattedMessage = message;
    if (!raw) {
      console.log("formatting message:", message);
      formattedMessage = Handlebars.compile(message, hbOptions)(payload);
      console.log("result:", formattedMessage);
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
