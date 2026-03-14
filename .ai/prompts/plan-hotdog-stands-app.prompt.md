---
description: "Plan the GlizzyGuidizzle web app using the full agent team. Produces a phased implementation plan covering architecture, UI, styling, accessibility, UX, and performance."
agent: "agent"
tools: [read, search, edit, agent]
---

# GlizzyGuidizzle Web App — Multi-Agent Planning

You are the lead coordinator for planning a web application called **GlizzyGuidizzle**. Your job is to produce a comprehensive, phased implementation plan by delegating to the specialist agents listed below. Invoke each agent as a subagent and synthesize their outputs into a single unified plan.

## Application Requirements

### Overview
A web app that displays a map of all Canadian Tire locations across Canada. Users inspect each location via Google Street View to determine whether a hotdog stand is visible nearby.

### Core Features

1. **Interactive Map**
   - Display all Canadian Tire store locations on a map of Canada. Locations are stored in subabase, a web-hosted postgres database. The locations are stored in a table called cantire_loc. There are latitude and longitude columns for each location. The map should load all locations as markers.
   - Each location has a marker with one of five visual states, stored in the database cantire_loc table as a column called stand_status (text, nullable). The marker color or icon changes based on the status:
     - **null** (default) — not yet inspected
     - **stand-found** — user confirmed a hotdog stand is present
     - **no-stand** — user confirmed no hotdog stand is present
     - **no-cantire** — no Canadian Tire store found at the location
     - **insufficient-view** — Street View imagery insufficient to determine
   - Clicking a marker opens the Street View inspection view for that location.

2. **Street View Inspection**
   - When a marker is clicked, show a Google Street View panorama for that location.
   - The user can look around freely in the panorama (pan, zoom, navigate).
   - The user decides whether a hotdog stand is visible.

3. **Hotdog Stand Annotation**
   - If a hotdog stand is visible, the user can draw a bounding box around it on the Street View image.
   - The bounding box annotation is saved in table cantire_loc, field stand_bbox (an array float) and associated with that location.
   - The hyperlink to the Street View panorama is saved in the table cantire_loc, field stand_view (a string) and associated with that location.

4. **Status Tracking**
   - After inspecting a location, the user marks it with one of: Stand Found, No Stand, No Canadian Tire, or Insufficient View.
   - The map marker updates to reflect the new status.
   - The user can exit back to the map at any time to inspect another location.

5. **Data Persistence**
   - Store inspection results (status, bounding box data) so they persist across sessions.
   - We will use supabase for data storage, so the app should read/write to the cantire_loc table to update the stand_status, stand_view, and stand_bbox fields.

6. **Tech Stack**
   - The app should be built using vanilla javascript.
   - Use the Google Maps JS API.
   - The app should be responsive and work well on both desktop and mobile devices.
   - Use supabase for data storage and retrieval of location and inspection data.

## Agent Team

Delegate planning to each of these agents. Each agent should analyze the requirements above and return recommendations within their domain.

### 1. Frontend Architect → `frontend_architect`
Ask the frontend architect to produce:
- Recommended tech stack (framework, map library, Street View integration)
- Component architecture and hierarchy
- State management approach for location statuses and annotation data
- Data model for locations, inspection results, and bounding boxes
- Project directory structure
- API/data strategy for loading Canadian Tire locations
- Data persistence approach

### 2. UI Designer → `ui_designer`
Ask the UI designer to produce:
- Page/view layouts: map view, Street View inspection view
- Component designs: map markers (3 states), status legend, navigation controls, bounding box drawing tool, location info panel
- Responsive layout strategy (desktop and mobile)
- Transition design between map view and inspection view

### 3. CSS Specialist → `css_specialist`
Ask the CSS specialist to produce:
- Styling approach and methodology (CSS Modules, Tailwind, etc.)
- Map marker styles for all three states (unvisited, found, not found)
- Color palette and design token definitions
- Responsive breakpoint strategy
- Animation/transition specs for view switching and marker state changes
- Overlay and modal styling for the inspection view

### 4. Accessibility Reviewer → `accessibility_reviewer`
Ask the accessibility reviewer to produce:
- Keyboard navigation plan for map interaction, Street View, and annotation drawing
- Screen reader strategy for map markers and status changes
- ARIA roles for the map, Street View embed, and drawing canvas
- Color contrast verification for the three marker states
- Focus management plan for view transitions (map ↔ inspection)
- Alternative interaction methods for the bounding box tool

### 5. UX Reviewer → `ux_reviewer`
Ask the UX reviewer to produce:
- User flow from map → inspection → annotation → back to map
- Onboarding/first-use guidance recommendations
- Error state handling (Street View unavailable, location data failures)
- Empty/loading state designs
- Progress tracking UX (how many locations inspected, how many remain)
- Mobile interaction considerations for drawing bounding boxes on small screens

### 6. Performance Optimizer → `performance_optimizer`
Ask the performance optimizer to produce:
- Strategy for loading and rendering thousands of map markers efficiently (clustering, virtualization)
- Lazy loading plan for Street View panoramas
- Image and asset optimization recommendations
- Caching strategy for location data and inspection results
- Bundle size budget and code splitting approach
- Core Web Vitals targets and monitoring plan

## Output Format

After collecting all agent responses, synthesize them into a unified plan with the following structure:

### Unified Implementation Plan

1. **Tech Stack & Architecture** — from Frontend Architect
2. **Data Model & Persistence** — from Frontend Architect
3. **UI Components & Layouts** — from UI Designer
4. **Styling & Design Tokens** — from CSS Specialist
5. **Accessibility Plan** — from Accessibility Reviewer
6. **User Flows & UX** — from UX Reviewer
7. **Performance Strategy** — from Performance Optimizer
8. **Phased Delivery Roadmap** — your synthesis of all inputs into ordered implementation phases:
   - **Phase 1**: Project setup, map with markers, location data loading
   - **Phase 2**: Street View integration, basic inspection flow
   - **Phase 3**: Bounding box annotation tool, status tracking
   - **Phase 4**: Data persistence, progress indicators
   - **Phase 5**: Performance optimization, accessibility polish, mobile refinements
9. **Open Questions & Risks** — anything the agents flagged as needing clarification
