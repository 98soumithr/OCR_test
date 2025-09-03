# FormPilot Sample Files

This directory contains sample PDFs and test forms for testing FormPilot functionality.

## Sample PDFs

### 1. `sample-form.pdf`
A simple form with common fields:
- First Name
- Last Name
- Email
- Phone
- Address
- Date of Birth

### 2. `complex-form.pdf`
A more complex form with:
- Multiple pages
- Tables
- Checkboxes
- Dropdown selections
- Signature fields

### 3. `scanned-form.pdf`
A scanned document that requires OCR processing.

## Test Forms

### 1. `test-form.html`
A simple HTML form for testing autofill functionality.

### 2. `complex-test-form.html`
A more complex form with various input types and validation.

## Usage

1. Load the extension in Chrome
2. Navigate to one of the test forms
3. Upload a sample PDF
4. Test the field extraction and autofill functionality

## Expected Results

- **High confidence fields** (≥80%): Should auto-fill without user intervention
- **Medium confidence fields** (60-80%): Should be highlighted for user review
- **Low confidence fields** (<60%): Should be shown in "Needs Review" section

## Troubleshooting

If fields are not being extracted correctly:

1. Check the PDF quality (scanned PDFs may need OCR)
2. Verify field labels are clear and readable
3. Try different confidence thresholds in settings
4. Use the mapping editor to manually map fields