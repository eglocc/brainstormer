require('dotenv').config();

const axios = require('axios');
const express = require('express');
const bodyParser = require('body-parser');
const qs = require('querystring');
const ticket = require('./ticket');
const industries = require('./data/industries.json');
const debug = require('debug')('brainstorming:index');

const app = express();

/*
 * Parse application/x-www-form-urlencoded && application/json
 */
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.listen(process.env.PORT, () => {
    console.log(`App listening on port ${process.env.PORT}!`);
});

app.post('/commands', (req, res) => {
    // extract the verification token, slash command text,
    // and trigger ID from payload
    const { token, text, trigger_id } = req.body;

    // check that the verification token matches expected value
    if (token === process.env.SLACK_VERIFICATION_TOKEN) {
        // create the dialog payload - includes the dialog structure, Slack API token,
        // and trigger ID
        const dialog = {
            token: process.env.SLACK_ACCESS_TOKEN,
            trigger_id,
            dialog: JSON.stringify({
                title: 'Submit a new idea',
                callback_id: 'submit-idea',
                submit_label: 'Submit',
                elements: [
                    {
                        label: 'Unmet need',
                        type: 'text',
                        name: 'need',
                        value: text,
                        hint: 'Unmet need',
                    },
                    {
                        label: 'Suggested solution',
                        type: 'text',
                        name: 'solution',
                        value: text,
                        hint: 'Suggested solution'
                    },
                    {
                        label: 'Solution method',
                        type: 'text',
                        name: 'method',
                        value: text,
                        hint: 'Solution method'
                    },
                    {
                        label: 'Industry',
                        type: 'select',
                        name: 'industry',
                        option_groups: industries
                    },
                ],
            }),
        };

        // open the dialog by calling dialogs.open method and sending the payload
        axios.post('https://slack.com/api/dialog.open', qs.stringify(dialog))
            .then((result) => {
                debug('dialog.open: %o', result.data);
                res.send('');
            }).catch((err) => {
            debug('dialog.open call failed: %o', err);
            res.sendStatus(500);
        });
    } else {
        debug('Verification token mismatch');
        res.sendStatus(500);
    }
});

/*
 * Endpoint to receive the dialog submission. Checks the verification token
 * and creates an idea
 */
app.post('/interactive-component', (req, res) => {
    const body = JSON.parse(req.body.payload);

    // check that the verification token matches expected value
    if (body.token === process.env.SLACK_VERIFICATION_TOKEN) {
        debug(`Form submission received: ${body.submission.trigger_id}`);

        // immediately respond with a empty 200 response to let
        // Slack know the command was received
        res.send('');

        // create idea
        ticket.create(body.user.id, body.submission);
    } else {
        debug('Token mismatch');
        res.sendStatus(500);
    }
});
