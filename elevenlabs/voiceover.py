from elevenlabs.client import ElevenLabs
from elevenlabs.play import play
import os 

# Initialize ElevenLabs client with your API key
client = ElevenLabs(api_key=os.getenv('ELEVENLABS_API_KEY'))

# Input your script as a string
script_text = "Your script goes here!"

# Choose a voice ID (use client.voices.search() to list voices)
voice_id = "JBFqnCBsd6RMkjVDRZzb"  # Example voice ID

# Choose the model (e.g. "eleven_multilingual_v2" recommended)
model_id = "eleven_multilingual_v2"

# Generate the audio
audio = client.text_to_speech.convert(
    text=script_text,
    voice_id=voice_id,
    model_id=model_id,
    output_format="mp3_44100_128"  # You can use "wav" or others
)

# Play the audio directly
# play(audio)

#to download the audio
with open("output.mp3", "wb") as f:
    for chunk in audio:
        if chunk:  # Make sure chunk is not empty
            f.write(chunk)

