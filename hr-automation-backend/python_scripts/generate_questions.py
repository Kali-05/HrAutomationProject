
# import sys
# import json
# from transformers import pipeline, AutoTokenizer
# import logging

# logging.basicConfig(level=logging.INFO, filename="generate_questions.log", filemode="a")
# logger = logging.getLogger(__name__)

# logger.info("Loading GPT-2 model...")
# tokenizer = AutoTokenizer.from_pretrained("gpt2")
# if tokenizer.pad_token is None:
#     tokenizer.pad_token = tokenizer.eos_token
# generator = pipeline("text-generation", model="gpt2", tokenizer=tokenizer)

# def generate_resume_questions(extracted_data, job_description):
#     questions = set()
#     prompt = (
#         f"Generate 5 advanced-level interview questions based on this resume and job description:\n"
#         f"Name: {extracted_data.get('name', 'Unknown')}\n"
#         f"Skills: {', '.join(extracted_data.get('skills', ['None']))}\n"
#         f"Education: {', '.join(extracted_data.get('education', ['None']))}\n"
#         f"Experience: {', '.join(extracted_data.get('experience', ['None']))}\n"
#         f"Projects: {', '.join(extracted_data.get('projects', ['None']))}\n"
#         f"Job Description: {job_description}\n"
#         f"The questions should be technical, experience-based, project-based, and behavioral. "
#         f"Examples include:\n"
#         f"- Technical: How do you handle state management in Flutter?\n"
#         f"- Experience: Can you describe a challenging project you worked on and how you overcame the challenges?\n"
#         f"- Project: How did you ensure accuracy in your CV Analyzer project?\n"
#         f"- Behavioral: How do you handle constructive feedback?\n"
#         f"List only the questions."
#     )

#     result = generator(
#         prompt,
#         max_new_tokens=100,  # Increased to allow for more detailed questions
#         num_return_sequences=5,  # Generate 5 questions
#         temperature=0.9,  # Slightly lower temperature for more focused questions
#         top_k=50,
#         do_sample=True,
#         truncation=True,
#     )

#     for res in result:
#         text = res["generated_text"].replace(prompt, "").strip()
#         for line in text.split("\n"):
#             q = line.strip()
#             if q and len(q) > 10 and q not in questions:
#                 questions.add(q)
#             if len(questions) >= 5:
#                 break

#     questions_list = list(questions)[:5]
#     fallbacks = [
#         "Can you explain the difference between Stateful and Stateless widgets in Flutter?",
#         "How do you ensure a responsive UI in a Flutter app?",
#         "Can you describe a time when you collaborated on a project with a team?",
#         "What challenges did you face while developing a Flutter prototype, and how did you overcome them?",
#         "How do you keep yourself updated with the latest trends in mobile app development?",
#     ]
#     for i in range(len(questions_list), 5):
#         questions_list.append(fallbacks[i])

#     logger.info(f"Generated questions: {questions_list}")
#     return questions_list

# if __name__ == "__main__":
#     input_data = sys.stdin.read().strip()
#     if not input_data:
#         logger.error("No input data provided")
#         print(json.dumps({"error": "No input data provided"}), file=sys.stdout)
#         sys.exit(1)

#     try:
#         data = json.loads(input_data)
#         if not isinstance(data, dict) or "extracted_data" not in data or "job_description" not in data:
#             logger.error(f"Invalid input: {input_data}")
#             print(json.dumps({"error": "Input must be a dict with 'extracted_data' and 'job_description'"}), file=sys.stdout)
#             sys.exit(1)
#         questions = generate_resume_questions(data["extracted_data"], data["job_description"])
#         print(json.dumps(questions), file=sys.stdout)


#     except json.JSONDecodeError as e:
#         logger.error(f"Invalid JSON input: {e} - Input received: {input_data}")
#         print(json.dumps({"error": f"Invalid JSON input: {e}"}), file=sys.stdout)
#         sys.exit(1)
#     except Exception as e:
#         logger.error(f"Error: {e}")
#         print(json.dumps({"error": str(e)}), file=sys.stdout)
#         sys.exit(1)
#     #____________________________________________________________________
# # #_____________________________________________________



import sys
import json
import logging
import google.generativeai as genai

# Configure logging
logging.basicConfig(level=logging.INFO, filename="generate_questions.log", filemode="a")
logger = logging.getLogger(__name__)

# Set API key
GENAI_API_KEY = "AIzaSyDFLhWGPG0dSPVHGMpP4FOIBVG8qN6weFI"
genai.configure(api_key=GENAI_API_KEY)

# Initialize the model
model = genai.GenerativeModel("gemini-1.5-pro")

def generate_resume_questions(extracted_data, job_description):
    questions = set()
    
    prompt = f"""
    Generate 5 HR and technical interview questions based on the following resume and job description:

    Resume: {extracted_data}
    Job Description: {job_description}

    The questions should cover:
    - HR-related behavioral questions
    - Technical questions based on skills and experience
    - Problem-solving questions

    List only the questions.
    """
    
    try:
        response = model.generate_content(prompt)
        generated_questions = response.text.split("\n")
        
        for q in generated_questions:
            q = q.strip()
            if q and len(q) > 10 and q not in questions:
                questions.add(q)
            if len(questions) >= 5:
                break
    except Exception as e:
        logger.error(f"Error generating questions with Gemini API: {e}")
        questions = set()
    
    # Fallback questions if needed
    fallbacks = [
        "Can you explain the difference between Stateful and Stateless widgets in Flutter?",
        "How do you ensure a responsive UI in a Flutter app?",
        "Can you describe a time when you collaborated on a project with a team?",
        "What challenges did you face while developing a Flutter prototype, and how did you overcome them?",
        "How do you keep yourself updated with the latest trends in mobile app development?",
    ]
    
    questions_list = list(questions)[:5]
    for i in range(len(questions_list), 5):
        questions_list.append(fallbacks[i])
    
    logger.info(f"Generated questions: {questions_list}")
    return questions_list

if __name__ == "__main__":
    input_data = sys.stdin.read().strip()
    if not input_data:
        logger.error("No input data provided")
        print(json.dumps({"error": "No input data provided"}), file=sys.stdout)
        sys.exit(1)

    try:
        data = json.loads(input_data)
        if not isinstance(data, dict) or "extracted_data" not in data or "job_description" not in data:
            logger.error(f"Invalid input: {input_data}")
            print(json.dumps({"error": "Input must be a dict with 'extracted_data' and 'job_description'"}), file=sys.stdout)
            sys.exit(1)
        
        questions = generate_resume_questions(data["extracted_data"], data["job_description"])
        print(json.dumps(questions), file=sys.stdout)
    except json.JSONDecodeError as e:
        logger.error(f"Invalid JSON input: {e} - Input received: {input_data}")
        print(json.dumps({"error": f"Invalid JSON input: {e}"}), file=sys.stdout)
        sys.exit(1)
    except Exception as e:
        logger.error(f"Error: {e}")
        print(json.dumps({"error": str(e)}), file=sys.stdout)
        sys.exit(1)