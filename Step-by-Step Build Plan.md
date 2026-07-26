Step-by-Step Build Plan

1. Project setup
- Since this folder only has CLAUDE.md so far, scaffold the actual Vite + React project (npm create vite@latest) matching what CLAUDE.md describes, or confirm if the real project lives elsewhere and this is just docs.
- Install two libraries: xlsx (SheetJS, to read the uploaded input file) and exceljs + file-saver (to write the styled output file — SheetJS's free version can't do borders/bold/column widths well, ExcelJS can).


- A page/route (e.g. /muster-roll) with:
  - File upload input (accepts .xlsx)
  - Salary Month picker (month + year)
  - Week Off weekday dropdown (Sunday–Saturday)
  - "Generate" button

3. Read the uploaded Excel
- Parse it with SheetJS into a JS array: [{ name, presentDays, absentDays }, ...]
- Validate: every row has a name, and presentDaber (won't yet know if it matches total workingdays until Step 4).

4. Compute the calendar for the chosen month
- Get total days in month (28–31).
- Mark every date that falls on the chosen weekday as W (week off).
- Remaining dates = working days pool.

5. Validate counts per employee
- Check presentDays + absentDays == workingDays
- Decide behavior on mismatch: reject with an error row, or auto-adjust — this is a decision point, we'll define it precisely before coding.

6. Random absence distribution
- For each employee, randomly pick absentDays dates out of the working-days pool → mark those A, the rest of the pool P.
- Use a seeded random (so re-generating the sam avoiding surprise re-shuffles).

7. Build the output workbook with ExcelJS
- Headers: Sr. | Name | 01 | 02 | ... | 31 | Total
- Bold header row, borders, frozen header + naming the screenshot.
- Fill each day cell with P / A / W.
- Total column as a formula (COUNTIF of P's in that row) or precomputed number.

8. Download
- Use file-saver to trigger a download named like muster roll general <month>-<year>.xlsx.

9. Polish / edge cases
- Half-day (½) support if needed.
- Error display for bad input rows (missing nam
- Preview table in the UI before download (optional but nice — lets user sanity-check before exporting).


---
❯ i want to create the cookie policy page

in that first add the inner banner componnet