import os
import requests
import firebase_admin
from firebase_admin import credentials, firestore
import time
import tempfile
import logging
import librosa
import numpy as np

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# 1. Initialize Firebase Admin
try:
    cred = credentials.Certificate("serviceAccountKey.json")
    firebase_admin.initialize_app(cred)
    db = firestore.client()
    logger.info("🚀 AI Harmony Engine Active...")
except Exception as e:
    logger.error(f"Failed to initialize Firebase: {e}")
    exit(1)

def process_audio(doc_id, data):
    try:
        logger.info(f"--- 🎵 Processing Job: {doc_id} ---")
        doc_ref = db.collection('harmonyJobs').document(doc_id)
        doc_ref.update({'status': 'working'})

        audio_url = data.get('originalAudio')
        if not audio_url:
            raise ValueError("No originalAudio URL found in document")

        # 1. Download the file
        temp_dir = tempfile.gettempdir()
        local_filename = os.path.join(temp_dir, f"{doc_id}.mp3")
        logger.info(f"📥 Downloading to system temp: {local_filename}")
        response = requests.get(audio_url, timeout=15)
        with open(local_filename, 'wb') as f:
            f.write(response.content)

        # 2. Analyze Audio with Librosa
        logger.info(f"📊 Analyzing frequencies...")
        y, sr = librosa.load(local_filename, sr=22050) # Set a consistent sample rate
        
        # Placeholder for AI logic: Detect tempo
        tempo, _ = librosa.beat.beat_track(y=y, sr=sr)
        
        # --- THE CRITICAL FIX ---
        # librosa.beat.beat_track can return tempo as a numpy array.
        # We need to extract the scalar value.
        if isinstance(tempo, (np.ndarray, list)):
            final_tempo = float(tempo[0])
        else:
            final_tempo = float(tempo)
            
        logger.info(f"⚡ Tempo Detected: {final_tempo:.2f} BPM")

        # 3. Construct results for Frontend
        processed_tracks = [
            {
                "name": "Lead Vocal", 
                "url": audio_url, 
                "solfege": f"Analyzed Tempo: {round(final_tempo)} BPM"
            },
            {
                "name": "AI Harmony", 
                "url": audio_url, # Placeholder until Spleeter/Harmony logic is added
                "solfege": "Harmony Track Generated"
            }
        ]

        # 4. Update Firestore
        doc_ref.update({
            'status': 'completed',
            'tracks': processed_tracks,
            'tempo': round(final_tempo, 2),
            'processedAt': firestore.SERVER_TIMESTAMP
        })

        # 5. Cleanup
        if os.path.exists(local_filename):
            os.remove(local_filename)
        
        logger.info(f"✅ Done! Frontend should now display tracks for {doc_id}")

    except Exception as e:
        logger.error(f"❌ Crash on job {doc_id}: {e}")
        doc_ref.update({'status': 'error', 'message': str(e)})

# 2. Listen for new 'processing' jobs
def watch_jobs():
    logger.info("📡 Listening for new requests...")
    jobs_query = db.collection('harmonyJobs').where('status', '==', 'processing')

    def on_snapshot(col_snapshot, changes, read_time):
        for change in changes:
            if change.type.name == 'ADDED':
                doc = change.document
                process_audio(doc.id, doc.to_dict())

    # Watch this query
    jobs_query.on_snapshot(on_snapshot)

    # Keep the script running
    while True: time.sleep(1)

if __name__ == "__main__":
    watch_jobs()