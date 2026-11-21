import assert from 'node:assert/strict'
import test from 'node:test'
import ExcelJS from 'exceljs'
import {
  InvalidOpeningsWorkbookError,
  parseOpeningsWorkbook,
} from '../src/openings-workbook.js'

async function createWorkbookBuffer(sheetName, headers, rows = []) {
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet(sheetName)
  worksheet.addRow(headers)
  for (const row of rows) worksheet.addRow(row)
  return workbook.xlsx.writeBuffer()
}

test('parses openings by header and trims cell values', async () => {
  const buffer = await createWorkbookBuffer(
    'Openings',
    ['Location', 'Position'],
    [[' Pithampur ', ' Purchase ']],
  )

  assert.deepEqual(await parseOpeningsWorkbook(buffer), [
    { position: 'Purchase', location: 'Pithampur' },
  ])
})

test('rejects a workbook without the required worksheet', async () => {
  const buffer = await createWorkbookBuffer('Jobs', ['Position', 'Location'], [
    ['Purchase', 'Pithampur'],
  ])

  await assert.rejects(
    parseOpeningsWorkbook(buffer),
    InvalidOpeningsWorkbookError,
  )
})

test('rejects incomplete rows without returning partial data', async () => {
  const buffer = await createWorkbookBuffer(
    'Openings',
    ['Position', 'Location'],
    [
      ['Purchase', 'Pithampur'],
      ['HR', ''],
    ],
  )

  await assert.rejects(
    parseOpeningsWorkbook(buffer),
    /Row 3 must include both Position and Location/u,
  )
})

test('rejects an empty workbook to prevent accidental deletion', async () => {
  const buffer = await createWorkbookBuffer('Openings', ['Position', 'Location'])

  await assert.rejects(parseOpeningsWorkbook(buffer), /no openings/u)
})
