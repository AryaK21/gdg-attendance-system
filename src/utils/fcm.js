import * as jose from 'jose';

const SERVICE_ACCOUNT = {
    "project_id": "gdg-attendance-system",
    "client_email": "firebase-adminsdk-fbsvc@gdg-attendance-system.iam.gserviceaccount.com",
    "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC3xQfe39KgwukU\nEP7f0Z8XHabbIeTIJr/v7zS4NUkpUkn8lPRcv8IsJqb88iIwdBZMntgsnVTjSf/k\nzVoCornjV+w0X03q5/qZCiw3H2yqcb0nC96L5gk+6USNwKc3Qh8WeKKOBZa4BjZa\nd2TuQAcxDRoiFdhRYHYCs4rwnkZzKx33M8oKke27ZqonMPWOCt53x6UovENOfKsv\n5Hy6Ox5W8xt1X89GqsmOd6ZFTYJ9hJoiSyejuCFUuWj2j+zyil87wOD5bGKL9eX+\n26xI4nP1f4SC7VoK+0A1l4yv4Yvq2U9f5Ud3frw5cFdLhObaO+mnPEvp8X1l0YjJ\n+V8Gy3RLAgMBAAECggEAFh31AgpfD7EVmzAmdKqGYqJTdBkir0IWpJpd9nOXUA1S\n0T7eIBGGHYkzXMsJeVpnWqZdbxUqY8aCsTdTx3BtPeLVj0IPHx/3RZb3VlUGX4cb\n1Ei16pFveG5brVHL7jcbhblUGxKqHpDE1uN6tr/m/azNgd+uLrEU0uNn6+ioovCP\nyFkZgFHh0jMfWXwk9Z/NeeKK2ga29BhV2gLdkgmONx+O3EUNVSKtJMrOlu0aYnAx\n4Bhv7TF2rWf/Rbx9MmE0XybCv+pVfkaQp6HA5cyHoIC5pMrieW5veg334MK+4GLR\n6Og+NubBpo2KjpCh7ZMvq3S0pohT0XGzdXnwXQlxBQKBgQDgMcKEhWj6zVTvc8w4\nrtnnLm15UDhd7o/iIcYfV6TkddJO7EtAlEerG1zUY+r8dF7QsUXvZaamZrmr7Bu5\ni4Q+8hjDJYOTGyfDmE/vidWCndNrv3BztJzGqtTVZMePKaqFqH9HjYd9J3wBebps\nZlu5ibAaKlYIdVk5H4ZpgzQE7wKBgQDR1yKR0+tTa5R+ntUi23+8A9ihSX5tgMs+\nTxbdXSmaPJkAeKkCfsf8A674k74roIWSYs+A7KOBfXeHfxPbKF65VzP1TNsE8QW8\nBtGQ+iPLYjWLfxnudRuy3EKtd8YVQUQBPfEJ/KlhuTqEx83vZxFmcV7RGgw7QWZA\nmawi32aeZQKBgH0iyRP28xWqLlJJLCAnWHD1NR2VbSDg22a4u0EbRmpOaUisE4TE\nPwx+hV33N14aBiIuEH8DGfWfONuBOihiezo3HyMteTdO3O8LwPJO2OHC/hMSE85B\nbZBmIc3KJqj99LQNzJ0/nfR5aXnZW/jNWT1CYQz5vHOULGz576hNF2f5AoGARemi\nl+l+TyXZrLIomtt83Fx/sYT1/W/ax2C8YnZmpP+pjlGlJbKt2JY1lpZK1ug9eH85\nWV/+PedaiqdZKzxxCtk183Vux1+yJGo1KlNc16dZ5acsMZmM5/Ogt4DfWzeKe8ty\nYnxuxqNbDuAvCaNSVcpR5+MAzkFE2yMYCepam00CgYEAr0XwggiDZpIyXiErL7PE\nAq9ySaAi+tA5QADLo9YI7BAUtwYXRZdLRz09YBt4wt8LArX7laoq0EYFEU2fWGiG\nWQWj9iJK5mTeNVyUfkpIwNPO2OkBdXIAKU4Kahx0fkV+BqQepetOUlkfXwBq5kJz\ndppmqiw5Orm3E8qZVYzBBME=\n-----END PRIVATE KEY-----\n"
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
