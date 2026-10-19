# Gap Learning Summit

A web-based platform developed for the Gap Learning Summit at Rabun Gap-Nacoochee School. It supports event scheduling and organization for students, teachers, and organizers.

Live site: https://learning-summit---vincent.web.app

## What it does

- Shows the day's sessions, filtered by school division (Lower, Middle, and Upper), plus all-school and teacher tracks
- Lets students register for a session, and stops registration when the room is full
- Gives each person a personal schedule
- Checks people in with a QR code at the room
- Tracks preparation tasks and exports them to Excel
- Collects feedback and custom forms
- Sends notifications, including urgent ones
- Gives organizers an admin area to import the student roster, edit sessions, and read feedback

It is designed for a full-school event, on the order of 600 people using it on the same day.

## Stack

React, Vite, Tailwind, Express, PostgreSQL, and Firebase Hosting.

## Run it locally

```bash
pnpm install
pnpm dev
```

The frontend starts with the API services. Database setup is `pnpm db:push`, and sample data is `pnpm db:seed`.
