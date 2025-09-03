#!/usr/bin/env python3
"""
Create a sample PDF form for testing FormPilot
"""

from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
import os

def create_sample_pdf():
    """Create a sample PDF form with common fields"""
    
    # Create the PDF
    filename = "samples/sample-form.pdf"
    c = canvas.Canvas(filename, pagesize=letter)
    width, height = letter
    
    # Title
    c.setFont("Helvetica-Bold", 16)
    c.drawString(100, height - 100, "Sample Application Form")
    
    # Form fields
    y_position = height - 150
    line_height = 30
    
    fields = [
        ("First Name:", "John"),
        ("Last Name:", "Doe"),
        ("Email:", "john.doe@example.com"),
        ("Phone:", "(555) 123-4567"),
        ("Address:", "123 Main Street"),
        ("City:", "Anytown"),
        ("State:", "CA"),
        ("ZIP Code:", "12345"),
        ("Date of Birth:", "01/01/1990"),
        ("SSN:", "123-45-6789"),
    ]
    
    c.setFont("Helvetica", 12)
    
    for label, value in fields:
        c.drawString(100, y_position, label)
        c.drawString(250, y_position, value)
        y_position -= line_height
    
    # Add some additional text
    c.setFont("Helvetica", 10)
    c.drawString(100, y_position - 20, "This is a sample PDF form for testing FormPilot.")
    c.drawString(100, y_position - 40, "The form contains common fields that should be extracted.")
    
    # Save the PDF
    c.save()
    print(f"Created sample PDF: {filename}")

if __name__ == "__main__":
    # Check if reportlab is available
    try:
        import reportlab
        create_sample_pdf()
    except ImportError:
        print("ReportLab not available. Creating a simple text file instead.")
        
        # Create a simple text file as fallback
        with open("samples/sample-form.txt", "w") as f:
            f.write("Sample Application Form\n")
            f.write("======================\n\n")
            f.write("First Name: John\n")
            f.write("Last Name: Doe\n")
            f.write("Email: john.doe@example.com\n")
            f.write("Phone: (555) 123-4567\n")
            f.write("Address: 123 Main Street\n")
            f.write("City: Anytown\n")
            f.write("State: CA\n")
            f.write("ZIP Code: 12345\n")
            f.write("Date of Birth: 01/01/1990\n")
            f.write("SSN: 123-45-6789\n")
        
        print("Created sample text file: samples/sample-form.txt")