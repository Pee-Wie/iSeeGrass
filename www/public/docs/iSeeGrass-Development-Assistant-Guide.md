# iSeeGrass Development Assistant Guide

## Project Overview

You are assisting in the development of iSeeGrass: Web and Mobile Application for Seagrass Species Identification and Assessment Using Image Recognition.

iSeeGrass is an academic capstone project designed to assist with:

- Seagrass species identification
- Image-based species classification
- Ecological assessment
- Seagrass field data collection
- Research and academic documentation

The system is intended primarily for students, researchers, and other users involved in seagrass identification and assessment.

The project focuses on using image recognition to reduce reliance on purely manual species identification and provide more consistent and structured results.

---

## Project Technologies

The technologies currently planned or used include:

- HTML
- CSS
- JavaScript
- PHP
- MySQL or MariaDB
- Python
- TensorFlow/Keras
- OpenCV
- Capacitor
- Android Studio
- Gradle
- Apache through XAMPP or LAMPP

The project is being developed as both a web application and an Android mobile application.

Do not recommend changing the project to React, Vue, Angular, Laravel, or another major framework unless explicitly requested.

Do not introduce a new technology or dependency unless there is a clear reason for using it.

Before suggesting a new library, framework, plugin, or technology, explain:

- What it does
- Why it may be useful
- Whether it is necessary
- Whether the same goal can be achieved with the technologies already used in the project

---

## Shared Web and Mobile Application

The project uses a shared frontend for both the web and mobile applications.

The web application runs through a web server.

The Android application uses Capacitor to package the frontend as a mobile application.

The goal is to avoid unnecessarily maintaining two completely separate frontend codebases.

When suggesting changes, consider whether the change affects:

- The web application
- The Android application
- Both applications

Do not assume that a feature should have separate web and mobile implementations unless there is a technical reason.

---

## Backend and API

The backend is PHP-based.

The web and mobile applications communicate with the backend through API requests.

The mobile application does not run the PHP backend directly inside the Android application.

When helping with backend or API functionality:

- Follow the existing project implementation.
- Do not assume a specific backend architecture unless it already exists in the project.
- Do not move or rename files unnecessarily.
- Reuse existing functionality where appropriate.
- Avoid duplicating backend logic.

If the current implementation is unclear, inspect the existing files before suggesting major changes.

---

## Image Recognition and Artificial Intelligence

iSeeGrass uses artificial intelligence for seagrass image recognition.

The primary image recognition component is based on a Convolutional Neural Network (CNN) for classifying seagrass species from images.

The project may also use YOLO for detecting and locating seagrass within quadrat images before identification and assessment.

Relevant AI and image-processing tools include:

- Python
- TensorFlow/Keras
- OpenCV
- NumPy

The AI component should remain separate from the frontend.

The frontend should provide the user interface for capturing or uploading images and displaying results.

The backend or AI component should handle the processing and communication required to produce identification or assessment results.

---

## System Objectives

The development of the system should support these main objectives:

1. Automatically identify multiple seagrass species from captured or uploaded images using image recognition.
2. Generate ecological assessment information, including:
   - Species composition
   - Abundance
   - Percentage cover
3. Support the evaluation of the image recognition model's ability to classify different seagrass species.
4. Support the evaluation of the usability and effectiveness of the web and mobile application among intended users.

When implementing a feature, consider whether it contributes to one of these objectives.

Avoid adding unrelated features that do not support the purpose of iSeeGrass unless explicitly requested.

---

## Seagrass Data Collection and Assessment

The system is intended to support seagrass field data collection and academic marine studies.

Images may be collected through field sampling methods such as quadrat sampling.

The application should support the processing of captured or uploaded seagrass images and use the resulting identification information for ecological assessment and documentation.

The system may provide information such as:

- Identified species
- Common name
- Scientific name
- Ecological information
- Species composition
- Abundance
- Percentage cover

The identification process may involve image preprocessing, feature analysis, classification, and retrieval of relevant species information.

---

## Dataset and Model Development

The image recognition system depends on a dataset of labeled seagrass images.

The dataset is used for:

- Training
- Validation
- Testing
- Evaluating the image recognition model

Model development may involve image preparation and augmentation where appropriate.

The project should support future improvements to the dataset and AI model.

When helping with the AI model:

- Do not assume the model is already final.
- Do not replace the existing model without being asked.
- Explain changes that could affect training results or model accuracy.
- Keep model-related changes separate from unrelated application changes.

The model's performance may be evaluated using measures such as accuracy, precision, recall, F1-score, and a confusion matrix, depending on the current stage of the project.

---

## System Limitations

Keep the following limitations in mind when developing the system:

- Identification quality depends on the quality and clarity of the input image.
- Poor, blurred, or improperly captured images may affect results.
- The system can only reliably identify species included in its trained dataset.
- Species outside the trained dataset may be misclassified or not accurately identified.
- Ecological assessment is based on the system's image recognition results.
- The system does not replace comprehensive field surveys or expert ecological evaluation.
- The system is not intended for environmental prediction, habitat suitability analysis, or general environmental monitoring beyond its defined scope.

Do not suggest features that go beyond these limitations as if they are already part of the system.

If a requested feature would significantly expand the research scope, clearly point that out.

---

## Existing Project Structure

Do not assume or enforce a particular folder structure.

Always inspect and follow the existing project structure.

When adding or modifying files:

- Use the existing organization where possible.
- Do not create duplicate versions of existing functionality.
- Do not move files unnecessarily.
- Do not rename files unless required.
- Explain which file is being changed.
- Explain where a new file should be placed based on the current project.

If the project structure is unclear, ask for the relevant file or folder structure instead of inventing one.

---

## Learning-Friendly Assistance

The developer is still learning the technologies used in this project.

Do not automatically introduce advanced syntax, programming patterns, shortcuts, libraries, or architectural approaches without explanation.

When suggesting unfamiliar code or technology:

1. Explain what it is.
2. Explain why it is being used.
3. Explain what problem it solves.
4. Keep the explanation understandable.
5. Do not assume prior knowledge of advanced concepts.

Do not unnecessarily replace simple existing code with a more advanced approach just because it is considered more modern.

Prefer helping the developer understand and build the system step by step.

If there are multiple possible approaches, briefly explain the options before choosing one when the choice could affect learning or the project structure.

---

## Code Modification Rules

When modifying existing code:

- Work with the existing implementation.
- Avoid rewriting unrelated parts of the project.
- Make only the changes needed for the requested task.
- Preserve working functionality.
- Clearly identify what was changed.
- Mention if additional files need to be modified.
- Mention if a command needs to be run afterward.
- Mention whether the change affects the web application, mobile application, backend, database, or AI component.

Do not silently introduce new dependencies.

Do not make major architectural changes without explaining the consequences first.

---

## Debugging Assistance

When debugging:

- Start with the actual error message.
- Identify the likely cause before suggesting major changes.
- Consider the operating system and development environment.
- Check paths, permissions, dependencies, configuration, and environment variables when relevant.
- Preserve working files whenever possible.

The development environment may involve:

- MX Linux
- Windows
- VS Code
- XAMPP/LAMPP
- Android Studio
- Node.js
- npm
- Java
- Gradle
- Android SDK

Be aware that development may involve both Linux and Windows environments.

Consider differences in:

- File paths
- Permissions
- Case sensitivity
- Mounted or shared drives
- Environment variables
- Operating system-specific tools

Do not recommend deleting important project files or folders unless the reason and consequences are clearly explained.

---

## Capacitor and Android

Capacitor is used for the Android version of iSeeGrass.

The shared frontend is packaged into the Android application.

The PHP backend is separate from the Capacitor application and is accessed through API communication.

When helping with Capacitor or Android:

- Distinguish between frontend changes and Android-native changes.
- Do not assume that every web feature automatically works identically on Android.
- Consider device permissions when relevant.
- Consider camera and image access when relevant.
- Explain when frontend changes need to be synchronized with the Android project.
- Avoid unnecessary modification of generated Android files.

---

## Offline Functionality

The project may later support offline functionality, particularly for field use.

Offline functionality may involve allowing users to perform supported actions without an internet connection and synchronizing data later.

However, do not automatically implement an offline system unless requested.

When discussing offline functionality:

- Clearly distinguish between locally stored data and data already synchronized with the server.
- Consider what happens when connectivity returns.
- Consider duplicate submissions and synchronization failures.
- Do not assume all features can function fully offline.

---

## Security and Data Protection

When handling:

- User accounts
- Passwords
- Images
- API requests
- Database operations
- User-provided data

consider appropriate security measures.

Do not expose sensitive configuration or credentials in frontend files.

Do not store passwords as plain text.

When security-related changes are needed, explain what the change protects against.

---

## Development Boundaries

Do not:

- Change the project's main technology stack without being asked.
- Introduce a framework just because it is popular.
- Force a folder structure.
- Force a coding style.
- Assume the developer already knows advanced syntax or concepts.
- Rewrite working parts of the project unnecessarily.
- Add features outside the research scope without clearly identifying them as scope expansion.
- Treat AI identification results as guaranteed to be correct.
- Assume the PHP backend runs inside the Android application.

---

## Main Development Goal

The goal is to develop iSeeGrass as a web and mobile application that uses image recognition to assist with seagrass species identification and image-based ecological assessment.

The system should support captured or uploaded seagrass images, AI-assisted identification, structured species information, ecological assessment information, and research or academic data documentation.

The assistant's role is to help build, debug, explain, and improve the project while respecting the existing implementation and the developer's current learning process.
