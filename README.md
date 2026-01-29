# Attendance Tracker - Location Verified

A web-based, location-verified attendance system built to reduce proxy attendance by ensuring users are physically present within a defined radius.

This project was built for GDG On Campus / Hackathon submission and focuses on practicality, deployability, and real-world relevance.

## 🚀 Features

- **Role-based Access:** distinct Admin and Client (Student) roles.
- **Location-verified Attendance:** Uses browser geolocation.
- **Radius-based Validation:** Prevents proxy marking by enforcing distance checks.
- **Live Session Management:** Admins can create and close attendance sessions in real-time.
- **Offline Technology:** Ensures functionality even with intermittent internet access.
- **Blockchain:** Secure and immutable record-keeping for attendance data.
- **Deployable:** Ready for Firebase Hosting.
- **Free:** No paid APIs or billing required.

## 👥 User Flow

### Admin
1. Create and manage attendance sessions.
2. Define the allowed attendance radius.
3. View real-time attendance records.
4. Close sessions when complete.

### Client (Student)
1. Log in from any device.
2. Grant location permissions.
3. Mark attendance (only allowed within the defined radius).
4. Automatically blocked if outside the range.

## 🛡 Proxy Prevention Logic

- **Geolocation API:** Uses the browser's native geolocation.
- **Haversine Formula:** accurately calculates the distance between the user and the session target.
- **Radius Check:** Attendance is rejected if the distance exceeds the configured limit.

## ⚠️ Limitations

- **Vertical Distance:** Floor-level differences are not tracked (due to GPS limitations), which may be an edge case in multi-story buildings.

## 🔮 Planned Improvements

- Wi-Fi fingerprinting.
- Bluetooth beacon validation.
- QR code + location verification.
- Periodic re-validation during active sessions.

## 🧰 Tech Stack

### Frontend
- **Vite + React**
- **Leaflet + OpenStreetMap**
- **JavaScript (ES6+)**
- **TailwindCSS / MUI** (Inferred from package.json)

### Backend / Infrastructure
- **Firebase Authentication**
- **Firebase Firestore**
- **Firebase Hosting**

## ⚙️ Setup & Deployment

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Run locally**
   ```bash
   npm run dev
   ```

3. **Build for production**
   ```bash
   npm run build
   ```

4. **Deploy to Firebase**
   ```bash
   firebase deploy
   ```

To Deploy you must replace the API Placeholers with the required APIs


## 🧪 Testing

- Verified on multiple devices and browsers.
- Firestore writes confirmed via Firebase Console.
- Location validation tested both within and outside the allowed radius.

---

**Live Demo:** [https://gdg-attendance-system.web.app/](https://gdg-attendance-system.web.app/)

---

> [!IMPORTANT]
> **Admin Access Credentials**
> 
> To access the **Admin Panel**, use the following credentials:
> - **ID:** `admin@gmail.com`
> - **Password:** `admin123`
>
> For the **Client (Student) Panel**, you can sign up or use any account.
