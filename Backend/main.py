import firebase_admin
from firebase_admin import credentials, firestore, storage
import time
import json
import logging

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

def process_harmony_job(doc_id, data):
    logger.info(f"--- Processing Job: {doc_id} ---")
    doc_ref = db.collection('harmonyJobs').document(doc_id)
    
    try:
        # Update status to 'working'
        doc_ref.update({'status': 'working'})

        # TODO: AI Logic goes here (e.g., Spleeter, Librosa, or an external API)
        time.sleep(5) 

        mock_tracks = [
            {"name": "Lead", "url": data.get('originalAudio'), "solfege": "Do Re Mi"},
            {"name": "Harmony High", "url": "MOCK_GENERATED_URL", "solfege": "Mi Fa Sol"}
        ]

        doc_ref.update({
            'status': 'completed',
            'tracks': mock_tracks,
            'processedAt': firestore.SERVER_TIMESTAMP
        })
        logger.info(f"--- Job {doc_id} Finished Successfully ---")

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
                process_harmony_job(doc.id, doc.to_dict())

    # Watch this query
    jobs_query.on_snapshot(on_snapshot)

    # Keep the script running
    while True:
        time.sleep(1)

if __name__ == "__main__":
    watch_jobs()