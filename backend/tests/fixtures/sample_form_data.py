"""
Sample form data for testing
"""

SAMPLE_FORM_DATA = {
    "personal_info": {
        "first_name": "John",
        "last_name": "Doe", 
        "middle_name": "Michael",
        "date_of_birth": "01/15/1985",
        "ssn": "123-45-6789",
        "email": "john.doe@example.com",
        "phone": "(555) 123-4567"
    },
    "address": {
        "address_line1": "123 Main Street",
        "address_line2": "Apt 4B",
        "city": "Anytown",
        "state": "CA",
        "zip_code": "12345"
    },
    "employment": {
        "employer": "Acme Corporation",
        "job_title": "Software Engineer",
        "annual_income": "75000"
    }
}

SAMPLE_PDF_TEXT = """
APPLICATION FORM

Personal Information:
First Name: John
Last Name: Doe
Date of Birth: 01/15/1985
Social Security Number: 123-45-6789
Email Address: john.doe@example.com
Phone Number: (555) 123-4567

Address Information:
Street Address: 123 Main Street
Apartment/Unit: Apt 4B
City: Anytown
State: CA
ZIP Code: 12345

Employment Information:
Employer: Acme Corporation
Job Title: Software Engineer
Annual Income: $75,000

Signature: _________________ Date: ___________
"""

SAMPLE_EXTRACTION_DATA = {
    "pages": [{
        "page": 1,
        "text": SAMPLE_PDF_TEXT,
        "blocks": [
            {"text": "First Name:", "bbox": [100, 150, 180, 170], "confidence": 1.0},
            {"text": "John", "bbox": [190, 150, 230, 170], "confidence": 1.0},
            {"text": "Last Name:", "bbox": [100, 180, 180, 200], "confidence": 1.0},
            {"text": "Doe", "bbox": [190, 180, 220, 200], "confidence": 1.0},
            {"text": "Date of Birth:", "bbox": [100, 210, 200, 230], "confidence": 1.0},
            {"text": "01/15/1985", "bbox": [210, 210, 280, 230], "confidence": 1.0},
            {"text": "john.doe@example.com", "bbox": [190, 270, 350, 290], "confidence": 1.0},
            {"text": "(555) 123-4567", "bbox": [190, 300, 300, 320], "confidence": 1.0}
        ],
        "dimensions": {"width": 612, "height": 792}
    }],
    "total_pages": 1,
    "total_text_length": len(SAMPLE_PDF_TEXT),
    "extraction_method": "text_layer"
}