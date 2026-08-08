import os
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
import soundfile as sf
import sys

# Ensure backend modules can be imported
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from backend.ml_models import CRNNWithAttn
from backend.model_service import preprocess_waveform, imagenet_mean, imagenet_std

class AudioDataset(Dataset):
    def __init__(self, real_dir, fake_dir):
        self.samples = []
        # Label 1.0 for Real
        for root, _, files in os.walk(real_dir):
            for file in files:
                if file.endswith(('.wav', '.flac', '.mp3', '.m4a')):
                    self.samples.append((os.path.join(root, file), 1.0))
        
        # Label 0.0 for Fake
        for root, _, files in os.walk(fake_dir):
            for file in files:
                if file.endswith(('.wav', '.flac', '.mp3', '.m4a')):
                    self.samples.append((os.path.join(root, file), 0.0))
                    
    def __len__(self):
        return len(self.samples)
        
    def __getitem__(self, idx):
        file_path, label = self.samples[idx]
        try:
            data, samplerate = sf.read(file_path)
            if data.ndim == 1:
                data = data.reshape(-1, 1)
            data = data.T
            waveform = torch.from_numpy(data).float()
            
            # Preprocess to get mel spectrograms
            specs = preprocess_waveform(waveform, samplerate)
            
            # Since an audio file might be longer and yield multiple chunks (spectrograms),
            # for fine-tuning we can just stack them or take the first one. 
            # To keep it simple, we take the first chunk or pad if needed.
            # Assuming files are short enough to yield at least 1 chunk.
            if len(specs) > 0:
                spec = specs[0]
            else:
                # Fallback empty tensor if something goes wrong
                spec = torch.zeros((1, 64, 328))
                
            return spec, torch.tensor([label], dtype=torch.float32)
        except Exception as e:
            print(f"Error loading {file_path}: {e}")
            return torch.zeros((1, 64, 328)), torch.tensor([label], dtype=torch.float32)

def train_model(epochs=5):
    device = torch.device("cuda:0" if torch.cuda.is_available() else "cpu")
    print(f"Using device: {device}")
    
    # Load model
    model = CRNNWithAttn().to(device)
    model_path = os.path.join(os.path.dirname(__file__), "..", "models", "best_model10.pth")
    if os.path.exists(model_path):
        model.load_state_dict(torch.load(model_path, map_location=device))
        print("Loaded existing model weights.")
    else:
        print("Starting from scratch as weights were not found.")
        
    # Dataset
    real_dir = os.path.join(os.path.dirname(__file__), "..", "indian-audio-benchmark", "real")
    fake_dir = os.path.join(os.path.dirname(__file__), "..", "indian-audio-benchmark", "fake")
    
    dataset = AudioDataset(real_dir, fake_dir)
    print(f"Total samples found: {len(dataset)}")
    
    if len(dataset) == 0:
        print("No audio samples found to train on.")
        return
        
    dataloader = DataLoader(dataset, batch_size=4, shuffle=True)
    
    optimizer = optim.Adam(model.parameters(), lr=1e-4)
    criterion = nn.BCEWithLogitsLoss()
    
    model.train()
    
    for epoch in range(epochs):
        epoch_loss = 0.0
        for specs, labels in dataloader:
            # specs shape is (B, 1, 64, W) since preprocess_waveform returns (64, W)
            # wait, preprocess_waveform returns (1, 64, W)? Let's check model_service.py.
            # T.MelSpectrogram returns (C, n_mels, W). C=1 for mono. So (1, 64, W).
            # When we stack in dataloader, specs is (B, 1, 64, W).
            
            # Wait, in model_service.py: input_tensor = spec.unsqueeze(0).to(device)
            # This implies spec is (1, 64, W) and input_tensor is (1, 1, 64, W).
            # So in DataLoader, specs will be (B, 1, 64, W). We don't need unsqueeze(1).
            specs = specs.to(device)
            
            # Note: The original input tensor was (input_tensor - imagenet_mean) / imagenet_std.
            # But imagenet_mean is shape (1,1,1,1). We can just apply it.
            specs = (specs - imagenet_mean.to(device)) / imagenet_std.to(device)
            labels = labels.to(device)
            
            optimizer.zero_grad()
            outputs = model(specs)
            
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()
            
            epoch_loss += loss.item() * specs.size(0)
            
        print(f"Epoch {epoch+1}/{epochs}, Loss: {epoch_loss/len(dataset):.4f}")
        
    # Save the model
    torch.save(model.state_dict(), model_path)
    print(f"Training complete. Weights saved to {model_path}.")

if __name__ == "__main__":
    train_model(epochs=5)
