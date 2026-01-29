import { useState, useEffect } from 'react';
import { messaging, db, auth } from '../firebase/firebase';
import { getToken, onMessage } from 'firebase/messaging';
import { doc, setDoc, updateDoc } from 'firebase/firestore';

export const useNotifications = () => {
    const [permission, setPermission] = useState(Notification.permission);

    const requestPermission = async () => {
        try {
            const permissionResult = await Notification.requestPermission();
            setPermission(permissionResult);
            if (permissionResult === 'granted') {
                // Register Service Worker explicitly
                const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');

                const token = await getToken(messaging, {
                    vapidKey: 'BNVdDy-kVvXRTiwo9S09t2padHuWbW-dYABwMrTEL-QobV3iIOZKxKKm0akrz2YvNoxW9AU7-yHAxIddwfHoKWY',
                    serviceWorkerRegistration: registration
                });
                console.log('FCM Token:', token);

                // Save token and initial location
                await saveTokenAndLocation(token);
            }
        } catch (error) {
            console.error('Error requesting notification permission:', error);
        }
    };

    const saveTokenAndLocation = async (token) => {
        if (!auth.currentUser) return;

        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(async (position) => {
                const { latitude, longitude } = position.coords;
                const userRef = doc(db, 'users', auth.currentUser.uid);
                await setDoc(userRef, {
                    fcmToken: token,
                    location: {
                        lat: latitude,
                        lng: longitude,
                        updatedAt: new Date().toISOString()
                    }
                }, { merge: true });
            }, (error) => {
                console.error("Error getting location:", error);
                // Still save token if location fails
                const userRef = doc(db, 'users', auth.currentUser.uid);
                setDoc(userRef, { fcmToken: token }, { merge: true });
            });
        }
    };

    useEffect(() => {
        onMessage(messaging, (payload) => {
            console.log('Message received. ', payload);
            new Notification(payload.notification.title, {
                body: payload.notification.body,
                icon: '/pwa-192x192.png'
            });
        });
    }, []);

    // Refresh location periodically or on significant movement could be added here

    return { permission, requestPermission };
};
