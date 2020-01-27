# webex-card-sample

## Overview

Implements a Webex Teams messaging bot, that can post an [adaptive card](https://adaptivecards.io/)
containing an 'oblique strategy' scraped from [http://stoney.sb.org/eno/oblique.html](http://stoney.sb.org/eno/oblique.html).

![screenshot](screenshot.png)

The adaptive card features a 'refresh' button to request a new card/strategy, and a 'settings' button that opens a sub-card where scheduling options can be selected (actually implementing persistence and auto-posting based on the schedule choices is left as an exercise).

Note, this project uses the Webex Teams [node.js SDK](https://developer.webex.com/docs/sdks/node) for posting messages and listening for new membership/message/attachmentActions events via websocket.

[Webex for Developers Site](https://developer.webex.com/)

## Getting started

- Install Node.js 10.15.0+ (should work on any version supporting async/await)

    On Windows, choose the option to add to `PATH` environment variable

- The project was built/tested using [Visual Studio Code](https://code.visualstudio.com/)

- Clone this repo to a directory on your PC:

    ```bash
    git clone https://github.com/CiscoDevNet/webex-card-sample.git
    ```

- Dependency Installation:

    ```bash
    cd webex-card-sample
    npm install
    ```
  
- Open the project in VS Code:

    ```bash
    code .
    ```

- Create a [Webex Teams bot](https://developer.webex.com/my-apps/new) and copy the bot access token

- In VS Code:

    1. Rename the `.env.example` file as `.env`, and open it for editing:

        - Paste in your bot access token

        - (Optional) Paste in your app's publically reachable URL.  If not specified, the app will use Ngrok to dynamically create a reverse tunnel instead (see caveats in [Hints](#hints) below)

        - Be sure to save the file

    2. Run the sample by pressing **F5**, or by opening the Debug panel and clicking the green 'Launch' arrow

- In your favorite Webex Teams client, add the new bot to a test space/room - it should automatically post a strategy when added.  Sending any message to the bot (remember to @mention the bot if in a group space) will trigger it to send a new strategy

- After a strategy is posted, you can click on the 'refresh' icon to request another strategy.  You can click on 'settings', play with the options and click the 'save' button, however the sample app does not implement actually saving/scheduling posts automatically (it just prints the data to the console)

## Hints

- As the application creates cards featuring some images (for background and button icons) which must be served by a publically reachable web server, this sample uses the [Ngrok for node](https://www.npmjs.com/package/ngrok) package to create a reverse proxy tunnel on startup - this may have implications for your firewall/security policy.

    A production application would typically host an application like this on a cloud platform or have an IT-vetted reverse proxy configured, etc

- As a result of the above, any card assets which are statically served by this app (i.e. title, background and icon images) will only appear in the Webex Teams client when the app is running.  Further, as the public URL provided by Ngrok is different on each run, the asset URLs present in previously posted cards will no longer work when the app is restarted later

[![published](https://static.production.devnetcloud.com/codeexchange/assets/images/devnet-published.svg)](https://developer.cisco.com/codeexchange/github/repo/CiscoDevNet/webex-card-sample)