import ExcelJS from 'exceljs'

export class InvalidOpeningsWorkbookError extends Error {}

export async function parseOpeningsWorkbook(buffer) {
  const workbook = new ExcelJS.Workbook()
  try {
    await workbook.xlsx.load(buffer)
  } catch {
    throw new InvalidOpeningsWorkbookError('The uploaded file is not a valid .xlsx workbook.')
  }

  const worksheet = workbook.getWorksheet('Openings')
  if (!worksheet) {
    throw new InvalidOpeningsWorkbookError(
      'The workbook must contain a worksheet named "Openings".',
    )
  }

  const columns = new Map()
  worksheet.getRow(1).eachCell((cell, columnNumber) => {
    const header = String(cell.text || '').trim().toLowerCase()
    if (header && !columns.has(header)) columns.set(header, columnNumber)
  })

  const positionColumn = columns.get('position')
  const locationColumn = columns.get('location')
  if (!positionColumn || !locationColumn) {
    throw new InvalidOpeningsWorkbookError(
      'The Openings worksheet must have Position and Location headers.',
    )
  }

  const openings = []
  for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber)
    const position = String(row.getCell(positionColumn).text || '').trim()
    const location = String(row.getCell(locationColumn).text || '').trim()
    if (!position && !location) continue
    if (!position || !location) {
      throw new InvalidOpeningsWorkbookError(
        `Row ${rowNumber} must include both Position and Location.`,
      )
    }

    openings.push({ position, location })
    if (openings.length > 1000) {
      throw new InvalidOpeningsWorkbookError('The workbook cannot contain more than 1,000 openings.')
    }
  }

  if (!openings.length) {
    throw new InvalidOpeningsWorkbookError(
      'The workbook has no openings. Add at least one row before uploading.',
    )
  }

  return openings
}
