from transformers import BertTokenizer, BertModel
import torch
import numpy as np
from scipy.spatial.distance import cosine

# Load pre-trained BERT model and tokenizer (no fine-tuning)
model_name = "bert-base-uncased"
tokenizer = BertTokenizer.from_pretrained(model_name)
model = BertModel.from_pretrained(model_name)

# Define a reference positive response embedding (example)
reference_positive = "I am excited and well-prepared to contribute effectively."
inputs_positive = tokenizer(reference_positive, return_tensors="pt", padding=True, truncation=True, max_length=128)
with torch.no_grad():
    outputs_positive = model(**inputs_positive)
reference_embedding = outputs_positive.last_hidden_state[:, 0, :].numpy().flatten()  # [CLS] token embedding

# Evaluation function
def evaluate_response(question, answer):
    model.eval()
    # Tokenize input
    inputs = tokenizer(f"{question} [SEP] {answer}", return_tensors="pt", padding=True, truncation=True, max_length=128)
    with torch.no_grad():
        outputs = model(**inputs)
        answer_embedding = outputs.last_hidden_state[:, 0, :].numpy().flatten()  # [CLS] token embedding

    # Calculate similarity to positive reference
    similarity = 1 - cosine(reference_embedding, answer_embedding)  # Cosine similarity (0 to 1)
    
    # Adjust score based on length (proxy for depth)
    length_score = min(len(answer.split()) / 20, 1.0)  # Max length bonus at 20 words
    raw_score = (similarity + length_score) / 2 * 10  # Combine similarity and length, scale to 0-10
    final_score = max(0, min(10, round(raw_score, 1)))  # Cap at 0-10

    return final_score

# Example usage with command-line arguments
if __name__ == "__main__":
    import sys
    if len(sys.argv) != 3:
        print("Usage: python evaluate_model.py <question> <answer>")
        sys.exit(1)
    question = sys.argv[1]
    answer = sys.argv[2]
    score = evaluate_response(question, answer)
    print(f"Evaluated score: {score}/10")