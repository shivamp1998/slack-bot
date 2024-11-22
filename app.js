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
app.use("/slack/events", slackEvents.expressMiddleware());
app.use((err, req, res, next) => {
  console.error("Global error handler:", err);
  res.status(500).send("Something broke!");
});

const router = express.Router();
router.use(express.urlencoded({ extended: true }));

router.post('/', async (req, res) => {
    const response = await chatModel.call([`Tell me a random fact`])
    return res.send(response?.content);
});

router.post('/jira', async (req, res) => {
    const { text } = req.body;
    const response = await handleCreateJiraIssue(text);
    return res.send(`Jira issue created: \n https://sarveshpandey221.atlassian.net/jira/servicedesk/projects/TPOP/queues/custom/1/${response.key}`);
});

app.use('/slash-command', router);

const handleCallOpenAi = async (message) => {
  const response = await chatModel.call([`Reply to this message: ${message}`]);
  console.log(response?.content);
  return response?.content;
};

const handleCreateJiraIssue = async (message) => {
    const data = {
        fields: {
          project: {
            key: "TPOP",
          },
          summary: message,
          description: {
            content: [
              {
                content: [
                  {
                    text: message,
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
        return res.data
      } catch (err) {
        console.log("Jira API Error:", err.response?.data || err.message);
      }
}

const getJiraIssueLink = async (issueId) => {
    return `https://sarveshpandey221.atlassian.net/browse/${issueId}`;
}


slackEvents.on("message", async (event) => {
  console.log(event?.subtype, event.bot_id);
  if (!event?.subtype && !event.bot_id) {
    client.chat.postMessage({
      token,
      channel: event.channel,
      text: await handleCallOpenAi(event.text),
    });
    const response = await handleCreateJiraIssue(event.text);
    client.chat.postMessage({
        thread_ts: event.ts,
        token,
        channel: event.channel,
        text: `Jira issue created: \n https://sarveshpandey221.atlassian.net/jira/servicedesk/projects/TPOP/queues/custom/1/${response.key}`,
    })
  }
});

server.listen(PORT, () => {
  console.log(`listening on port : ${PORT}`);
});
