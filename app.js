const dotenv = require('dotenv').config()
const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);

const PORT = process.env.PORT || 2000
const token = process.env.BOT_TOKEN;

//slack imports 
const eventsApi = require('@slack/events-api');
const slackEvents = eventsApi.createEventAdapter(process.env.APP_SIGNINSECRET);
const { WebClient, LogLevel } = require("@slack/web-api");

const client = new WebClient(token, {
    logLevel: LogLevel.DEBUG
})

//middle wares
app.use('/', slackEvents.expressMiddleware());


slackEvents.on("message", async (event) => {
    if(!event?.subtype && !event.bot_id) {
        client.chat.postMessage({
            token,
            channel: event.channel,
            text: 'working fine, i guess?'
        })
    }
})





server.listen(PORT, () => {
    console.log(`listening on port : ${PORT}`);
})
