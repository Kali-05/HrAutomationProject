const { google } = require("googleapis");
const path = require("path");
const fs = require("fs").promises;
const readline = require("readline");

const CREDENTIALS_PATH = path.join(__dirname, "credentials.json");
const TOKEN_PATH = path.join(__dirname, "token.json");

const loadCredentials = async () => {
    const credentialsContent = await fs.readFile(CREDENTIALS_PATH);
    return JSON.parse(credentialsContent);
};

const authorize = async () => {
    const credentials = await loadCredentials();
    const { client_secret, client_id, redirect_uris } = credentials.installed;
    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: "offline",
        scope: [
            "https://www.googleapis.com/auth/gmail.modify",
            "https://www.googleapis.com/auth/gmail.send"
        ]
    });
    console.log("Authorize this app by visiting this url:", authUrl);

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    rl.question("Enter the code from that page here: ", async (code) => {
        rl.close();
        const { tokens } = await oAuth2Client.getToken(code);
        await fs.writeFile(TOKEN_PATH, JSON.stringify(tokens));
        console.log("Token stored to", TOKEN_PATH);
    });
};

authorize();