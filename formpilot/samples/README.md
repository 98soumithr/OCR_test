# Sample PDFs and Test Data

This directory contains sample PDFs and test data for FormPilot development and testing.

## Sample PDFs

1. **sample_form_digital.pdf** - A digitally created PDF with form fields
2. **sample_form_scanned.pdf** - A scanned PDF requiring OCR
3. **sample_tax_form.pdf** - Tax form with SSN, EIN fields
4. **sample_application.pdf** - Job application with various field types

## Test Forms

The `test_forms/` directory contains HTML files with different form layouts for testing:

1. **simple_form.html** - Basic contact form
2. **complex_form.html** - Multi-step application form
3. **government_form.html** - Government-style form with specific formatting
4. **dynamic_form.html** - Form with dynamic fields added via JavaScript

## Usage

### Testing PDF Extraction

```bash
# Upload a sample PDF through the extension
# Or use the API directly:
curl -X POST http://localhost:8000/parse \
  -F "file=@samples/sample_form_digital.pdf"
```

### Testing Form Filling

1. Open one of the test forms in Chrome
2. Load the FormPilot extension
3. Upload a corresponding sample PDF
4. Test the auto-fill functionality

## Creating New Test Data

To create new test PDFs:

1. Use a PDF creation tool (LibreOffice, Google Docs, etc.)
2. Include various field types: text, dates, SSN, checkboxes
3. Save both digital and scanned versions
4. Add corresponding test forms in HTML