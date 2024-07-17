# Passport Validation In React Native using Expo and AWS Textract

This React Native application validates passports using AWS Textract. Users can upload passport images, and the app will extract and validate MRZ (Machine Readable Zone) codes from the images. The app utilizes Expo for easy image picking and AWS services (S3 and Textract) for storing and analyzing the images.

## Table of Contents

- [Features](#features)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the App](#running-the-app)
- [Usage](#usage)
- [Code Overview](#code-overview)
  - [Main Components](#main-components)
  - [Main Functions](#main-functions)
  - [MRZ Validation Logic](#mrz-validation-logic)
- [Acknowledgments](#acknowledgments)

## Features

- Upload passport images from the device's gallery.
- Store uploaded images in AWS S3.
- Extract and validate MRZ codes using AWS Textract.
- Display passport number, personal number, and expiry date if the validation is successful.
- Show validation status and relevant messages.

## Prerequisites

- Node.js (v14 or later)
- Expo CLI
- AWS account with access to S3 and Textract services

## Installation

1. **Clone the repository:**

   ```
   git clone https://github.com/yourusername/passport-validation-app.git
   cd passport-validation-app
   ```

2. **Install dependencies:**

   ```
   run yarn or npm install
   ```

3. **Install Expo CLI globally:**

   ```
   npm install -g expo-cli
   ```

## Configuration

- Create an .env file in the root directory and add your AWS configuration:

  ```
  EXPO_PUBLIC_AWS_REGION=your-aws-region
  EXPO_PUBLIC_AWS_ACCESS_KEY=your-aws-access-key
  EXPO_PUBLIC_AWS_SECRET_ACCESS_KEY=your-aws-secret-access-key
  EXPO_PUBLIC_AWS_BUCKET_NAME=your-s3-bucket-name
  ```

  Replace `your-aws-region`, `your-aws-access-key`, `your-aws-secret-access-key`, and `your-s3-bucket-name` with your actual AWS credentials and bucket name.

## Running the App

1. **Start the Expo development server:**

   ```
   run npm start or expo start
   ```

2. **Run the app on an emulator or a physical device:**

   - Scan the QR code with the Expo Go app (available on iOS and Android).
   - Or press a to run on an Android emulator.
   - Or press i to run on an iOS simulator.

## Usage

1. **Upload Image:**

   - Press the "Upload Image" button to select a passport image from your gallery.

   - The image will be uploaded to AWS S3, and the app will start processing it using AWS Textract.

2. **View Results:**

   - If the passport validation is successful, the passport number, personal number, and expiry date will be displayed.

   - If the validation fails, a message indicating the failure will be shown.

## Code Overview

The app consists of the following main components:

- **ImagePicker:** Allows users to select an image from their device's gallery.

- **AWS S3:** Stores the uploaded passport images.

- **AWS Textract:** Analyzes the images and extracts MRZ codes.

- **MRZ Validation:** Validates the extracted MRZ code.

### **Main Functions**

- **pickImage:** Handles image selection and initiates the upload to S3.

- **uploadImageToS3:** Uploads the selected image to the specified S3 bucket.

- **analyzeID:** Analyzes the uploaded image using Textract and extracts MRZ code.

- **validateMRZ:** Validates the extracted MRZ code and updates the UI accordingly.

### **MRZ Validation Logic**

The MRZ validation logic involves:

1. **Parsing the MRZ code:** Extracting fields like passport number, birth date, expiry date, and personal number.

2. **Calculating Check Digits:** Using specific weights and positions to calculate check digits.

3. **Comparing Check Digits:** Ensuring the calculated check digits match the ones in the MRZ code.

4. **Checking Expiry Date:** Ensuring the passport has not expired.

## Acknowledgments

- Special thanks to the contributors of the Expo and AWS SDK libraries.

- Thanks to all the developers who have shared their knowledge and resources online.

<!-- Horizontal Rule -->

---

I hope this app helps you easily validate passport MRZ codes. If you have any questions or feedback, feel free to open an issue or contribute to the project. Happy coding!
