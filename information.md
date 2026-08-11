# Voice Clone Scam Shield

## Problem
Generative AI allows threat actors to clone a voice using merely three seconds of reference audio. Traditional security perimeters and human verification consistently fail against highly localized acoustic manipulation. This leads to severe security threats such as:
- Account Takeover via Phone Support
- CEO Fraud & Social Engineering
- Synthetic Identity Creation

These automated, 24/7 attacks contribute to over $1B+ in annual losses and have a 99% human bypass rate.

## Research Information
Our research indicates that while synthetic voices can easily fool the human ear, they leave behind specific frequency-domain synthetic anomalies. By analyzing audio at the micro-acoustic level rather than relying on human verification, it is possible to isolate these algorithmic artifacts. 

## Solution
We developed a system to detect synthetics and stop deepfakes and voice clones in real-time. Our architecture consists of:
1. **Temporal Ingestion**: Audio streams are aggressively chunked into overlapping 4-second matrices, ensuring zero data loss during high-throughput analysis.
2. **Spectral Extraction**: Waveforms are transformed into high-fidelity Mel Spectrograms, exposing frequency-domain synthetic anomalies invisible to the human ear.
3. **Neural Inference**: Our proprietary ResNet18 + Bi-GRU engine leverages Attention pooling to isolate and flag algorithmic artifacts with 97% precision.

## Working Proof
*(Note: Please ensure the attached photos are placed in this directory or update the filenames below to match the saved images.)*

![Fake Audio Analysis](./Working%20Proof/fake_analysis.png)
![Real Audio Analysis](./Working%20Proof/real_analysis.png)
![Hero Section](./Working%20Proof/hero.png)
![Threats Breakdown](./Working%20Proof/threats.png)
![Architecture](./Working%20Proof/architecture.png)

## Limitations
- **Processing Power**: High-fidelity real-time analysis requires significant computational resources, especially for large-scale operations.
- **Audio Quality**: The accuracy of detection can be reduced if the input audio is heavily compressed, corrupted, or has excessive background noise.
- **Evolving Threats**: As generative AI models improve, the detection neural network will require continuous retraining to identify new types of synthetic artifacts.

## Team Contribution
**Team Members & Roles :**

- **Pratyaksh Tomar (Lead ML Engineer & System Architect)**
  - Architected the core ResNet18 + Bi-GRU neural engine and Attention pooling mechanism.
  - Spearheaded the overall system architecture and end-to-end integration of the AI model with the web application.
  - Led project direction, research, and final deployment strategy.

- **Kartik Tomar (Frontend & UI/UX Developer)**
  - Built the Next.js frontend, including the 3D Waveform components and dynamic dashboard interfaces.
  - Designed the landing page, implemented responsive styling, and ensured a seamless user experience.

- **Harsh Vashishta (2Backend & Data Processing Engineer)**
  - Managed the temporal ingestion pipeline and audio stream chunking (4-second matrices).
  - Implemented the spectral extraction process, handling the transformation of waveforms into Mel Spectrograms for the model.
