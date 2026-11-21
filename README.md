# AEAMS

AEAMS is a responsive attendance dashboard for monitoring student and staff check-ins, live attendance trends, and operational alerts.

## Scripts

- `npm install`
- `npm run dev`
- `npm run build`
- `npm run lint`

## Inquiry form storage

- `npm run dev` starts the Vite website and the Node API together.
- Form submissions are appended to role-specific Excel files in `data/inquiries/`.
- Resumes are required and accept PDF, DOC, or DOCX files up to 5 MB. Files are stored privately in `data/resumes/`, and the corresponding workbook row records the saved path.
- `npm start` serves the production build and API together. Build first with `npm run build`.
- Set `INQUIRIES_DIR` to a persistent server directory when deploying; temporary or ephemeral hosting storage will not retain inquiry files.
- Set `RESUMES_DIR` to persistent server storage when deploying so uploaded resumes are retained.

## Urgent hiring posters

- Add each opening as a new row in `data/urgent-hiring.xlsx`, on the `Urgent Hiring` worksheet.
- Use these columns in order: Position, Qualification, Location, Salary, Experience, Facility, Contact 1, Contact 2.
- Every poster displays the AEAMS logo and Ahirwar Engineering and Manpower Services name.
- Every poster shows a live red alert countdown in the top-right corner and expires automatically 24 hours after publication.
- The API records each opening's publication time in `data/urgent-hiring-posted-at.json` when it first detects a new row. No time value needs to be entered in Excel.
- Any legacy `Display Duration` column in an existing workbook is ignored.
- Any legacy `Posted At (UTC)` values are used once to preserve existing posters during migration; new rows always start their own 24-hour timer when detected, even if an old timestamp was copied into the row.
- Rows without a Position in column A are skipped and reported on the hiring page. Posters expire and disappear from the website after 24 hours; expired source rows can be removed from Excel when convenient.
- The `/urgent-hiring` page fetches the workbook-backed openings and refreshes every 5 seconds, so saved Excel changes appear automatically. The API also checks for expired entries every 30 minutes.
- Keep the workbook in persistent server storage when deploying. The optional `URGENT_HIRING_DIR` environment variable can point to that directory.

## Available job openings

- Add available positions to `data/openings.xlsx`, on the `Openings` worksheet. The API creates this workbook if it does not exist.
- Use two columns in order: Position, Location. Add one opening per row and save the workbook.
- The home-page job search matches this workbook. Matches open the contact page with the job details; no match shows a sorry message and a Get in Touch link.
- `urgent-hiring.xlsx` remains the separate source for the urgent hiring poster cards.
- The home page opens an Urgent Hiring popup on every visit or refresh, with a link to current hiring posters.

## Features

- Real-time attendance overview cards
- Weekly trend visualization
- Attendance roster with status badges
- Responsive admin dashboard layout
