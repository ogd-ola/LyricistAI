//import { FIREBASE_CONFIG, CLOUDINARY_CONFIG } from './config.js';

// Mock data structure to simulate what the Backend will return
const mockResponse = {
    tracks: [
        { name: "Lead Vocal", url: "lead.mp3", solfege: "Do - Re - Mi" },
        { name: "High Harmony", url: "high.mp3", solfege: "Mi - Fa - Sol" },
        { name: "Low Harmony", url: "low.mp3", solfege: "Do - Ti - La" }
    ]
};

let currentUser = null;

// Listen for the user session
firebase.auth().onAuthStateChanged((user) => {
    currentUser = user;
});

// --- 1. Master Control Logic ---
const playAll = () => {
    const audios = document.querySelectorAll('audio');
    audios.forEach(a => {
        a.currentTime = 0; // Sync start
        a.play();
    });
};

const pauseAll = () => {
    document.querySelectorAll('audio').forEach(a => a.pause());
};

document.getElementById('playAllBtn').addEventListener('click', playAll);
document.getElementById('pauseAllBtn').addEventListener('click', pauseAll);

// --- 2. File Validation & Generation ---
document.getElementById('generateBtn').addEventListener('click', async () => {
    const fileInput = document.getElementById('audioUpload');
    const file = fileInput.files[0];
    const lyrics = document.getElementById('lyricsInput').value;
    const progressBar = document.getElementById('progressBar');
    const progressContainer = document.getElementById('progressContainer');

    if (!file || !currentUser) return alert("Please sign in and select a file!");
    
    // --- 1. Validation ---
    const allowedExtensions = ['.mp3', '.m4a', '.mpeg'];
    const allowedTypes = ['audio/mpeg', 'audio/mp4', 'audio/x-m4a'];
    const isValid = allowedTypes.includes(file.type) || 
                    allowedExtensions.some(ext => file.name.toLowerCase().endsWith(ext));

    if (!isValid) return alert("Please upload an MP3, M4A, or MPEG file.");

    const maxSize = 10 * 1024 * 1024; 
    if (file.size > maxSize) return alert("File is too large. Limit is 10MB.");

    // --- 2. Cloudinary Config ---
    // Replace these with your actual details from the Cloudinary Dashboard
    const CLOUD_NAME = "dktsxxvkz"; 
    const UPLOAD_PRESET = "lyricist_preset";
    const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`;

    progressContainer.style.display = 'block';
    progressBar.style.width = '20%';
    document.getElementById('progressText').innerText = "Uploading to Cloudinary...";
    
    try {
        // --- 3. Cloudinary Upload ---
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', UPLOAD_PRESET);

        const response = await fetch(CLOUDINARY_URL, {
            method: 'POST',
            body: formData
        });

        const cloudData = await response.json();

        if (!response.ok) {
            throw new Error(cloudData.error?.message || "Cloudinary upload failed");
        }

        const audioUrl = cloudData.secure_url;

        progressBar.style.width = '50%';
        document.getElementById('progressText').innerText = "Sending to AI Engine...";

        // --- 4. Firestore Job Creation ---
        const docRef = await firebase.firestore().collection("harmonyJobs").add({
            userId: currentUser.uid,
            originalAudio: audioUrl,
            lyrics: lyrics,
            status: "processing",
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        listenForChanges(docRef.id);

    } catch (error) {
        console.error("Process Failed:", error);
        alert("Error: " + error.message);
        progressContainer.style.display = 'none';
    }
});

// --- 3. Job Tracking ---
function listenForChanges(jobId) {
    // Store the unsubscribe function
    const unsub = firebase.firestore().collection("harmonyJobs").doc(jobId).onSnapshot((doc) => {
        const data = doc.data();
        if (!data) return;

        // Feedback for 'working' status
        if (data.status === "working") {
            document.getElementById('progressBar').style.width = '70%';
            document.getElementById('progressText').innerText = "AI is thinking...";
        }

        if (data.status === "completed") {
            document.getElementById('progressBar').style.width = '100%';
            document.getElementById('progressText').innerText = "Generation Complete!";
            if (data.tracks && data.tracks.length > 0) {
                renderTracks(data.tracks);
                unsub(); // <--- STOP listening so the UI stays locked
            }
        } else if (data && data.status === "error") {
            alert("AI Generation failed: " + data.message);
            document.getElementById('progressContainer').style.display = 'none';
            unsub();
        }
    });
}

// --- 4. Dynamic Rendering ---
function renderTracks(tracks) {
    const container = document.getElementById('tracksContainer');
    container.innerHTML = '';

    tracks.forEach((track, index) => {
        const safeId = `audio-track-${index}`; // Safe ID without spaces

        const row = document.createElement('div');
        row.className = 'track-row';
        row.innerHTML = `
            <div class="track-info">
                <span><strong>${track.name}</strong></span>
                <div class="solfege-mini">${track.solfege}</div>
            </div>
            <audio id="${safeId}" src="${track.url}" controls></audio>
            <div class="track-btns">
                <button onclick="toggleMute('${safeId}')">Mute</button>
                <button onclick="soloTrack('${safeId}')">Solo</button>
            </div>
        `;
        container.appendChild(row);
    });
}

function soloTrack(id) {
    const allAudios = document.querySelectorAll('audio');
    allAudios.forEach(a => {
        a.muted = (a.id !== id);
    });
}

function toggleMute(id) {
    const el = document.getElementById(id);
    el.muted = !el.muted;
}

// --- 4. Viewing Modes ---
function switchView(mode) {
    const display = document.getElementById('solfegeOutput');
    if (mode === 'sheet') {
        display.classList.add('sheet-mode');
        display.innerHTML = "<h4>Sheet Music View</h4><p>[Music Staff Visualization Coming Soon]</p>";
    } else {
        display.classList.remove('sheet-mode');
        display.innerHTML = "Waiting for generation...";
    }
}