const dotenv = require("dotenv").config();
const express = require("express");
const app = express();
const http = require("http");
const server = http.createServer(app);
const axios = require("axios");
const { ChatOpenAI } = require("@langchain/openai");

const PORT = process.env.PORT || 2000;
const token = process.env.BOT_TOKEN;

//slack imports
const eventsApi = require("@slack/events-api");
const slackEvents = eventsApi.createEventAdapter(process.env.APP_SIGNINSECRET);
const { WebClient, LogLevel } = require("@slack/web-api");

const client = new WebClient(token, {
  logLevel: LogLevel.DEBUG,
});

const chatModel = new ChatOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

//middlewares
app.use("/", slackEvents.expressMiddleware());
app.use((err, req, res, next) => {
  console.error("Global error handler:", err);
  res.status(500).send("Something broke!");
});

const handleCallOpenAi = async (message) => {
  const response = await chatModel.call([`Reply to this message: ${message}`]);
  console.log(response?.content);
  return response?.content;
};

slackEvents.on("message", async (event) => {
  console.log(event?.subtype, event.bot_id);
  if (!event?.subtype && !event.bot_id) {
    client.chat.postMessage({
      token,
      channel: event.channel,
      text: handleCallOpenAi(event.text),
    });

    const data = {
      fields: {
        project: {
          key: "TPOP",
        },
        summary: event.text,
        description: {
          content: [
            {
              content: [
                {
                  text: event.text,
                  type: "text",
                },
              ],
              type: "paragraph",
            },
          ],
          type: "doc",
          version: 1,
        },
        issuetype: {
          id: "10007",
        },
      },
    };

    const secret = `${process.env.JIRA_USERNAME}:${process.env.JIRA_PASSWORD}`;
    try {
      const res = await axios.post(
        "https://sarveshpandey221.atlassian.net/rest/api/3/issue",
        data,
        {
          headers: {
            Authorization: `Basic ${Buffer.from(secret).toString("base64")}`,
            "Content-Type": "application/json",
          },
        }
      );
      console.log("Jira issue created:", res.data);
    } catch (err) {
      console.log("Jira API Error:", err.response?.data || err.message);
    }
  }
});

server.listen(PORT, () => {
  console.log(`listening on port : ${PORT}`);
});
