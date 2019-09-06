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

// Sample Java program demonstrating usage of the Cisco WebDialer SOAP API
// and Apache Axis to perform a <makeCallSoap> call, wait 5 seconds, then end the
// call with <endCallSoap>

// See README.md for configuration and launch instructions

// Tested using:
//
// Ubuntu Linux 19.04
// Node.js 10.15.0

const express = require('express');
const webex = require('webex/env');
const ngrok = require('ngrok');
var request = require("request-promise-native");
var bodyParser = require('body-parser');

const app = express();
const port = 3000;

var publicUrl = '';
var botId = '';

async function sendStrategy( roomId ) {

    try {

        let html = await request( 'http://stoney.sb.org/eno/oblique.html' );

        // Scrape the strategy text out of the HTML page
        strategy = html.substring( html.indexOf( '<H3>')+4, html.indexOf( '</H3>') );
    }
    catch ( err ) {

        strategy = `Error retrieving strategy: ${ err }`;

        console.log( strategy )
    }

    message = {
        "roomId": roomId,
        "markdown": `"${ strategy }"`,
        "attachments": [ ]
    }

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
                    "url": `${publicUrl}/images/oblique.png`
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
    }

    message.attachments.push( attachment );

    try {

        await webex.messages.create( message )
    }
    catch ( err ) {

        console.log( `Error creating message: ${ err }`)
    }

}

async function setupWebexListeners() {

    try {

        await webex.memberships.listen();

        // Send a sample strategy when we're added to a new room
        webex.memberships.on( 'created', ( event ) => sendStrategy( event.data.roomId ) );

        // Useful if implementing scheduled auto posts
        webex.memberships.on( 'deleted', ( event ) => { } );
    }
    catch( err ) { 

        console.error( `Unable to register for membership events: ${ err }` ) 
    };

    try {
    
        await webex.messages.listen();

        webex.messages.on('created', (event) => {

            // Check this isn't a message we sent
            if ( event.data.personId !== botId ) { 

                // Post a new strategy regardless of what the message to us is
                sendStrategy( event.data.roomId );
            }
        })
    }
    catch( err ) {

        console.error( `Unable to register for message events: ${ err }` );
    }
    
}

// Main program
// Wrap in an async function so we can await certain operations
(async function() {

    publicUrl = await ngrok.connect( port );

    console.log( 'Public URL: ' + publicUrl );

    try {

        let webhooks = await webex.webhooks.list();

        for ( let webhook in webhooks.items ) {

            await webex.webhooks.remove( webhooks.items[ webhook ] )
            .catch( ( err ) => {

                console.log( err )
            });
        }
    
        let webhook = await webex.webhooks.create( 
            {
                resource: 'attachmentActions',
                event: 'created',
                targetUrl: `${ publicUrl }/webhook`,
                name: 'Oblique Attachment Action Webhook'
            }
        );

        botId = webhook.createdBy;
    }
    catch ( err ) {

        console.log( `Error managing webhooks: ${ err }` );
        process.exit( 1 );
    }

    setupWebexListeners()

    // Helps parse request bodies into JSON objects
    app.use( bodyParser.json() )

    // Serve static files/images from the www folder
    app.use( express.static( 'www' ) )
    
    // Handler for POST requests to the /webhook path
    app.post( '/webhook', ( req, res ) => {

        // Retrieve the full attachment action data using the body.data.id value
        webex.attachmentActions.get( req.body.data.id )
        .then( ( body ) => {

            switch ( body.inputs.action ) {

                case 'refresh': 

                    sendStrategy( req.body.data.roomId );
                    break;

                case 'settings':

                    console.log( body.inputs )
                    // Saving the settings and scheduling automatic strategy posts 
                    // is left as an exercise for the programmer ;)
                    break;
            }
        })
        .catch( ( err ) => {

            console.log( `Error getting attachment action: ${ err ? err : res.statusCode +': ' + res.statusMessage }` )
        })

        // Return HTTP 202 Accepted
        res.status( 202 ).send();
    })

    app.listen(port, () => console.log( `Bot listening on port ${port}!` ) )

})();

