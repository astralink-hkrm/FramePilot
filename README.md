# S2C - AI Sketch-to-Design Learning Project

S2C is a project-based learning rebuild of an AI SaaS-style sketch-to-design application.

The web app allows users to create design projects, sketch wireframes on an infinite canvas, upload inspiration images, generate a style guide, render AI-generated UI screens, create related workflow pages, and export generated designs.

This project was built to understand how modern AI SaaS applications work across frontend, backend, authentication, database, background workflows, AI APIs, and interactive canvas tooling.

> This is a learning project inspired by Web Prodigies and is not intended for deployment.

---

## Project Status

This project is currently a learning case study and technical build.

It is not being launched publicly as a commercial SaaS product because the original concept and tutorial structure belong to Web Prodigies. The goal of this repository is to document the learning process, implementation, architecture, and engineering decisions involved in building a full-stack AI SaaS-style application.

---

## Features

- Google authentication
- Protected app routes
- Project dashboard
- Project creation and management
- Infinite canvas editor
- Frames, shapes, text, lines, arrows, and free drawing
- Eraser tool
- Layer selection and editing
- Zoom and pan controls
- Manual save and autosave
- Moodboard image uploads
- Image URL support
- AI-generated style guide
- AI-generated UI screens
- AI-generated workflow pages
- PNG export
- JSON export
- Dark-mode-only interface
- Responsive dashboard and editor layouts

---

## Tech Stack

### Frontend

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- shadcn/ui
- Radix UI
- lucide-react
- Redux

### Backend

- Convex
- Convex Auth
- Convex Database
- Convex Storage

### AI

- Gemini API
- OpenAI-compatible API route structure
- AI style guide generation
- AI UI generation
- AI workflow generation

### Automation

- Inngest
- Autosave workflows

### Development Tools

- VS Code
- Windows
- npm
- ngrok
- Git/GitHub

---

## Core Workflow

1. User signs in with Google.
2. User creates a new design project.
3. User sketches a wireframe on the infinite canvas.
4. User uploads moodboard or inspiration images.
5. The app generates a style guide from the moodboard.
6. The app uses the wireframe, style guide, and inspiration images to generate UI.
7. The user can generate related workflow pages.
8. Designs can be exported as PNG or JSON.

---
## Credit & Disclaimer
This project is a project-based learning rebuild inspired by the Web Prodigies AI SaaS tutorial.

The original product concept and tutorial structure belong to Web Prodigies. This repository is not intended for commercial launch, resale, or public SaaS deployment. It was built strictly as a learning project to understand modern AI SaaS architecture, including Next.js, Convex, Convex Auth, Inngest, AI APIs, canvas tooling, and workflow generation.

If this project were to be launched commercially, the appropriate license/permission from Web Prodigies would be required.

## Architecture Overview

```txt
User Interface
   |
   |-- Auth Pages
   |-- Dashboard
   |-- Canvas Editor
   |-- Style Guide Page
   |
Frontend State
   |
   |-- Redux canvas state
   |-- Viewport state
   |-- Selected layers/tools
   |
Backend
   |
   |-- Convex database
   |-- Convex Auth
   |-- Convex Storage
   |
AI Routes
   |
   |-- Generate style guide
   |-- Generate UI
   |-- Generate workflow pages
   |
Automation
   |
   |-- Inngest autosave
   |
Exports
   |
   |-- PNG export
   |-- JSON export
