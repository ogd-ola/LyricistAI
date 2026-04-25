import os
import requests
import firebase_admin
from firebase_admin import credentials, firestore, storage
import time
import logging
import librosa

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# 1. Initialize Firebase Admin
try:
    cred = credentials.Certificate("serviceAccountKey.json")
    firebase_admin.initialize_app(cred, {
        'storageBucket': 'lyricistai-98f62.firebasestorage.app'
    })
    db = firestore.client()
    bucket = storage.bucket()
    logger.info("Firebase Admin initialized successfully.")
except Exception as e:
    logger.error(f"Failed to initialize Firebase: {e}")
    exit(1)

def process_audio(doc_id, data):
    try:
        logger.info(f"--- Processing Job: {doc_id} ---")
        doc_ref = db.collection('harmonyJobs').document(doc_id)
        doc_ref.update({'status': 'working'})

        audio_url = data.get('originalAudio')
        if not audio_url:
            raise ValueError("No originalAudio URL found in document")

        # 1. Download the file
        if not os.path.exists('temp'):
            os.makedirs('temp')
        
        local_filename = f"temp/{doc_id}.mp3"
        logger.info(f"📥 Downloading: {audio_url}")
        response = requests.get(audio_url)
        with open(local_filename, 'wb') as f:
            f.write(response.content)

        # 2. Analyze Audio with Librosa
        logger.info(f"🎵 Analyzing Audio...")
        y, sr = librosa.load(local_filename, sr=None)
        
        # Placeholder for AI logic: Detect tempo
        tempo, _ = librosa.beat.beat_track(y=y, sr=sr)
        tempo_val = float(tempo)
        logger.info(f"⚡ Detected Tempo: {tempo_val:.2f} BPM")

        # 3. Construct results for Frontend
        # We return the original audio as the "Lead" and "Harmony" for now
        processed_tracks = [
            {"name": "Lead Vocal", "url": audio_url, "solfege": f"Tempo: {tempo_val:.1f} BPM"},
            {"name": "AI Harmony", "url": audio_url, "solfege": "Harmony Data Pending"}
        ]

        # 4. Update Firestore
        doc_ref.update({
            'status': 'completed',
            'tracks': processed_tracks,
            'tempo': round(tempo_val, 2),
            'processedAt': firestore.SERVER_TIMESTAMP
        })

        # 5. Cleanup
        if os.path.exists(local_filename):
            os.remove(local_filename)
        
        logger.info(f"✅ Job {doc_id} Finished Successfully")

    except Exception as e:
        logger.error(f"Error processing job {doc_id}: {e}")
        doc_ref.update({
            'status': 'error',
            'message': str(e)
        })

# 2. Listen for new 'processing' jobs
def watch_jobs():
    logger.info("Watching for new harmony requests...")
    jobs_query = db.collection('harmonyJobs').where('status', '==', 'processing')

    def on_snapshot(col_snapshot, changes, read_time):
        for change in changes:
            if change.type.name == 'ADDED':
                doc = change.document
                process_audio(doc.id, doc.to_dict())

    # Watch this query
    jobs_query.on_snapshot(on_snapshot)

    # Keep the script running
    while True:
        time.sleep(1)

if __name__ == "__main__":
    watch_jobs()