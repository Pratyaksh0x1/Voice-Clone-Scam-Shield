import torch
import soundfile as sf
import sys
import io
import os
import torchaudio.transforms as T

# Add backend to path so we can import ml_models
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from backend.ml_models import CRNNWithAttn
from backend.model_service import preprocess_waveform, get_inference

def test_inference(path):
    print(f"Testing inference on: {path}")
    
    # Load audio
    data, samplerate = sf.read(path)
    if data.ndim == 1:
        data = data.reshape(-1, 1)
    data = data.T
    waveform = torch.from_numpy(data).float()
    
    print(f"Waveform shape: {waveform.shape}, sr: {samplerate}")
    
    # Preprocess
    specs = preprocess_waveform(waveform, samplerate)
    print(f"Extracted {len(specs)} chunks.")
    
    # Inference
    scores = get_inference(specs)
    print(f"Raw Sigmoid Scores for chunks: {scores}")
    
    mean_score = sum(scores) / len(scores) if scores else 0
    print(f"Mean Score: {mean_score:.4f}")
    print(f"Verdict (Threshold 0.4): {'Fake' if mean_score >= 0.4 else 'Real'}")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        test_inference(sys.argv[1])
    else:
        test_inference(r"data\Elevanlabs_Fake.wav")
