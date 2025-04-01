import sys
import spacy
import json
import logging
import re
from nameparser import HumanName

# Set up logging
logging.basicConfig(level=logging.INFO, filename="extract_resume.log", filemode="a")
logger = logging.getLogger(__name__)

# Load spaCy model
nlp = spacy.load("en_core_web_sm")

def extract_name(text):
    """
    Extracts the candidate's name by:
    1. Skipping empty lines at the beginning.
    2. Checking the first few valid lines for a probable name.
    3. Falling back to Spacy's Named Entity Recognition (NER) if needed.
    """
    lines = text.split("\n")

    # Step 1: Skip empty lines
    valid_lines = [line.strip() for line in lines if line.strip()]  # Remove empty lines

    # Step 2: Check first 5 valid lines for a name
    for line in valid_lines[:5]:  
        words = line.split()
        if len(words) <= 3 and all(w[0].isupper() for w in words):  # Capitalized words like names
            return HumanName(line).full_name

    # Step 3: Use Spacy NLP as a last resort
    doc = nlp(text)
    for ent in doc.ents:
        if ent.label_ == "PERSON":
            return ent.text  # Extracted person's name

    return "Unknown"

def extract_email(text):
    match = re.search(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}", text)
    return match.group(0) if match else "Not Found"

def extract_phone(text):
    match = re.search(r"\+?\d[\d -]{8,}\d", text)
    return match.group(0) if match else "Not Found"

def extract_skills(text):
    skillset = {"java", "sql", "html", "css", "javascript", "python", "c++", "flutter", "dart"}
    words = text.lower().split()
    return list(skillset.intersection(words))

def extract_education(text):
    edu_keywords = ["education", "college", "university", "bachelor", "master"]
    return [line.strip() for line in text.split("\n") if any(keyword in line.lower() for keyword in edu_keywords)]

def extract_experience(text):
    exp_keywords = ["experience", "internship", "worked", "developed"]
    return [line.strip() for line in text.split("\n") if any(keyword in line.lower() for keyword in exp_keywords)]

def extract_projects(text):
    """
    Extracts projects along with their descriptions from the resume.
    Looks for the 'Projects' section and captures details until another section starts.
    """
    lines = text.split("\n")
    projects = []
    capturing = False
    project_data = ""

    for line in lines:
        clean_line = line.strip()

        # Step 1: Detect "Projects" section
        if "projects" in clean_line.lower():
            capturing = True
            continue  # Skip the header itself
        
        # Step 2: Stop capturing if we hit another section
        if capturing and (clean_line.isupper() or "awards" in clean_line.lower() or "education" in clean_line.lower()):
            break  # Stop when another major section starts

        # Step 3: Collect project details
        if capturing and clean_line:
            project_data += clean_line + " "

    # Step 4: Process and split into individual projects
    project_list = project_data.split("•")  # Bullet points indicate separate projects
    for project in project_list:
        project = project.strip()
        if project:
            projects.append(project)

    return projects

def extract_resume_info(text):
    logger.info(f"Processing text: {text[:100]}...")

    extracted_data = {
        "name": extract_name(text),
        "email": extract_email(text),
        "phone": extract_phone(text),
        "skills": extract_skills(text),
        "education": extract_education(text),
        "experience": extract_experience(text),
        "projects": extract_projects(text)  # Add project extraction
    }

    # Log extracted data
    logger.info(f"Extracted entities: {extracted_data}")

    return extracted_data

if __name__ == "__main__":
    text = sys.stdin.read().strip()
    if not text:
        logger.error("No text data provided")
        print(json.dumps({"error": "No text data provided"}), file=sys.stdout)
        sys.exit(1)

    entities = extract_resume_info(text)
    print(json.dumps(entities), file=sys.stdout)