from elevenlabs.client import ElevenLabs
from elevenlabs.play import play
import os 

client = ElevenLabs(
  api_key=os.getenv('ELEVENLABS_API_KEY'),
)

voice = client.voices.ivc.create(
    name="Aishwarya",
    description="The voice from the user intself", # Optional
    files=["./audio/output.mp3"],
)