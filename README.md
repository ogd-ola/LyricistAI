# LyricistAI 🎶
**Breaking the Choral Rehearsal Bottleneck with AI-Driven Vocal Arrangements.**

## 💡 The Problem
In choral music that exists in the context of oral tradition, the biggest hurdle isn't the performance—it's the rehearsal. 
Choir directors and singers often spend hours (sometimes 2+ hours per session) simply mastering and teaching parts by ear. This bottleneck significantly limits 
vocalists' ability to conduct in-depth practice of their music efficiently.

## 🚀 The Solution
**LyricistAI** is a full-stack workspace that transforms a single solo melody into a structured rehearsal suite. By recording one lead vocal, the platform automatically generates a workspace with synchronized parts. 

By analyzing the lead track's tempo and timing, LyricistAI ensures that every singer is working from the same rhythmic foundation. Regardless of the language you sing in, the moment a melody is captured, the ensemble has a structured environment to start practicing.

## 🛠️ Tech Stack
* **Backend:** Python (`Librosa`, `NumPy`) for signal processing and tempo extraction.
* **Frontend:** JavaScript (DOM Manipulation) & HTML5 Audio for synchronized playback.
* **Database & Sync:** Google Firebase/Firestore for real-time metadata orchestration.
* **Audio Hosting:** Cloudinary for secure, high-performance audio storage.

## ✨ Key Features
* **AI Tempo Detection:** Automatically calculates BPM from the lead vocal to establish a master rehearsal clock.
* **Real-Time Cloud Orchestration:** Uses Firestore listeners to instantly push backend analysis to the frontend, creating tracks dynamically as they are processed.
* **Synchronized Multi-Track Playback:** A custom JavaScript "Play All" engine that resets and triggers all vocal parts simultaneously to ensure alignment.
* **Universal Design:** Language-agnostic processing—focused on the universal physics of sound and rhythm.

## 🏗️ Future Roadmap
- [ ] Real-time DSP pitch shifting.
- [ ] Automated SATB (Soprano, Alto, Tenor, Bass) part generation.
- [ ] Mobile-first rehearsal interface for on-the-go practice.

---
**Developed at BlackWPT's "Blackathon 2026**
