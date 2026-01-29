/**
 * DRAFT CLOUD FUNCTIONS FOR ATTENDANCE SYSTEM
 * Deploy these to your Firebase Functions environment to enable backend push notifications.
 */

const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();

// 1. Notify Admin when a new Attendance Request is created
exports.onAttendanceRequestCreated = functions.firestore
    .document("attendanceRequests/{requestId}")
    .onCreate(async (snap, context) => {
        const request = snap.data();
        const payload = {
            notification: {
                title: "New Attendance Request! 📝",
                body: `${request.userName} is requesting approval for a session.`,
                click_action: "https://your-app-url.com/dashboard",
            },
        };

        // Send to a topic 'admins' (ensure admins subscribe to this topic on client)
        // OR send to specific admin tokens fetched from Firestore
        return admin.messaging().sendToTopic("admins", payload);
    });

// 2. Notify User when their request is Approved/Rejected
exports.onAttendanceRequestUpdated = functions.firestore
    .document("attendanceRequests/{requestId}")
    .onUpdate(async (change, context) => {
        const newData = change.after.data();
        const previousData = change.before.data();

        if (newData.status === previousData.status) return null;

        const userRef = await admin.firestore().collection("users").doc(newData.userId).get();
        const userToken = userRef.data().fcmToken;

        if (!userToken) {
            console.log("No token for user", newData.userId);
            return null;
        }

        let title = "Attendance Update";
        let body = "Your status has changed.";

        if (newData.status === "approved") {
            title = "Attendance Approved! ✅";
            body = "You have been successfully marked present.";
        } else if (newData.status === "rejected") {
            title = "Request Rejected ❌";
            body = "Your attendance request was declined. Please check with the admin.";
        }

        const payload = {
            notification: {
                title: title,
                body: body,
                click_action: "https://your-app-url.com/dashboard",
            },
        };

        return admin.messaging().sendToDevice(userToken, payload);
    });

// 3. Notify Users when a New Session is Created (Location-Based)
const geolib = require('geolib');

exports.onSessionCreated = functions.firestore
    .document("sessions/{sessionId}")
    .onCreate(async (snap, context) => {
        const session = snap.data();
        const sessionLocation = session.location; // Expected: { lat: number, lng: number }

        if (!sessionLocation || !sessionLocation.lat || !sessionLocation.lng) {
            console.log("No location data for session", snap.id);
            return null;
        }

        // Fetch all users with tokens
        const usersSnap = await admin.firestore().collection('users').get(); // Optimization: In real app, query only users with tokens

        const tokens = [];
        usersSnap.forEach(doc => {
            const user = doc.data();
            if (user.fcmToken && user.location) {
                const distance = geolib.getDistance(
                    { latitude: sessionLocation.lat, longitude: sessionLocation.lng },
                    { latitude: user.location.lat, longitude: user.location.lng }
                );

                // Notify if within 10km (10000 meters)
                if (distance <= 10000) {
                    tokens.push(user.fcmToken);
                }
            }
        });

        if (tokens.length === 0) {
            console.log("No users found nearby for session", snap.id);
            return null;
        }

        const payload = {
            notification: {
                title: "New Session Nearby! 📍",
                body: `"${session.name}" is happening near you!`,
                click_action: "https://gdg-attendance-system.web.app/dashboard",
            },
        };

        // Send to multiple devices
        return admin.messaging().sendToDevice(tokens, payload);
    });
