import ExcelJS from 'exceljs'
import { neon } from '@neondatabase/serverless'
import { del, put } from '@vercel/blob'
import { createHash, randomUUID } from 'node:crypto'
import express from 'express'
import multer from 'multer'
import { access, mkdir, readFile, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const projectDirectory = path.dirname(fileURLToPath(import.meta.url))
const production = process.argv.includes('--production')
const isVercel = process.env.VERCEL === '1'
const port = Number(process.env.PORT) || (production ? 3000 : 3001)
const inquiryDirectory = path.resolve(
  process.env.INQUIRIES_DIR || path.join(projectDirectory, 'data', 'inquiries'),
)
const resumeDirectory = path.resolve(
  process.env.RESUMES_DIR || path.join(projectDirectory, 'data', 'resumes'),
)
const maximumResumeSizeBytes = 4 * 1024 * 1024
const urgentHiringDirectory = path.resolve(
  process.env.URGENT_HIRING_DIR || path.join(projectDirectory, 'data'),
)
const urgentHiringFileName = 'urgent-hiring.xlsx'
const urgentHiringFilePath = path.join(urgentHiringDirectory, urgentHiringFileName)
const urgentHiringStateFilePath = path.join(
  urgentHiringDirectory,
  'urgent-hiring-posted-at.json',
)
const urgentHiringSheetName = 'Urgent Hiring'
const urgentHiringLifetimeSeconds = 24 * 60 * 60
const urgentHiringStateVersion = 2
const urgentHiringStateVersionKey = '__version'
const openingsFilePath = path.join(urgentHiringDirectory, 'openings.xlsx')
const openingsSheetName = 'Openings'

const roleFiles = new Map([
  ['Manpower Supply', 'manpower-supply.xlsx'],
  ['Engineering Staffing', 'engineering-staffing.xlsx'],
  ['Pharma & Chemical Staffing', 'pharma-chemical-staffing.xlsx'],
  ['On-Roll Staffing', 'on-roll-staffing.xlsx'],
  ['Senior HR', 'senior-hr.xlsx'],
  ['HR Head', 'hr-head.xlsx'],
  ['HR Manager', 'hr-manager.xlsx'],
  ['Plant Head', 'plant-head.xlsx'],
  ['Production Head', 'production-head.xlsx'],
  ['Quality Engineer', 'quality-engineer.xlsx'],
  ['Quality Head', 'quality-head.xlsx'],
  ['Account Manager', 'account-manager.xlsx'],
  ['Accountant Manager', 'accountant-manager.xlsx'],
  ['Purchase Head', 'purchase-head.xlsx'],
  ['Company Secretary', 'company-secretary.xlsx'],
  ['Job Availability Inquiry', 'job-availability-inquiry.xlsx'],
  ['Other', 'other-inquiries.xlsx'],
])

const writeQueues = new Map()
const databaseUrl =
  process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_URL_NON_POOLING
const database = databaseUrl ? neon(databaseUrl) : null
let databaseSchemaPromise
const workbookColumns = [
  { header: 'Submitted At (UTC)', key: 'submittedAt', width: 26 },
  { header: 'Full Name', key: 'name', width: 28 },
  { header: 'Mobile Number', key: 'phone', width: 20 },
  { header: 'Email Address', key: 'email', width: 32 },
  { header: 'Company Name', key: 'company', width: 28 },
  { header: 'Preferred Location', key: 'preferredLocation', width: 28 },
  { header: 'Preferred Profile', key: 'preferredProfile', width: 28 },
  { header: 'Current Salary', key: 'currentSalary', width: 22 },
  { header: 'Notice Period', key: 'noticePeriod', width: 20 },
  { header: 'Total Experience (Years)', key: 'totalExperience', width: 24 },
  { header: 'Expected Salary', key: 'expectedSalary', width: 22 },
  { header: 'Current Location', key: 'currentLocation', width: 28 },
  { header: 'Home Town', key: 'homeTown', width: 28 },
  { header: 'Interested Domain', key: 'service', width: 28 },
  { header: 'Message', key: 'message', width: 60 },
  { header: 'Resume File', key: 'resumeFile', width: 48 },
]

const app = express()
const resumeUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: maximumResumeSizeBytes, files: 1 },
  fileFilter(_request, file, callback) {
    const extension = path.extname(file.originalname).toLowerCase()
    if (!['.pdf', '.doc', '.docx'].includes(extension)) {
      callback(new Error('Please upload a PDF, DOC, or DOCX resume.'))
      return
    }

    callback(null, true)
  },
})

app.use(express.json({ limit: '20kb' }))

app.get('/api/health', (_request, response) => {
  response.json({ status: 'ok' })
})

app.get('/api/urgent-hiring', async (_request, response) => {
  try {
    const result = await readUrgentHiring()
    return response.json(result)
  } catch (error) {
    console.error('Failed to read urgent hiring workbook', error)
    return response.status(500).json({
      error: 'We could not load urgent hiring openings.',
    })
  }
})

app.get('/api/openings', async (_request, response) => {
  try {
    const openings = await readOpenings()
    return response.json({ openings })
  } catch (error) {
    console.error('Failed to read openings workbook', error)
    return response.status(500).json({
      error: 'We could not load available positions.',
    })
  }
})

app.post('/api/inquiries', handleResumeUpload, async (request, response) => {
  if (!request.file) {
    return response.status(400).json({
      error: 'Please attach your resume before submitting the form.',
    })
  }

  const inquiry = validateInquiry(request.body)

  if (!inquiry) {
    return response.status(400).json({
      error: 'Please provide valid applicant details and select an interested domain.',
    })
  }

  const fileName = roleFiles.get(inquiry.service) || roleFiles.get('Other')
  const filePath = path.join(inquiryDirectory, fileName)
  let savedResumePath
  let savedResumeBlobPath

  try {
    let resumeFile = ''
    if (request.file) {
      if (!isValidResumeFile(request.file)) {
        return response.status(400).json({
          error: 'The selected file is not a valid PDF, DOC, or DOCX resume.',
        })
      }

      const resumeFileName = `${randomUUID()}${path.extname(request.file.originalname).toLowerCase()}`
      if (isVercel) {
        await getDatabase()
        const blobPath = `resumes/${resumeFileName}`
        const blob = await put(blobPath, request.file.buffer, {
          access: 'private',
          token: getBlobToken(),
          addRandomSuffix: false,
          contentType: request.file.mimetype,
        })
        savedResumeBlobPath = blob.pathname
        resumeFile = blob.pathname
      } else {
        await mkdir(resumeDirectory, { recursive: true })
        const targetResumePath = path.join(resumeDirectory, resumeFileName)
        await writeFile(targetResumePath, request.file.buffer, { flag: 'wx' })
        savedResumePath = targetResumePath
        resumeFile = path.relative(projectDirectory, targetResumePath).split(path.sep).join('/')
      }
    }

    const record = {
      ...inquiry,
      resumeFile,
      submittedAt: new Date().toISOString(),
    }
    if (isVercel) {
      await saveInquiryToDatabase(record)
    } else {
      await queueWorkbookWrite(fileName, () => appendInquiry(filePath, record))
    }
    return response.status(201).json({ fileName })
  } catch (error) {
    if (savedResumeBlobPath) {
      try {
        await del(savedResumeBlobPath, { token: getBlobToken() })
      } catch (cleanupError) {
        console.error('Failed to remove an unrecorded resume upload', cleanupError)
      }
    }
    if (savedResumePath) {
      try {
        await unlink(savedResumePath)
      } catch (cleanupError) {
        if (cleanupError.code !== 'ENOENT') {
          console.error('Failed to remove an unrecorded resume upload', cleanupError)
        }
      }
    }
    console.error('Failed to store inquiry workbook', error)
    return response.status(500).json({
      error: 'We could not save your inquiry. Please try again later.',
    })
  }
})

if (production && !isVercel) {
  const buildDirectory = path.join(projectDirectory, 'dist')
  app.use(express.static(buildDirectory))
  app.use((request, response, next) => {
    if (request.method !== 'GET' || request.path.startsWith('/api/')) {
      return next()
    }

    return response.sendFile(path.join(buildDirectory, 'index.html'))
  })
}

if (!isVercel) {
  app.listen(port, '0.0.0.0', () => {
    console.log(`AEAMS ${production ? 'website and API' : 'API'} listening on port ${port}`)
    readUrgentHiring().catch((error) => {
      console.error('Failed to initialize urgent hiring workbook', error)
    })
    readOpenings().catch((error) => {
      console.error('Failed to initialize openings workbook', error)
    })
  })

  setInterval(() => {
    readUrgentHiring().catch((error) => {
      console.error('Failed to clean expired urgent hiring entries', error)
    })
  }, 30 * 60 * 1000)
}

export default app

function validateInquiry(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return null
  }

  const inquiry = {
    name: readString(body.name),
    phone: readString(body.phone),
    email: readString(body.email),
    company: readString(body.company),
    preferredLocation: readString(body.preferredLocation),
    preferredProfile: readString(body.preferredProfile),
    currentSalary: readString(body.currentSalary),
    noticePeriod: readString(body.noticePeriod),
    totalExperience: readString(body.totalExperience),
    expectedSalary: readString(body.expectedSalary),
    currentLocation: readString(body.currentLocation),
    homeTown: readString(body.homeTown),
    service: readString(body.service),
    message: readString(body.message),
  }
  const phoneDigits = inquiry.phone.replace(/\D/g, '')
  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inquiry.email)
  const totalExperience = Number(inquiry.totalExperience)

  if (
    !inquiry.name ||
    inquiry.name.length > 120 ||
    phoneDigits.length < 7 ||
    phoneDigits.length > 15 ||
    !validEmail ||
    inquiry.email.length > 254 ||
    inquiry.company.length > 160 ||
    !inquiry.preferredLocation ||
    inquiry.preferredLocation.length > 120 ||
    !inquiry.preferredProfile ||
    inquiry.preferredProfile.length > 120 ||
    inquiry.currentSalary.length > 80 ||
    !inquiry.noticePeriod ||
    inquiry.noticePeriod.length > 80 ||
    !inquiry.totalExperience ||
    !Number.isFinite(totalExperience) ||
    totalExperience < 0 ||
    totalExperience > 60 ||
    !inquiry.expectedSalary ||
    inquiry.expectedSalary.length > 80 ||
    !inquiry.currentLocation ||
    inquiry.currentLocation.length > 120 ||
    !inquiry.homeTown ||
    inquiry.homeTown.length > 120 ||
    !inquiry.service ||
    inquiry.service.length > 120 ||
    !inquiry.message ||
    inquiry.message.length > 10000
  ) {
    return null
  }

  return inquiry
}

function handleResumeUpload(request, response, next) {
  resumeUpload.single('resume')(request, response, (error) => {
    if (!error) {
      next()
      return
    }

    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      return response.status(413).json({
        error: 'Resume files must be 4 MB or smaller.',
      })
    }

    if (error instanceof multer.MulterError) {
      return response.status(400).json({
        error: 'Please upload only one resume file.',
      })
    }

    return response.status(400).json({ error: error.message })
  })
}

function isValidResumeFile(file) {
  const extension = path.extname(file.originalname).toLowerCase()
  if (extension === '.pdf') {
    return file.buffer.subarray(0, 5).toString('ascii') === '%PDF-'
  }

  if (extension === '.doc') {
    return file.buffer
      .subarray(0, 8)
      .equals(Buffer.from('D0CF11E0A1B11AE1', 'hex'))
  }

  if (extension === '.docx') {
    const isZipFile = file.buffer
      .subarray(0, 4)
      .equals(Buffer.from([0x50, 0x4b, 0x03, 0x04]))
    return (
      isZipFile &&
      file.buffer.includes(Buffer.from('[Content_Types].xml')) &&
      file.buffer.includes(Buffer.from('word/document.xml'))
    )
  }

  return false
}

function readString(value) {
  return typeof value === 'string' ? value.trim() : ''
}

async function readUrgentHiring() {
  if (isVercel) {
    const sql = await getDatabase()
    const rows = await sql`
      SELECT position, qualification, location, salary, experience, facility,
             contact1, contact2, posted_at
      FROM aeams_urgent_hiring
      WHERE posted_at > NOW() - INTERVAL '24 hours'
      ORDER BY posted_at DESC
    `
    return {
      openings: rows.map((row) => ({
        position: row.position,
        qualification: row.qualification,
        location: row.location,
        salary: row.salary,
        experience: row.experience,
        facility: row.facility,
        contact1: row.contact1,
        contact2: row.contact2,
        postedAt: new Date(row.posted_at).toISOString(),
      })),
      warnings: [],
    }
  }

  await mkdir(urgentHiringDirectory, { recursive: true })

  const workbook = new ExcelJS.Workbook()
  let workbookExists = true
  try {
    await access(urgentHiringFilePath)
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error
    }
    workbookExists = false
  }

  if (!workbookExists) {
    const worksheet = workbook.addWorksheet(urgentHiringSheetName)
    worksheet.columns = urgentHiringColumns
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF123D78' },
    }
    await workbook.xlsx.writeFile(urgentHiringFilePath)
  } else {
    await workbook.xlsx.readFile(urgentHiringFilePath)
  }

  let worksheet = workbook.getWorksheet(urgentHiringSheetName)
  if (!worksheet) {
    worksheet = workbook.addWorksheet(urgentHiringSheetName)
    worksheet.columns = urgentHiringColumns
  }

  const postedAtState = await readUrgentHiringState()
  const needsStateMigration =
    postedAtState[urgentHiringStateVersionKey] !== urgentHiringStateVersion
  const headerColumns = new Map()
  worksheet.getRow(1).eachCell((cell, columnNumber) => {
    const header = readString(cell.text).toLowerCase()
    if (header) headerColumns.set(header, columnNumber)
  })
  const getColumn = (header, fallback) =>
    headerColumns.get(header.toLowerCase()) ?? fallback
  const hasPostedAtHeader = headerColumns.has('posted at (utc)')
  const contact1Column = getColumn('Contact 1', hasPostedAtHeader ? 0 : 7)
  const contact2Column = getColumn('Contact 2', 8)
  const postedAtColumn = getColumn('Posted At (UTC)', 9)
  const existingStateKeys = new Set()
  const openingOccurrences = new Map()
  const now = Date.now()
  const openings = []
  const warnings = []
  let stateChanged = false

  for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber)
    if (!row.hasValues) continue

    const opening = {
      position: readString(row.getCell(1).text),
      qualification: readString(row.getCell(2).text),
      location: readString(row.getCell(3).text),
      salary: readString(row.getCell(4).text),
      experience: readString(row.getCell(5).text),
      facility: readString(row.getCell(6).text),
      contact1: contact1Column
        ? readString(row.getCell(contact1Column).text)
        : '',
      contact2: readString(row.getCell(contact2Column).text),
    }

    if (!opening.position) {
      if (Object.values(opening).some(Boolean)) {
        warnings.push(
          `Excel row ${rowNumber}: Position is blank. Enter the job title in column A.`,
        )
      }
      continue
    }

    const openingKey = createHash('sha256')
      .update(JSON.stringify(opening))
      .digest('hex')
    const occurrence = openingOccurrences.get(openingKey) || 0
    openingOccurrences.set(openingKey, occurrence + 1)
    const stateKey = `${openingKey}:${occurrence}`
    existingStateKeys.add(stateKey)

    let postedAt = readExcelDate(postedAtState[stateKey])
    if (!postedAt && needsStateMigration) {
      const savedPostedAt =
        occurrence === 0 ? postedAtState[openingKey] : null
      postedAt = readExcelDate(savedPostedAt)
      if (!postedAt) {
        postedAt = readExcelDate(row.getCell(postedAtColumn).value)
      }
    }
    if (!postedAt) {
      postedAt = new Date(now)
    }

    if (postedAtState[stateKey] !== postedAt.toISOString()) {
      postedAtState[stateKey] = postedAt.toISOString()
      stateChanged = true
    }

    if (now - postedAt.getTime() >= urgentHiringLifetimeSeconds * 1000) {
      continue
    }

    openings.unshift({
      ...opening,
      postedAt: postedAt.toISOString(),
    })
  }

  for (const stateKey of Object.keys(postedAtState)) {
    if (
      stateKey !== urgentHiringStateVersionKey &&
      !existingStateKeys.has(stateKey)
    ) {
      delete postedAtState[stateKey]
      stateChanged = true
    }
  }

  if (needsStateMigration) {
    postedAtState[urgentHiringStateVersionKey] = urgentHiringStateVersion
    stateChanged = true
  }

  if (stateChanged) {
    await writeFile(urgentHiringStateFilePath, JSON.stringify(postedAtState, null, 2))
  }

  return { openings, warnings }
}

async function readOpenings() {
  if (isVercel) {
    const sql = await getDatabase()
    const rows = await sql`
      SELECT position, location
      FROM aeams_openings
      ORDER BY id
    `
    return rows.map((row) => ({
      position: row.position,
      location: row.location,
    }))
  }

  await mkdir(urgentHiringDirectory, { recursive: true })

  const workbook = new ExcelJS.Workbook()
  let workbookExists = true
  try {
    await access(openingsFilePath)
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
    workbookExists = false
  }

  if (workbookExists) {
    await workbook.xlsx.readFile(openingsFilePath)
  }

  let worksheet = workbook.getWorksheet(openingsSheetName)
  if (!worksheet) {
    worksheet = workbook.addWorksheet(openingsSheetName)
    worksheet.columns = openingsColumns
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF123D78' },
    }
    await workbook.xlsx.writeFile(openingsFilePath)
  }

  const openings = []
  for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber)
    const position = readString(row.getCell(1).text)
    const location = readString(row.getCell(2).text)
    if (position && location) {
      openings.push({ position, location })
    }
  }

  return openings
}

async function readUrgentHiringState() {
  try {
    const state = JSON.parse(await readFile(urgentHiringStateFilePath, 'utf8'))
    if (!state || typeof state !== 'object' || Array.isArray(state)) {
      throw new Error('Urgent hiring state must contain a JSON object.')
    }
    return state
  } catch (error) {
    if (error.code === 'ENOENT') return {}
    throw error
  }
}

const urgentHiringColumns = [
  { header: 'Position', key: 'position', width: 28 },
  { header: 'Qualification', key: 'qualification', width: 48 },
  { header: 'Location', key: 'location', width: 24 },
  { header: 'Salary', key: 'salary', width: 24 },
  { header: 'Experience', key: 'experience', width: 20 },
  { header: 'Facility', key: 'facility', width: 24 },
  { header: 'Contact 1', key: 'contact1', width: 18 },
  { header: 'Contact 2', key: 'contact2', width: 18 },
]

const openingsColumns = [
  { header: 'Position', key: 'position', width: 32 },
  { header: 'Location', key: 'location', width: 24 },
]

function readExcelDate(value) {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value
  }
  if (typeof value === 'string') {
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? null : date
  }
  if (typeof value === 'number') {
    const date = new Date((value - 25569) * 86400 * 1000)
    return Number.isNaN(date.getTime()) ? null : date
  }
  return null
}

function queueWorkbookWrite(fileName, write) {
  const previousWrite = writeQueues.get(fileName) || Promise.resolve()
  const currentWrite = previousWrite.then(write, write)
  writeQueues.set(fileName, currentWrite)

  return currentWrite.finally(() => {
    if (writeQueues.get(fileName) === currentWrite) {
      writeQueues.delete(fileName)
    }
  })
}

async function appendInquiry(filePath, inquiry) {
  await mkdir(inquiryDirectory, { recursive: true })

  const workbook = new ExcelJS.Workbook()
  let workbookExists = true
  try {
    await access(filePath)
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error
    }

    workbookExists = false
  }

  if (workbookExists) {
    await workbook.xlsx.readFile(filePath)
  }

  let worksheet = workbook.getWorksheet('Inquiries')
  const isNewWorksheet = !worksheet
  if (isNewWorksheet) {
    worksheet = workbook.addWorksheet('Inquiries')
  }

  worksheet.columns = workbookColumns
  if (isNewWorksheet) {
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF123D78' },
    }
  }

  worksheet.addRow(inquiry)
  await workbook.xlsx.writeFile(filePath)
}

async function getDatabase() {
  if (!database) {
    throw new Error(
      'Configure DATABASE_URL or POSTGRES_URL for the Vercel deployment.',
    )
  }

  if (!databaseSchemaPromise) {
    databaseSchemaPromise = (async () => {
      await database`
        CREATE TABLE IF NOT EXISTS aeams_openings (
          id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
          position TEXT NOT NULL,
          location TEXT NOT NULL
        )
      `
      await database`
        CREATE TABLE IF NOT EXISTS aeams_urgent_hiring (
          id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
          position TEXT NOT NULL,
          qualification TEXT NOT NULL DEFAULT '',
          location TEXT NOT NULL DEFAULT '',
          salary TEXT NOT NULL DEFAULT '',
          experience TEXT NOT NULL DEFAULT '',
          facility TEXT NOT NULL DEFAULT '',
          contact1 TEXT NOT NULL DEFAULT '',
          contact2 TEXT NOT NULL DEFAULT '',
          posted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `
      await database`
        CREATE TABLE IF NOT EXISTS aeams_inquiries (
          id TEXT PRIMARY KEY,
          submitted_at TIMESTAMPTZ NOT NULL,
          name TEXT NOT NULL,
          phone TEXT NOT NULL,
          email TEXT NOT NULL,
          company TEXT NOT NULL,
          preferred_location TEXT NOT NULL,
          preferred_profile TEXT NOT NULL,
          current_salary TEXT NOT NULL,
          notice_period TEXT NOT NULL,
          total_experience TEXT NOT NULL,
          expected_salary TEXT NOT NULL,
          current_location TEXT NOT NULL,
          home_town TEXT NOT NULL,
          service TEXT NOT NULL,
          message TEXT NOT NULL,
          resume_file TEXT NOT NULL
        )
      `
      await database`
        CREATE INDEX IF NOT EXISTS aeams_urgent_hiring_posted_at_idx
        ON aeams_urgent_hiring (posted_at DESC)
      `
    })()
  }

  try {
    await databaseSchemaPromise
  } catch (error) {
    databaseSchemaPromise = undefined
    throw error
  }

  return database
}

function getBlobToken() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error('Configure BLOB_READ_WRITE_TOKEN for the Vercel deployment.')
  }

  return process.env.BLOB_READ_WRITE_TOKEN
}

async function saveInquiryToDatabase(inquiry) {
  const sql = await getDatabase()
  await sql`
    INSERT INTO aeams_inquiries (
      id, submitted_at, name, phone, email, company, preferred_location,
      preferred_profile, current_salary, notice_period, total_experience,
      expected_salary, current_location, home_town, service, message, resume_file
    ) VALUES (
      ${randomUUID()}, ${inquiry.submittedAt}, ${inquiry.name}, ${inquiry.phone},
      ${inquiry.email}, ${inquiry.company}, ${inquiry.preferredLocation},
      ${inquiry.preferredProfile}, ${inquiry.currentSalary}, ${inquiry.noticePeriod},
      ${inquiry.totalExperience}, ${inquiry.expectedSalary}, ${inquiry.currentLocation},
      ${inquiry.homeTown}, ${inquiry.service}, ${inquiry.message}, ${inquiry.resumeFile}
    )
  `
}
