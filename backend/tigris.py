import boto3
from botocore.client import Config
import os 


def upload_to_tigris(file_path, bucket_name, object_name, endpoint_url='https://t3.storage.dev'):
    s3 = boto3.client(
        's3',
        endpoint_url=endpoint_url,
        aws_access_key_id=os.getenv('TIGRIS_ACCESS_KEY'),
        aws_secret_access_key=os.getenv('TIGRIS_SECRET_KEY'),
        config=Config(s3={'addressing_style': 'virtual'})
    )
    try:
        s3.upload_file(file_path, bucket_name, object_name)
        print(f"{object_name} uploaded successfully to {bucket_name}")
    except Exception as e:
        print(f"Error uploading {object_name}: {e}")

def list_and_read_script(bucket_name, endpoint_url='https://t3.storage.dev'):
    s3 = boto3.client(
        's3',
        endpoint_url=endpoint_url,
        aws_access_key_id=os.getenv('TIGRIS_ACCESS_KEY'),
        aws_secret_access_key=os.getenv('TIGRIS_SECRET_KEY'),
        config=Config(s3={'addressing_style': 'virtual'})
    )
    # # List files in the bucket
    # try:
    #     response = s3.list_objects_v2(Bucket=bucket_name)
    #     print("Files in bucket:")
    #     for obj in response.get('Contents', []):
    #         print(obj['Key'])
    # except Exception as e:
    #     print(f"Error listing files in bucket: {e}")

    # Read contents of script.txt into memory
    try:
        file_response = s3.get_object(Bucket=bucket_name, Key='script.txt')
        script_text = file_response['Body'].read().decode('utf-8')  # for text files
        return script_text
    except Exception as e:
        print(f"Error reading script.txt: {e}")

# Usage:
# list_and_read_script('your-bucket-name', 'YOUR_ACCESS_KEY', 'YOUR_SECRET_KEY')

# st=list_and_read_script(
#     bucket_name="pitchbox",
# )
# print(st)
