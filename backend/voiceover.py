from fastapi import FastAPI,  UploadFile, File
from elevenlabs.client import ElevenLabs
from elevenlabs.play import play
from tigris import upload_to_tigris, list_and_read_script
import os 

app = FastAPI()

# Initialize ElevenLabs client with your API key
client = ElevenLabs(api_key=os.getenv('ELEVENLABS_API_KEY'))


@app.get('/generate-audio')
async def generate_audio():
    script_text = list_and_read_script(bucket_name="pitchbox")
    voice_id = os.getenv("VOICE_ID", "JBFqnCBsd6RMkjVDRZzb")
    model_id = "eleven_multilingual_v2"

    audio = client.text_to_speech.convert(
        text=script_text,
        voice_id=voice_id,
        model_id=model_id,
        output_format="mp3_44100_128"
    )

    output_path = "./audio/output.mp3"
    with open(output_path, "wb") as f:
        for chunk in audio:
            if chunk:
                f.write(chunk)

    upload_to_tigris(
        file_path=output_path,
        bucket_name="pitchbox",
        object_name="output.mp3",
    )

    return {"message": "Audio generated and uploaded successfully."}

@app.post("/upload-tigris")
async def upload_tigris(
    file: UploadFile = File(...),
):
    bucket_name="pitchbox"
    object_name="script.txt"
    temp_path = f"./temp_{object_name}"
    with open(temp_path, "wb") as f:
        content = await file.read()
        f.write(content)

    success = upload_to_tigris(temp_path, bucket_name, object_name)
    os.remove(temp_path)

    if success:
        return {"message": f"{object_name} uploaded successfully to {bucket_name}"}
    else:
        return {"message": f"Error uploading {object_name}", "error": True}

# @app.post('/create-voice')
# async def create_voice():
#     # Modify file paths if needed
#     voice = client.voices.ivc.create(
#         name="Alex",
#         description="This is the voice crearted from useritself",
#         files=["./audio/sample.mp3", "./audio/sample_1.mp3", "./audio/sample_2.mp3"],
#     )
#     return {"voice": voice}


# sample_names = ["sample.mp3", "sample_1.mp3", "sample_2.mp3"]
# local_paths = []
# for name in sample_names:
#     p = download_file_from_tigris("pitchbox", name, f"./audio/{name}")
#     if p: local_paths.append(p)
# # Now pass local_paths to ElevenLabs voice creation
