import torch
import torch.nn as nn
import torch.nn.functional as F
from torchvision import models

class AttentionPool(nn.Module):
    def __init__(self, in_dim):
        super().__init__()
        self.attn = nn.Linear(in_dim, 1)

    def forward(self, x):
        scores = self.attn(x)              
        weights = F.softmax(scores, dim=1) 
        return (weights * x).sum(dim=1)    

class CRNNWithAttn(nn.Module):
    def __init__(self,  pretrained=True, hidden_size=128, num_layers=1, dropout=0.2):
        super().__init__()
        if pretrained:
          resnet = models.resnet18(weights='DEFAULT')
        else:
          resnet = models.resnet18()
        
        w = resnet.conv1.weight.data.clone()
        resnet.conv1 = nn.Conv2d(2, 64, kernel_size=7, stride=2, padding=3, bias=False)
        resnet.conv1.weight.data[:, 0] = w[:, 0]
        
        self.backbone = nn.Sequential(*list(resnet.children())[:-2])
        
        self.gru = nn.GRU(
            input_size=512,          
            hidden_size=hidden_size,
            num_layers=num_layers,
            batch_first=True,
            bidirectional=True,
            dropout=dropout if num_layers>1 else 0.0
        )
        
        self.attn_pool = AttentionPool(hidden_size*2)
        
        self.classifier = nn.Sequential(
            nn.Linear(hidden_size*2, hidden_size),
            nn.ReLU(inplace=True),
            nn.Dropout(dropout),
            nn.Linear(hidden_size, 1)
        )

    def forward(self, x):
        feat = self.backbone(x)            
        feat = feat.mean(dim=2)            
        feat = feat.permute(0,2,1)         

        out, _ = self.gru(feat)            
        pooled = self.attn_pool(out)       
        return self.classifier(pooled)     
