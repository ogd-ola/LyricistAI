import os
import requests
import firebase_admin
from dotenv import load_dotenv
from firebase_admin import credentials, firestore
import time
import tempfile
import logging
import librosa
import numpy as np
import soundfile as sf
import cloudinary
import cloudinary.uploader

# --- CONFIGURATION ---
# Replace with your actual Cloudinary credentials
load_dotenv()
cloudinary.config(
    cloud_name = os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key = os.getenv("CLOUDINARY_API_KEY"),
    api_secret = os.getenv("CLOUDINARY_API_SECRET"),
    secure = True
)

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
        
        # 3. GENERATE HARMONIES (Digital Signal Processing)
        logger.info("🎼 Shifting pitches for harmonies...")
        
        # Shift +4 semitones (Major 3rd) and -5 semitones (Perfect 4th)
        y_high = librosa.effects.pitch_shift(y, sr=sr, n_steps=4)
        y_low = librosa.effects.pitch_shift(y, sr=sr, n_steps=-5)

        # 4. Save and Upload generated tracks
        harmony_urls = {}
        for label, audio_data in [("high", y_high), ("low", y_low)]:
            temp_path = os.path.join(temp_dir, f"{doc_id}_{label}.wav")
            sf.write(temp_path, audio_data, sr)
            
            # Upload to Cloudinary
            upload_result = cloudinary.uploader.upload(temp_path, resource_type="video")
            harmony_urls[label] = upload_result.get("secure_url")
            
            # Clean up temp harmony file
            os.remove(temp_path)

        # 5. Construct results for Frontend
        processed_tracks = [
            {
                "name": "Lead Vocal", 
                "url": audio_url, 
                "solfege": f"Original ({round(final_tempo)} BPM)"
            },
            {
                "name": "Upper Harmony", 
                "url": harmony_urls["high"], 
                "solfege": "Generated +3rd"
            },
            {
                "name": "Lower Harmony", 
                "url": harmony_urls["low"], 
                "solfege": "Generated -4th"
            }
        ]

        # 6. Update Firestore
        doc_ref.update({
            'status': 'completed',
            'tracks': processed_tracks,
            'tempo': round(final_tempo, 2),
            'processedAt': firestore.SERVER_TIMESTAMP
        })

        # Cleanup original download
        if os.path.exists(local_filename):
            os.remove(local_filename)
        
        logger.info(f"✅ Done! Multi-track suite ready for {doc_id}")

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

    jobs_query.on_snapshot(on_snapshot)

    while True: time.sleep(1)

if __name__ == "__main__":
    watch_jobs()