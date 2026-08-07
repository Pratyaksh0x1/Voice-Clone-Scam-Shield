import torch
import torchaudio
import soundfile as sf
import sys

def test_audio(path):
    print(f"Testing {path}")
    
    # torchaudio
    try:
        wav_ta, sr_ta = torchaudio.load(path, backend="soundfile")
        print(f"Torchaudio: shape={wav_ta.shape}, sr={sr_ta}, dtype={wav_ta.dtype}, max={wav_ta.max():.4f}, min={wav_ta.min():.4f}, mean={wav_ta.mean():.4f}")
    except Exception as e:
        print(f"Torchaudio failed: {e}")
        
    # soundfile
    try:
        data, sr_sf = sf.read(path)
        if data.ndim == 1:
            data = data.reshape(-1, 1)
        data = data.T
        wav_sf = torch.from_numpy(data).float()
        print(f"Soundfile : shape={wav_sf.shape}, sr={sr_sf}, dtype={wav_sf.dtype}, max={wav_sf.max():.4f}, min={wav_sf.min():.4f}, mean={wav_sf.mean():.4f}")
        
        diff = torch.abs(wav_ta - wav_sf).max()
        print(f"Max difference: {diff:.6f}")
    except Exception as e:
        print(f"Soundfile failed: {e}")

if __name__ == "__main__":
    test_audio(sys.argv[1])
