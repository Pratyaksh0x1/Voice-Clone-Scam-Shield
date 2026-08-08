import torch
import torchaudio.transforms as T
import soundfile as sf
import numpy as np
import io
import os
from backend.ml_models import CRNNWithAttn

# Constants
DECISION_THRESHOLD = 0.2
TARGET_SAMPLE_RATE = 16000
CHUNK_LENGTH_SEC = 4
MAX_LEN = TARGET_SAMPLE_RATE * CHUNK_LENGTH_SEC

# ImageNet normalization stats
imagenet_mean = torch.tensor([0.485]).view(1, 1, 1, 1)
imagenet_std = torch.tensor([0.229]).view(1, 1, 1, 1)

# Initialize model
device = torch.device("cuda:0" if torch.cuda.is_available() else "cpu")
model = CRNNWithAttn().to(device)

def load_model(model_path: str = "../models/best_model10.pth"):
    if os.path.exists(model_path):
        model.load_state_dict(torch.load(model_path, map_location=device))
    else:
        # Fallback to local path if running from backend dir
        local_path = "./models/best_model10.pth"
        if os.path.exists(local_path):
            model.load_state_dict(torch.load(local_path, map_location=device))
        else:
            print(f"Warning: Model weights not found at {model_path}")
    model.eval()

# Call once to load
load_model(os.path.join(os.path.dirname(__file__), "..", "models", "best_model10.pth"))

def preprocess_waveform(waveform: torch.Tensor, sample_rate: int):
    """
    Preprocess a full waveform into chunks and mel spectrograms.
    """
    if sample_rate != TARGET_SAMPLE_RATE:
        resample = T.Resample(orig_freq=sample_rate, new_freq=TARGET_SAMPLE_RATE)
        waveform = resample(waveform)

    if waveform.shape[0] == 1:
        waveform = waveform.repeat(2, 1)
        
    all_waveforms = []
    # If the waveform is very long, chunk it
    num_chunks = max(1, waveform.shape[1] // MAX_LEN + (1 if waveform.shape[1] % MAX_LEN != 0 else 0))
    
    current_waveform = waveform
    for _ in range(num_chunks):
        if current_waveform.shape[1] > MAX_LEN:
            all_waveforms.append(current_waveform[:, :MAX_LEN])
            current_waveform = current_waveform[:, MAX_LEN:]
        elif current_waveform.shape[1] < MAX_LEN:
            pad_len = MAX_LEN - current_waveform.shape[1]
            all_waveforms.append(torch.nn.functional.pad(current_waveform, (0, pad_len)))
        else:
            all_waveforms.append(current_waveform)
            
    # Convert to MelSpectrogram
    all_spec = []
    mel_transform = T.MelSpectrogram(
        sample_rate=TARGET_SAMPLE_RATE,
        n_fft=780,
        hop_length=195,
        n_mels=64
    )
    db_transform = T.AmplitudeToDB(top_db=80)
    
    for w in all_waveforms:
        mel_spec = mel_transform(w)
        mel_spec = db_transform(mel_spec)
        all_spec.append(mel_spec)
        
    return all_spec

def get_inference(specs: list) -> list:
    results = []
    for spec in specs:
        input_tensor = spec.unsqueeze(0).to(device)
        input_tensor = (input_tensor - imagenet_mean) / imagenet_std
        with torch.no_grad():
            outputs = model(input_tensor)
            prob = torch.sigmoid(outputs).item()
            results.append(prob)
    return results

def process_audio_file(file_bytes: bytes, threshold: float = DECISION_THRESHOLD):
    """
    Process full file upload.
    """
    # Use soundfile directly with BytesIO
    try:
        data, samplerate = sf.read(io.BytesIO(file_bytes))
    except Exception as e:
        raise ValueError(f"Failed to read audio file: {e}")
        
    # data is (frames, channels) or (frames,)
    if data.ndim == 1:
        data = data.reshape(-1, 1) # (frames, 1)
        
    # transpose to (channels, frames) for PyTorch
    data = data.T
    waveform = torch.from_numpy(data).float()
    
    specs = preprocess_waveform(waveform, samplerate)
    scores = get_inference(specs)
    
    return scores

def process_audio_chunk(audio_data: bytes, sample_rate: int):
    """
    Process a raw audio chunk for live streaming.
    Assume audio_data is already decoded (e.g. from WebRTC or processed by ffmpeg stream).
    For simplicity, let's assume it comes in as raw PCM16 bytes or we parse it with soundfile if it's a valid container chunk.
    If it's a full mini wav, we can use soundfile.
    """
    try:
        data, sr = sf.read(io.BytesIO(audio_data))
    except Exception as e:
        raise ValueError(f"Failed to read audio chunk: {e}")
        
    if data.ndim == 1:
        data = data.reshape(-1, 1)
    data = data.T
    waveform = torch.from_numpy(data).float()
    
    specs = preprocess_waveform(waveform, sr)
    scores = get_inference(specs)
    
    # We return the mean score if there are multiple sub-chunks, but for streaming it's usually 1
    return sum(scores)/len(scores) if scores else 0.0

def get_verdict(score: float, threshold: float = DECISION_THRESHOLD):
    """
    Returns 'Real' if the score is greater than or equal to the threshold, 
    otherwise returns 'Fake'.
    """
    return "Real" if score >= threshold else "Fake"
