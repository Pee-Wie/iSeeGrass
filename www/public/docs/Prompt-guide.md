I need database structure for my iSeeGrass Has Users, Assessment, Identification, and more(idk what else to add so don't finalize yet we may need to modify/edit aome table along the way) and recommend me what is needed and what might be best for this database current the system has Users pages(inside www/views/users) Homepage(index.html) Dashboard(dashboard.html) Identification(identify.html) Assessment(assessment.html) Profile(profile.html) I wont be discussing Homepage and dashboard. Identification page has this big card and inside is separate by 2 cards(75%left-25%right) then theres a right sidebar for Identification History •25$ is the Photo Collection part where users can Upload or capture a photo(Upload Image button and Capture Button), then uploaded/captured photo has buttons such as send, rename, and Remove. Can select any only one photo to send, cant select when theres already a photo in the left side(75%) •Rename- will rename photo in this format (newname(oldname).png/jpeg/jpg) •Send- Send to the left part(75%) for identification •Remove/Delete from photo collection(any captured image will be permanently delete it that image was not committed to identify) •75% will be where the identification happens, when no photo it send here, users can either drag photos directly from the photo collection (select one photo in photo collection and hit send(mobile version)drag and drop(web version in desktop using mouse) or drag and drop from local storgae using mouse), Dont have a Capture button, When there's an Image there are 3 new buttons will appear in the right side of 75%() Also has a public pages like Landing page Contact us About us Explore(let public visitor explore the segrass catalog) Identify(let guest/public visitor use the CNN Identification model without creating acc. but their Identification won't be recorded and will be erased when page is refreshed or closed) also public Identification page is only available on web version

---

Continuing from the above — now let's go deeper into the remaining pages and what the database must support.

## Assessment Page (users/assessment.html)
The Assessment page is for seagrass ecological assessment using quadrat sampling. A user can:
- Create a new Assessment session/record
- Fill in field details: location (may include GPS coordinates), date, site name, observer/user, sampling method (e.g., quadrat)
- Upload or capture multiple images per quadrat (quadrat photos)
- Each quadrat photo is sent to CREYNet (our CNN model) for identification
- The result per quadrat includes: identified species list, percentage cover per species, abundance rating
- Multiple quadrats can be added to one assessment session
- The assessment generates a summary: overall species composition, average percentage cover, dominant species
- Completed assessments can be viewed, exported (PDF or similar), or deleted
- Assessment records are tied to a logged-in user and must be stored permanently

## Profile Page (users/profile.html)
- Displays user info: name, email, role, profile photo, date joined
- User can update their display name, email, and profile photo
- Password change is separate (current password required)
- Shows basic stats: total identifications made, total assessments made

## Admin Pages
The admin side has these pages:
- dashboard.html — admin overview stats (total users, total identifications, total assessments, recent activity)
- identify.html — admin can also perform identifications (same function as user identify page)
- editor.html — admin can create/edit/delete seagrass species entries in the species catalog (species name, scientific name, description, images, ecological info)
- sgp.html — Seagrass Species/Dataset management: manage the dataset used for training CREYNet, view uploaded training images per species, add or remove training images
- users.html — admin can view all registered users, change user roles (admin/user), deactivate or delete accounts
- report.html — admin can view and export reports: identification logs, assessment summaries, user activity

## Seagrass Species Catalog
There is an Explore page (public/explore.html) that lets anyone browse the seagrass species catalog.
Each species entry has:
- Species ID
- Common name
- Scientific name
- Description / ecological info
- One or more catalog images
- Status (published / draft — admin controls this)

## The CNN Model (CREYNet)
- The model is named CREYNet (Convolutional Recognition of Eelgrass Yards)
- It takes a seagrass image as input and returns: identified species name(s), confidence score(s)
- Identification results reference species from the species catalog
- Every identification made by a logged-in user must be recorded
- Guest/public identifications are NOT recorded

## Identification History (sidebar on identify.html)
- Shows a list of past identifications for the logged-in user
- Each entry shows: thumbnail, identified species, confidence, date/time
- Clicking an entry shows full result detail

## Users/Editor page (users/editor.html)
- This is distinct from admin editor
- This seems to be a user-side content/notes editor — exact purpose to be confirmed, but likely for saving personal notes or field observations tied to a session or assessment

## Technology Stack (important for database design decisions)
- Database: MySQL or MariaDB
- Backend: PHP (plain, no framework)
- The backend is in core/ folder with controllers, models, middleware, and api/ folder for endpoints
- Migration files go in database/migrattion/
- Seed files go in database/seed/

## Roles
- guest (not logged in, public visitor)
- user (registered account, standard access)
- admin (full access including species management, user management, reports)

## What I want from you now:
Based on everything above, please now propose the full database schema. For each table provide:
1. Table name
2. All columns with data types
3. Primary keys and foreign keys
4. Brief explanation of what it stores and why it's needed

Also flag any tables where you are unsure or where we might need to discuss the design further before finalizing. We have not finalized anything yet — this is still a working draft.