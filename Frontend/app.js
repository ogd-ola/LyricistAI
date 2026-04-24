// Mock data structure to simulate what the Backend will return
const mockResponse = {
    tracks: [
        { name: "Lead Vocal", url: "lead.mp3", solfege: "Do - Re - Mi" },
        { name: "High Harmony", url: "high.mp3", solfege: "Mi - Fa - Sol" },
        { name: "Low Harmony", url: "low.mp3", solfege: "Do - Ti - La" }
    ]
};

document.getElementById('generateBtn').addEventListener('click', () => {
    // In production, you would use fetch() to call your Python API
    console.log("Generating...");
    renderTracks(mockResponse.tracks);
});

function renderTracks(tracks) {
    const container = document.getElementById('tracksContainer');
    const solfegeOutput = document.getElementById('solfegeOutput');
    container.innerHTML = '';
    solfegeOutput.innerHTML = '';

    tracks.forEach(track => {
        // Create Track UI
        const row = document.createElement('div');
        row.className = 'track-row';
        row.innerHTML = `
            <span>${track.name}</span>
            <audio id="audio-${track.name}" src="${track.url}" controls></audio>
            <button onclick="toggleMute('audio-${track.name}')">Mute/Unmute</button>
        `;
        container.appendChild(row);

        // Append Solfege
        const span = document.createElement('div');
        span.innerHTML = `<strong>${track.name}:</strong> ${track.solfege}`;
        solfegeOutput.appendChild(span);
    });
}

function toggleMute(id) {
    const el = document.getElementById(id);
    el.muted = !el.muted;
}