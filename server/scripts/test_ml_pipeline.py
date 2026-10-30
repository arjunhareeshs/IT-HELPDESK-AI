import sys
from pathlib import Path

# Add server to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.ai.classification.predictor import classify_complaint

samples = [
    "The Wi-Fi access point in the library keeps dropping connections.",
    "My monitor is flickering and turns off every few minutes.",
    "Need Oracle database client installed and configured on my workstation.",
    "CPU overheating and fan making loud grinding noise in Lab 204.",
    "Outlook email client is not receiving incoming messages.",
    "DHCP server failed to assign IP address on 2nd floor switch."
]

print("=" * 60)
print("TESTING SUPERVISED ML CLASSIFIER (XLM-RoBERTa)")
print("=" * 60)

for text in samples:
    res = classify_complaint(text)
    formatted = f"{res.predicted_category} - {res.predicted_subcategory}" if res.predicted_subcategory else res.predicted_category
    print(f"Complaint: \"{text}\"")
    print(f"-> ML Model Output: ({formatted})")
    print(f"   Category: {res.predicted_category}")
    print(f"   Subcategory: {res.predicted_subcategory}")
    print(f"   Confidence: {res.confidence}")
    print(f"   Model Version: {res.model_version}\n")

print("=" * 60)
print("ML CLASSIFIER TEST COMPLETE")
print("=" * 60)

