const axios = require('axios');
const debug = require('debug')('brainstormer:ticket');
const qs = require('querystring');
const users = require('./users');

/*
 * Save idea to Google Sheets
 *
 */
const saveIdea = (idea) => {
    axios.post(`https://script.google.com/macros/s/${process.env.APPS_SCRIPT_WEB_APP_ID}/exec`,
        { idea },
        { params: {
                token: process.env.APPS_SCRIPT_WEB_APP_ID,
                need: idea.need,
                solution: idea.solution,
                method: idea.method,
                industry: idea.industry,
                userName: idea.userName,
            },
        });
}

/*
 *  Send idea creation confirmation via
 *  chat.postMessage to brainstorming channel
 */
const sendConfirmation = (idea) => {
    axios.post('https://slack.com/api/chat.postMessage', qs.stringify({
        token: process.env.SLACK_ACCESS_TOKEN,
        channel: "brainstorming",
        text: 'Idea created!',
        attachments: JSON.stringify([
            {
                title: `Idea created for ${idea.userName}`,
                text: idea.text,
                fields: [
                    {
                        title: 'Need',
                        value: idea.need,
                    },
                    {
                        title: 'Solution',
                        value: idea.solution,
                    },
                    {
                        title: 'Method',
                        value: idea.method,
                    },
                    {
                        title: 'Industry',
                        value: idea.industry,
                    },
                ],
            },
        ]),
    })).then((result) => {
        debug('sendConfirmation: %o', result.data);
    }).catch((err) => {
        debug('sendConfirmation error: %o', err);
        console.error(err);
    });
};

// Create idea. Call users.find to get the user's real name
// from their user ID
const create = (userId, submission) => {
    const idea = {};

    const fetchUserRealName = new Promise((resolve, reject) => {
        users.find(userId).then((result) => {
            debug(`Find user: ${userId}`);
            resolve(result.data.user.profile.real_name);
        }).catch((err) => { reject(err); });
    });

    fetchUserRealName.then((result) => {
        idea.userId = userId;
        idea.userName = result;
        idea.need = submission.need;
        idea.solution = submission.solution;
        idea.method = submission.method;
        idea.industry = submission.industry;
        sendConfirmation(idea);
        saveIdea(idea);

        return idea;
    }).catch((err) => { console.error(err); });
};

module.exports = { create };
