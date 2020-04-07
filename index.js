const core = require("@actions/core");
const github = require("@actions/github");
const Handlebars = require("handlebars");
// const { App } = require("@slack/bolt");
const exec = require("@actions/exec");

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
    const evalStrings = core.getInput("evals") || "";
    const context = github.context;

    core.setSecret(channel);
    core.setSecret(token);
    core.setSecret(signingSecret);

    // turn our eval strings into actionable commands
    const evals = evalStrings
      ? evalStrings.split(/\n+/g).reduce((a, e) => {
          const [saveAs, ...cmd] = e.split(/=/g);
          return {
            ...a,
            [saveAs.trim()]: cmd.join("=").trim(),
          };
        }, {})
      : {};

    // const app = new App({
    //   token,
    //   signingSecret,
    // });

    const payload = {
      inputs: {
        channel,
        raw,
        message,
      },
      context,
      env: process.env,
      evals: {},
    };

    for (const e of Object.keys(evals)) {
      // from https://github.com/actions/toolkit/tree/master/packages/exec
      const command = Handlebars.compile(evals[e], hbOptions)(payload);
      const results = { out: "", err: "" };
      core.debug("Evaluating " + command);
      await exec.exec(command, [], {
        listeners: {
          stdout: (data) => {
            results.out += data.toString();
          },
          stderr: (data) => {
            results.err += data.toString();
          },
        },
      });

      core.debug("result");
      core.debug(JSON.stringify(results));

      if (results.err) {
        throw new Error(results.err);
      } else {
        payload.evals[e] = results.out;
      }
    }

    core.debug("Final message payload");
    core.debug(JSON.stringify(payload));

    let formattedMessage = message;
    if (!raw) {
      core.debug("formatting message:");
      core.debug(message);
      formattedMessage = Handlebars.compile(message, hbOptions)(payload);
    } else {
      core.debug("Raw enabled, skipping message formatting");
      formattedMessage = raw;
    }

    core.debug("Message to send:");
    core.debug(formattedMessage);

    // const result = await app.client.chat.postMessage({
    //   token,
    //   channel,
    //   text: formattedMessage,
    // });

    core.setOutput("message", formattedMessage);
    // core.debug("Slack result", result);
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
