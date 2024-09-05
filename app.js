require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const Recaptcha = require("express-recaptcha").RecaptchaV2;
const path = require('path');

const app = express();
const port = 3334;

// Load environment variables
const ZENDESK_SUBDOMAIN = process.env.ZENDESK_SUBDOMAIN;
const ZENDESK_USER_EMAIL = process.env.ZENDESK_USER_EMAIL;
const ZENDESK_API_TOKEN = process.env.ZENDESK_API_TOKEN;
const RECAPTCHA_SITE_KEY = process.env.RECAPTCHA_SITE_KEY;
const RECAPTCHA_SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY;

const recaptcha = new Recaptcha(RECAPTCHA_SITE_KEY, RECAPTCHA_SECRET_KEY, { callback: 'onSubmit' });

app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.post("/submit", recaptcha.middleware.verify, async (req, res) => {
    if (!req.recaptcha.error) {
        // Set default values or make the fields optional
        const subject = req.body.subject || 'No Subject Provided';
        const description = req.body.description || 'No Description Provided';

        const options = {
            method: "post",
            url: `https://${ZENDESK_SUBDOMAIN}.zendesk.com/api/v2/requests.json`,
            headers: {
                "Content-Type": "application/json"
            },
            auth: {
                username: ZENDESK_USER_EMAIL + '/token',
                password: ZENDESK_API_TOKEN
            },
            data: {
                request: {
                    subject: subject,  // Use the default or provided subject
                    comment: {
                        body: description // Use the default or provided description
                    },
                    requester: {
                        name: req.body.name,
                        email: req.body.email,
                    },
                    custom_fields: [
                        {
                            id: '9315317141019',
                            value: req.body.company
                        },
                        {
                            id: '26548792763419',
                            value: req.body.teamSize
                        },
                        {
                            id: '28933005789851',
                            value: req.body.product
                        }
                    ]
                }
            }
        };

        try {
            const response = await axios(options);
            console.log("Zendesk response:", response.data);
            res.redirect('/formresponse.html');
        } catch (error) {
            console.error("Error submitting to Zendesk:", error.response ? error.response.data : error.message);
            res.status(500).send("Error submitting to Zendesk");
        }
    } else {
        console.error("reCAPTCHA verification failed:", req.recaptcha.error);
        res.status(400).send("reCAPTCHA verification failed");
    }
});






app.listen(port, () => {
    console.log(`Server running on port ${port}. Visit http://localhost:${port}`);
});



