// Copyright (c) 2019 Cisco and/or its affiliates.

// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

// See README.md for configuration and launch instructions

// Tested using:
//
// Ubuntu Linux 19.04
// Node.js 10.15.0

require( 'dotenv' ).config();
const express = require( 'express' );
const webex = require( 'webex/env' );
const ngrok = require( 'ngrok' );
var request = require( 'request-promise-native' );

const app = express();
const port = process.env.PORT;

var publicUrl, botId;

async function sendStrategy( event ) {

    // Ignore memberships events for users other than our bot
    if ( event.resource == 'memberships' && event.data.personId !== botId ) return;
    // Ignore messages sent by our bot
    if ( event.resource == 'messages' && event.data.personId == botId ) return;

    try {

        // Retrieve the strategy from Oblique Strategies
        let html = await request( 'http://stoney.sb.org/eno/oblique.html' );

        // Scrape the strategy text out of the HTML page
        strategy = html.substring( html.indexOf( '<H3>')+4, html.indexOf( '</H3>') );
    }
    catch ( err ) {

        strategy = `Error retrieving strategy: ${ err }`;
        console.log( strategy );
    }

    message = {
        'roomId': event.data.roomId,
        'markdown': `"${ strategy }"`,
        'attachments': [ ]
    };

    // Card attachment based on the schema at https://adaptivecards.io/explorer/
    // The WYSISWYG designer is helpful as well: https://adaptivecards.io/designer/
    attachment = {
        "contentType": "application/vnd.microsoft.card.adaptive",
        "content": {
            "type": "AdaptiveCard",
            "version": "1.0",
            "backgroundImage": `${ publicUrl }/images/blacksquare.png`,
            "body": [
                {
                    "type": "Image",
                    "url": `${ publicUrl }/images/oblique.png`
                },
                {
                    "type": "TextBlock",
                    "text": `"${ strategy }"`,
                    "size": "large",
                    "weight": "bolder",
                    "color": "light",
                    "horizontalAlignment": "center"
                }
            ],
            "actions": [
                {
                    "type": "Action.Submit",
                    "title": "",
                    "id": "actRefresh",
                    "iconUrl": `${ publicUrl }/images/refresh_dark.png`,
                    "data": {
                        "action": "refresh"
                    }
                },
                {
                    "type": "Action.ShowCard",
                    "title": "",
                    "id": "actSettings",
                    "iconUrl": `${ publicUrl }/images/settings_dark.png`,
                    "card": {
                        "type": "AdaptiveCard",
                        "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
                        "body": [
                            {
                                "type": "TextBlock",
                                "text": "Settings",
                                "color": "Light",
                                "weight": "Bolder"
                            },
                            {
                                "type": "TextBlock",
                                "text": "Automatically send a new strategy on:",
                                "color": "Light"
                            },
                            {
                                "type": "Input.ChoiceSet",
                                "id": "days",
                                "choices": [
                                    {
                                        "title": "Sun",
                                        "value": "sunday"
                                    },
                                    {
                                        "title": "Mon",
                                        "value": "monday"
                                    },
                                    {
                                        "title": "Tues",
                                        "value": "tuesday"
                                    },
                                    {
                                        "title": "Wed",
                                        "value": "wednesday"
                                    },
                                    {
                                        "title": "Thur",
                                        "value": "thursday"
                                    },
                                    {
                                        "title": "Fri",
                                        "value": "friday"
                                    },
                                    {
                                        "title": "Sat",
                                        "value": "saturday"
                                    }
                                ],
                                "isMultiSelect": true
                            },
                            {
                                "type": "TextBlock",
                                "text": "at:",
                                "color": "Light"
                            },
                            {
                                "type": "Input.Time",
                                "id": "time",
                                "value": "10:00"
                            }
                        ],
                        "backgroundImage": `${ publicUrl }/images/greysquare.png`,
                        "actions": [
                            {
                                "type": "Action.Submit",
                                "id": "actSave",
                                "title": "Save",
                                "data": {
                                    "action": "settings"
                                }
                            }
                        ]
                    }
                }			        
            ]
        }
    };

    message.attachments.push( attachment );

    try {

        await webex.messages.create( message );
    }
    catch ( err ) {

        console.log( `Error creating message: ${ err }`);
    }
}

async function handleAttachmentActions( event ) {

    switch ( event.data.inputs.action ) {

        case 'refresh': 

            sendStrategy( event );
            break;

        case 'settings':

            // Saving the settings and scheduling automatic strategy posts 
            // is left as an exercise for the reader ;)
            console.log( event.data.inputs )
            break;
    }
}

async function setupWebexListeners() {

    try {

        await webex.memberships.listen();

        // Send a strategy when we're added to a new room
        webex.memberships.on( 'created', ( event ) => sendStrategy( event ) );
    
        await webex.messages.listen();

        // Post a new strategy on receiving any message (use @message in group spaces)
        webex.messages.on('created', ( event ) => sendStrategy( event ) );

        await webex.attachmentActions.listen();

        // Handle adaptive card attachments events
        webex.attachmentActions.on('created', ( event ) => handleAttachmentActions( event ) );
    }
    catch( err ) {

        console.error( `Unable to register for Webex events: ${ err }` );
    }
}

// Main program
// Wrap in an async function so we can await certain operations
(async function() {

    // Use ngrok to create a public tunnel and URL
    publicUrl = await ngrok.connect( port );

    console.log( 'Public URL: ' + publicUrl );

    // Retrieve bot person details, i.e. id
    let me = await webex.people.get( 'me' );
    botId = me.id;

    setupWebexListeners();

    // Serve static files/images from the www folder
    app.use( express.static( 'www' ) );

    // Startup the Express web server
    app.listen( port, () => console.log( `Bot listening on port ${port}!` ) );

})();

