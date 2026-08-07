import os
import subprocess
import sys

def setup():
    # Directories
    dirs = [
        "indian-audio-benchmark/real/hindi",
        "indian-audio-benchmark/real/indian_english",
        "indian-audio-benchmark/real/hinglish",
        "indian-audio-benchmark/fake/hindi",
        "indian-audio-benchmark/fake/indian_english",
        "indian-audio-benchmark/fake/hinglish"
    ]
    for d in dirs:
        os.makedirs(d, exist_ok=True)
    
    # Try installing gtts
    try:
        import gtts
    except ImportError:
        print("Installing gTTS...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "gTTS", "pydub"])
        import gtts

    from gtts import gTTS

    # Test Sentences
    hindi_texts = [
        "नमस्ते सर, मैं SBI बैंक से बोल रहा हूँ।",
        "आपका KYC अपडेट नहीं हुआ है।",
        "आपका बैंक अकाउंट बंद हो सकता है।",
        "कृपया अपना OTP बताइए।",
        "आपके खाते से ₹25,000 निकाले गए हैं।",
        "पुलिस वेरिफिकेशन के लिए आधार नंबर बताइए।",
        "आपने लोन के लिए आवेदन किया था।",
        "आपको इनाम में एक कार मिली है।",
        "आपका पैन कार्ड ब्लॉक हो जाएगा।",
        "आज ही वेरिफिकेशन करवा लीजिए।"
    ]

    english_texts = [
        "Hello sir, this is Rahul from SBI Bank.",
        "Your KYC has expired.",
        "Please verify your account immediately.",
        "Share the OTP you have received.",
        "Your bank account will be suspended.",
        "This is an urgent verification call.",
        "Someone tried to access your account.",
        "Please confirm your Aadhaar number.",
        "Your PAN card needs verification.",
        "Thank you for banking with us."
    ]

    hinglish_texts = [
        "Hello sir, main SBI se bol raha hoon.",
        "Aapka KYC update karna hai.",
        "OTP share kar dijiye.",
        "Payment receive hua kya?",
        "Aapka account block ho sakta hai.",
        "Please apna PAN number verify kariye.",
        "Main customer support se bol raha hoon.",
        "Ye last reminder hai.",
        "Aapka refund process ho gaya hai.",
        "Verification complete kar dijiye."
    ]

    def generate_fake(texts, lang, tld, folder_name, prefix):
        for i, text in enumerate(texts):
            filename = f"indian-audio-benchmark/fake/{folder_name}/fake_{prefix}_{str(i+1).zfill(3)}.mp3"
            if not os.path.exists(filename):
                print(f"Generating {filename}...")
                tts = gTTS(text=text, lang=lang, tld=tld)
                tts.save(filename)

    print("Generating Hindi Fake Audios (Synthetic TTS)...")
    generate_fake(hindi_texts, lang="hi", tld="co.in", folder_name="hindi", prefix="hindi")
    
    print("Generating Indian English Fake Audios (Synthetic TTS)...")
    generate_fake(english_texts, lang="en", tld="co.in", folder_name="indian_english", prefix="english")
    
    print("Generating Hinglish Fake Audios (Synthetic TTS)...")
    # Using Hindi TTS for Hinglish gives that code-switched synthetic vibe
    generate_fake(hinglish_texts, lang="hi", tld="co.in", folder_name="hinglish", prefix="hinglish")

    print("Done! Check the indian-audio-benchmark folder.")

if __name__ == "__main__":
    setup()
