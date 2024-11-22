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
const { ChatOpenAI } = require('@langchain/openai');

const client = new WebClient(token, {
    logLevel: LogLevel.DEBUG
})

const chatModel = new ChatOpenAI({
    apiKey: process.env.OPENAI_API_KEY
})
//middle wares
app.use('/', slackEvents.expressMiddleware());


const handleCallOpenAi = async (message) => {
    const response = await chatModel.call([`Reply to this message: ${message}`])
    console.log(response?.content);
    return response?.content;

}   

slackEvents.on("message", async (event) => {
    console.log(event?.subtype, event.bot_id)
    console.log(event);
    if(!event?.subtype && !event.bot_id) {
        client.chat.postMessage({
            token,
            channel: event.channel,
            text: await handleCallOpenAi(event.text) || 'hello'
        })
    }
})





server.listen(PORT, () => {
    console.log(`listening on port : ${PORT}`);
})
