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
    const progressBar = document.getElementById('progressBar');
    const progressContainer = document.getElementById('progressContainer');

    // VALIDATION
    if (!file) return alert("Select a file first.");
    
    // Check format
    if (file.type !== "audio/mpeg" && !file.name.endsWith('.mp3')) {
        return alert("Please upload an MP3 file only.");
    }

    // Check size (Limit: 10MB)
    const maxSize = 10 * 1024 * 1024; 
    if (file.size > maxSize) {
        return alert("File is too large. Limit is 10MB.");
    }

    if (!currentUser) return alert("Please sign in to generate harmonies!");

    // UI Feedback
    progressContainer.style.display = 'block';
    progressBar.style.width = '20%';
    document.getElementById('progressText').innerText = "Uploading to cloud...";
    
    try {
        // 1. Upload file to Firebase Storage
        const storageRef = firebase.storage().ref(`users/${currentUser.uid}/uploads/${Date.now()}_${file.name}`);
        const snapshot = await storageRef.put(file);
        const audioUrl = await snapshot.ref.getDownloadURL();

        progressBar.style.width = '50%';
        document.getElementById('progressText').innerText = "Starting AI Engine...";

        // 2. Create the Firestore Job for the Backend to find
        const docRef = await firebase.firestore().collection("harmonyJobs").add({
            userId: currentUser.uid,
            originalAudio: audioUrl,
            lyrics: document.getElementById('lyricsInput').value,
            status: "processing",
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // 3. Wait for Backend to update this document
        listenForChanges(docRef.id);

    } catch (error) {
        console.error(error);
        alert("Upload failed: " + error.message);
        progressContainer.style.display = 'none';
    }
});

// --- 3. Job Tracking ---
function listenForChanges(jobId) {
    firebase.firestore().collection("harmonyJobs").doc(jobId).onSnapshot((doc) => {
        const data = doc.data();
        if (data && data.status === "completed") {
            document.getElementById('progressBar').style.width = '100%';
            document.getElementById('progressText').innerText = "Generation Complete!";
            renderTracks(data.tracks); 
        } else if (data && data.status === "error") {
            alert("AI Generation failed: " + data.message);
            document.getElementById('progressContainer').style.display = 'none';
        }
    });
}

// --- 4. Dynamic Rendering ---
function renderTracks(tracks) {
    const container = document.getElementById('tracksContainer');
    container.innerHTML = '';

    tracks.forEach(track => {
        const row = document.createElement('div');
        row.className = 'track-row';
        row.innerHTML = `
            <div class="track-info">
                <span><strong>${track.name}</strong></span>
                <div class="solfege-mini">${track.solfege}</div>
            </div>
            <audio id="audio-${track.name}" src="${track.url}" controls></audio>
            <div class="track-btns">
                <button onclick="toggleMute('audio-${track.name}')">Mute</button>
                <button onclick="soloTrack('audio-${track.name}')">Solo</button>
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