const core = require("@actions/core");
const github = require("@actions/github");
const Handlebars = require("handlebars");
const { App } = require("@slack/bolt");
const exec = require("exec");

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
      inputs: {
        channel,
        raw,
        message,
      },
      context,
      env: process.env,
      eval: {},
    };

    core.debug("Handlebars payload");
    core.debug(JSON.stringify(payload));

    for (const e of Object.keys(evals)) {
      // from https://github.com/actions/toolkit/tree/master/packages/exec
      let myOutput = "";
      let myError = "";

      const options = {};
      options.listeners = {
        stdout: (data) => {
          myOutput += data.toString();
        },
        stderr: (data) => {
          myError += data.toString();
        },
      };

      const command = Handlebars.compile(evals[e], hbOptions)(payload);
      core.debug("Evaluating " + command);
      await exec.exec(command);

      if (myError) {
        throw new Error(myError);
      } else {
        payload.eval[e] = myOutput;
      }
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

    // const result = await app.client.chat.postMessage({
    //   token,
    //   channel,
    //   text: formattedMessage,
    // });

    core.setOutput("message", formattedMessage);
    core.debug("Slack result", result);
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
