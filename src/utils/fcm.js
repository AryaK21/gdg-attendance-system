import * as jose from 'jose';

const SERVICE_ACCOUNT = {
    "project_id": "YOUR_PROJECT_ID",
    "client_email": "YOUR_CLIENT_EMAIL",
    "private_key": "-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY\n-----END PRIVATE KEY-----\n"
};

/**
 * Generates an OAuth2 Access Token for Firebase Messaging
 */
async function getAccessToken() {
    const iat = Math.floor(Date.now() / 1000);
    const exp = iat + 3600;

    const jwt = await new jose.SignJWT({
        iss: SERVICE_ACCOUNT.client_email,
        sub: SERVICE_ACCOUNT.client_email,
        scope: 'https://www.googleapis.com/auth/firebase.messaging',
        aud: 'https://oauth2.googleapis.com/token',
        iat,
        exp,
    })
        .setProtectedHeader({ alg: 'RS256' })
        .sign(await jose.importPKCS8(SERVICE_ACCOUNT.private_key, 'RS256'));

    const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            assertion: jwt,
        }),
    });

    const data = await response.json();
    return data.access_token;
}

/**
 * Sends a notification directly via FCM v1 API
 */
export async function sendFCMNotification(tokens, title, body) {
    if (!tokens || tokens.length === 0) return;

    try {
        const accessToken = await getAccessToken();
        const url = `https://fcm.googleapis.com/v1/projects/${SERVICE_ACCOUNT.project_id}/messages:send`;

        // FCM v1 doesn't support multiple tokens in one request for 'send'
        // We have to loop or use topics, but for a prototype, looping over tokens is fine.
        const sendPromises = tokens.map(token => {
            const payload = {
                message: {
                    token: token,
                    notification: {
                        title: title,
                        body: body,
                    },
                    webpush: {
                        fcm_options: {
                            link: '/dashboard'
                        }
                    }
                }
            };

            return fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });
        });

        const results = await Promise.all(sendPromises);
        console.log(`Sent ${results.length} notifications via FCM v1.`);
    } catch (error) {
        console.error('Error sending FCM notification:', error);
    }
}
