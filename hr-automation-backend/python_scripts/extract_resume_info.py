import sys
import spacy
import json
import logging
import re

logging.basicConfig(level=logging.INFO, filename="extract_resume.log", filemode="a")
logger = logging.getLogger(__name__)

nlp = spacy.load("en_core_web_sm")

def extract_info_from_text(text):
    logger.info(f"Processing text: {text[:100]}...")
    doc = nlp(text)

    entities = {
        "name": "",
        "email": "",
        "phone": "",
        "skills": [],
        "education": [],
        "experience": []
    }

    email_pattern = r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}"
    emails = re.findall(email_pattern, text)
    if emails:
        entities["email"] = emails[0]
        logger.info(f"Found email: {entities['email']}")

    phone_pattern = r"\+?\d{1,3}[-.\s]?\d{3,5}[-.\s]?\d{4,5}"
    phones = re.findall(phone_pattern, text)
    if phones:
        entities["phone"] = phones[0]
        logger.info(f"Found phone: {entities['phone']}")

    for ent in doc.ents:
        if ent.label_ == "PERSON" and len(ent.text.split()) > 1 and not entities["name"]:  # Ensure it's a full name
            entities["name"] = ent.text
            logger.info(f"Found name via spaCy: {entities['name']}")
            break
    if not entities["name"]:
        lines = [line.strip() for line in text.split("\n") if line.strip() and len(line.split()) > 1]
        if lines:
            entities["name"] = lines[0]
            logger.info(f"Found name via first line: {entities['name']}")

    skill_keywords = ["python", "java", "sql", "html", "css", "javascript", "react", "node", "mongodb"]
    text_lower = text.lower()
    if "skill" in text_lower or "skills" in text_lower:
        skills = [word for word in skill_keywords if word in text_lower]
        entities["skills"].extend(skills)
        logger.info(f"Found skills: {entities['skills']}")

    education_keywords = ["education", "bachelor", "master", "degree", "university", "college"]
    education_lines = [line.strip() for line in text.split("\n") if any(key in line.lower() for key in education_keywords)]
    entities["education"] = education_lines[:2]
    logger.info(f"Found education: {entities['education']}")

    experience_keywords = ["experience", "worked", "employed", "position", "role"]
    experience_lines = [line.strip() for line in text.split("\n") if any(key in line.lower() for key in experience_keywords)]
    entities["experience"] = experience_lines[:2]
    logger.info(f"Found experience: {entities['experience']}")

    for key in entities:
        if isinstance(entities[key], list):
            entities[key] = list(dict.fromkeys(entities[key]))
        elif not entities[key]:
            entities[key] = ""

    logger.info(f"Extracted entities: {entities}")
    return entities

if __name__ == "__main__":
    text = sys.stdin.read().strip()
    if not text:
        logger.error("No text data provided")
        print(json.dumps({"error": "No text data provided"}), file=sys.stdout)
        sys.exit(1)

    entities = extract_info_from_text(text)
    print(json.dumps(entities), file=sys.stdout)