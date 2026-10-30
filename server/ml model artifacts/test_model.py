
import torch
from pathlib import Path
from transformers import AutoTokenizer, AutoModelForSequenceClassification

# 1. Load the model
MODEL_NAME = Path(__file__).parent / "model"

print("Loading model...")

tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME, local_files_only=True)
model = AutoModelForSequenceClassification.from_pretrained(MODEL_NAME, local_files_only=True)

# 2. Select device
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
model.to(device)
model.eval()

print("Model loaded successfully!")
print("Device:", device)
print("Enter ticket text to classify. Type 'exit' to stop.\n")


# 3. Predict function
def predict_ticket(text):
    inputs = tokenizer(
        text,
        return_tensors="pt",
        truncation=True,
        max_length=512
    )

    inputs = {key: value.to(device) for key, value in inputs.items()}

    with torch.no_grad():
        outputs = model(**inputs)
        probabilities = torch.softmax(outputs.logits, dim=-1)

        predicted_id = probabilities.argmax(dim=-1).item()
        confidence = probabilities[0, predicted_id].item()

    label = model.config.id2label.get(predicted_id, str(predicted_id))

    return label, confidence


# 4. Interactive input loop
while True:
    text = input("Enter ticket text: ").strip()

    if text.lower() == "exit":
        print("Exiting...")
        break

    if not text:
        print("Please enter some text.\n")
        continue

    try:
        label, confidence = predict_ticket(text)

        print("Predicted category:", label)
        print(f"Confidence: {confidence:.2%}")
        print("-" * 40)

    except Exception as e:
        print("Prediction error:", e)
