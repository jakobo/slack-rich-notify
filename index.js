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

  let res = false;
  switch (typeof s) {
    case "undefined":
      return false;
    case "boolean":
      return s;
    case "string":
      res = false;

      // literal true
      res = res || s.toLowerCase().trim() === "true";

      // number > 0
      res = res || parseInt(s, 10) > 0;

      return res;
  }
};

// most @actions toolkit packages have async methods
async function run() {
  try {
    const token = core.getInput("token");
    const signingSecret = core.getInput("secret");
    const channel = core.getInput("channel");
    const raw = falsish(core.getInput("raw"));
    const dry = falsish(core.getInput("dry-run"));
    const dump = falsish(core.getInput("dump"));
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

    if (dump) {
      console.log("--- DUMPED CONTEXT ---");
      console.log(JSON.stringify(data, null, 2));
    }

    if (dry) {
      console.log("--- DRY RUN ---");
      console.log(formattedMessage);
      console.log("--- NO SLACK MESSAGES SENT ---");
    } else {
      // actually perform slack notification via bolt
      const app = new App({
        token,
        signingSecret,
      });

      const result = await app.client.chat.postMessage({
        token,
        channel,
        text: formattedMessage,
      });

      core.debug("Slack result", result);
    }
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
