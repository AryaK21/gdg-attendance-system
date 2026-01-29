importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

const firebaseConfig = {
    apiKey: "AIzaSyBJMdV_uvqIsSaQ4QY4fIhtpJpIo3apaxU",
    authDomain: "gdg-attendance-system.firebaseapp.com",
    projectId: "gdg-attendance-system",
    storageBucket: "gdg-attendance-system.firebasestorage.app",
    messagingSenderId: "155580839828",
    appId: "1:155580839828:web:26479e6b9de40d4747c181",
    measurementId: "G-PJVRR5S0F8"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

// Handler for background messages
messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);
    const notificationTitle = payload.notification.title;
    const notificationOptions = {
        body: payload.notification.body,
        icon: '/pwa-192x192.png'
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});
