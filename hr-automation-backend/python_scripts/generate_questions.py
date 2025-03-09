# import sys
# import json
# from transformers import pipeline, AutoTokenizer
# import logging

# # Set up logging
# logging.basicConfig(level=logging.INFO, filename="generate_questions.log", filemode="a")
# logger = logging.getLogger(__name__)

# try:
#     # Load GPT-2 tokenizer and set pad_token
#     logger.info("Loading GPT-2 tokenizer...")
#     tokenizer = AutoTokenizer.from_pretrained("gpt2")
#     if tokenizer.pad_token is None:
#         tokenizer.pad_token = tokenizer.eos_token  # Set pad_token to eos_token
#         logger.info("Set pad_token to eos_token: {}".format(tokenizer.eos_token))

#     # Load GPT-2 model pipeline
#     logger.info("Loading GPT-2 model...")
#     generator = pipeline("text-generation", model="gpt2", tokenizer=tokenizer)
#     logger.info("GPT-2 model loaded successfully.")

#     def generate_resume_questions(extracted_data):
#         questions = []
#         # Create a more structured prompt
#         prompt = f"Generate 3 specific interview questions for a candidate with the following resume details:\n"
#         prompt += f"- Name: {extracted_data['name']}\n"
#         prompt += f"- Email: {extracted_data['email']}\n"
#         prompt += f"- Phone: {extracted_data['phone']}\n"
#         prompt += f"- Skills: {', '.join(extracted_data['skills'])}\n"
#         prompt += f"- Education: {', '.join(extracted_data['education'])}\n"
#         prompt += f"- Experience: {', '.join(extracted_data['experience'])}\n"
#         prompt += "Questions:\n1. "
#         logger.info(f"Generating questions with prompt: {prompt[:100]}...")

#         result = generator(
#             prompt,
#             max_length=150,
#             max_new_tokens=75,
#             num_return_sequences=3,
#             temperature=0.7,
#             truncation=True,
#             padding=True
#         )

#         for i, res in enumerate(result, 1):
#             question = res["generated_text"].split("\n")[0].replace(f"{i}. ", "").strip()
#             if question and question not in questions:
#                 questions.append(question)

#         while len(questions) < 3:
#             key = list(extracted_data.keys())[len(questions) % len(extracted_data)]
#             questions.append(f"What can you tell us about your {key}?")
#         logger.info(f"Generated questions: {questions}")
#         return questions

#     if __name__ == "__main__":
#         # Read extracted data from stdin
#         input_data = sys.stdin.read().strip()
#         if not input_data:
#             logger.error("No input data provided")
#             print(json.dumps({"error": "No input data provided"}), file=sys.stdout)
#             sys.exit(1)

#         try:
#             # Attempt to parse input as JSON
#             extracted_data = json.loads(input_data)
#             if not isinstance(extracted_data, dict):
#                 raise ValueError("Input is not a valid dictionary")
#             logger.info(f"Received extracted data: {extracted_data}")
#             questions = generate_resume_questions(extracted_data)
#             print(json.dumps(questions), file=sys.stdout)
#         except json.JSONDecodeError as e:
#             logger.error(f"Invalid JSON input: {e} - Input received: {input_data}")
#             print(json.dumps({"error": f"Invalid JSON input: {e} - Received: {input_data}"}), file=sys.stdout)
#             sys.exit(1)
#         except Exception as e:
#             logger.error(f"Error generating questions: {e}")
#             print(json.dumps({"error": f"Failed to generate questions: {e}"}), file=sys.stdout)
#             sys.exit(1)

# except Exception as e:
#     logger.error(f"Failed to initialize pipeline: {e}")
#     print(json.dumps({"error": f"Pipeline initialization failed: {e}"}), file=sys.stdout)
#     sys.exit(1)



import sys
import json
from transformers import pipeline, AutoTokenizer
import logging

# Set up logging
logging.basicConfig(level=logging.INFO, filename="generate_questions.log", filemode="a")
logger = logging.getLogger(__name__)

try:
    # Load GPT-2 tokenizer and set pad_token (kept for compatibility, though not used)
    logger.info("Loading GPT-2 tokenizer...")
    tokenizer = AutoTokenizer.from_pretrained("gpt2")
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token  # Set pad_token to eos_token
        logger.info("Set pad_token to eos_token: {}".format(tokenizer.eos_token))

    # Load GPT-2 model pipeline (kept for compatibility, though not used)
    logger.info("Loading GPT-2 model...")
    generator = pipeline("text-generation", model="gpt2", tokenizer=tokenizer)
    logger.info("GPT-2 model loaded successfully.")

    # Pre-typed questions
    pre_typed_questions = [
        "How will you manage this role?",
        "What do you think about us?",
        "Can you describe a challenge you faced and how you overcame it?"
    ]

    def generate_resume_questions(extracted_data):
        questions = pre_typed_questions.copy()  # Use pre-typed questions
        logger.info(f"Using pre-typed questions: {questions}")
        return questions

    if __name__ == "__main__":
        # Read extracted data from stdin
        input_data = sys.stdin.read().strip()
        if not input_data:
            logger.error("No input data provided")
            print(json.dumps({"error": "No input data provided"}), file=sys.stdout)
            sys.exit(1)

        try:
            # Attempt to parse input as JSON
            extracted_data = json.loads(input_data)
            if not isinstance(extracted_data, dict):
                raise ValueError("Input is not a valid dictionary")
            logger.info(f"Received extracted data: {extracted_data}")
            questions = generate_resume_questions(extracted_data)
            print(json.dumps(questions), file=sys.stdout)
        except json.JSONDecodeError as e:
            logger.error(f"Invalid JSON input: {e} - Input received: {input_data}")
            print(json.dumps({"error": f"Invalid JSON input: {e} - Received: {input_data}"}), file=sys.stdout)
            sys.exit(1)
        except Exception as e:
            logger.error(f"Error generating questions: {e}")
            print(json.dumps({"error": f"Failed to generate questions: {e}"}), file=sys.stdout)
            sys.exit(1)

except Exception as e:
    logger.error(f"Failed to initialize pipeline: {e}")
    print(json.dumps({"error": f"Pipeline initialization failed: {e}"}), file=sys.stdout)
    sys.exit(1)