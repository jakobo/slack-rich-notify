const core = require("@actions/core");
const github = require("@actions/github");
const Handlebars = require("handlebars");
const { App } = require("@slack/bolt");
const exec = require("@actions/exec");
const hbh = require("./handlebars-helpers");

hbh(Handlebars);

const hbOptions = {
  data: false,
  noEscape: true,
};

// falsish. Because github action params are always strings
const falsish = (s) => {
  if (s === null) {
    return false;
  }
  if (typeof s === "undefined") {
    return false;
  }
  if (typeof s === "boolean") {
    return s;
  }
  if (typeof s === "string") {
    return s.toLowerCase().trim() === "true";
  }
};

// most @actions toolkit packages have async methods
async function run() {
  try {
    const token = core.getInput("token");
    const signingSecret = core.getInput("secret");
    const channel = core.getInput("channel");
    const raw = falsish(core.getInput("raw"));
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

    const data = {
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
      const command = Handlebars.compile(evals[e], hbOptions)(data);
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
        data.evals[e] = results.out;
      }
    }

    core.debug("Final message data");
    core.debug(JSON.stringify(data));

    let formattedMessage = message;
    if (!raw) {
      core.debug("formatting message:");
      core.debug(message);
      formattedMessage = Handlebars.compile(message, hbOptions)(data);
    } else {
      core.debug("Raw enabled, skipping message formatting");
      formattedMessage = raw;
    }

    core.debug("Message to send:");
    core.debug(formattedMessage);

    const app = new App({
      token,
      signingSecret,
    });

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
