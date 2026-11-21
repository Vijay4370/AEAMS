import {
  Children,
  cloneElement,
  createElement,
  Fragment,
  isValidElement,
  useEffect,
  useState,
} from 'react'
import './App.css'

const URGENT_HIRING_LIFETIME_MS = 24 * 60 * 60 * 1000
const URGENT_HIRING_POPUP_SUPPRESSED_KEY = 'aeams.urgent-hiring-popup-suppressed'
const navigationSectionIds = ['home', 'about', 'services', 'jobs']

function isUrgentHiringOpeningActive(opening, now) {
  return Date.parse(opening.postedAt) + URGENT_HIRING_LIFETIME_MS > now
}

function isUrgentHiringPopupSuppressed() {
  try {
    return window.sessionStorage.getItem(URGENT_HIRING_POPUP_SUPPRESSED_KEY) === 'true'
  } catch (error) {
    console.error('Could not read urgent hiring popup state', error)
    return false
  }
}

function suppressUrgentHiringPopup() {
  try {
    window.sessionStorage.setItem(URGENT_HIRING_POPUP_SUPPRESSED_KEY, 'true')
  } catch (error) {
    console.error('Could not save urgent hiring popup state', error)
  }
}

function resetUrgentHiringPopupSuppression() {
  try {
    window.sessionStorage.removeItem(URGENT_HIRING_POPUP_SUPPRESSED_KEY)
  } catch (error) {
    console.error('Could not reset urgent hiring popup state', error)
  }
}

function addWordHoverTargets(node) {
  if (typeof node === 'string' || typeof node === 'number') {
    const parts = String(node).split(/(\s+)/u)
    if (!parts.some((part) => /[\p{L}\p{N}]/u.test(part))) return node

    return createElement(
      'aeams-word-group',
      null,
      parts.map((part, index) => {
        if (!/[\p{L}\p{N}]/u.test(part)) return part

        return createElement(
          'aeams-word',
          { className: 'word-hover-target', key: index },
          part,
        )
      }),
    )
  }

  if (Array.isArray(node)) return Children.map(node, addWordHoverTargets)
  if (!isValidElement(node) || node.props.children == null) return node
  if (
    node.type === 'input' ||
    node.type === 'option' ||
    node.type === 'select' ||
    node.type === 'svg' ||
    node.type === 'textarea' ||
    (typeof node.type !== 'string' && node.type !== Fragment)
  ) {
    return node
  }

  return cloneElement(
    node,
    null,
    Children.map(node.props.children, addWordHoverTargets),
  )
}

function UrgentHiringMarqueeButton() {
  const [hasActiveOpening, setHasActiveOpening] = useState(false)

  useEffect(() => {
    let isMounted = true
    const checkUrgentHiringOpenings = async () => {
      try {
        const response = await fetch('/api/urgent-hiring', { cache: 'no-store' })
        const result = await response.json()
        if (!response.ok) {
          throw new Error(
            result.error || `Urgent hiring request failed with status ${response.status}.`,
          )
        }
        if (!Array.isArray(result.openings)) {
          throw new Error('Urgent hiring response did not contain an openings list.')
        }

        const hasActiveOpening = result.openings.some((opening) =>
          isUrgentHiringOpeningActive(opening, Date.now()),
        )
        if (isMounted) setHasActiveOpening(hasActiveOpening)
      } catch (error) {
        if (isMounted) {
          console.error('Failed to check urgent hiring openings for marquee', error)
        }
      }
    }

    checkUrgentHiringOpenings()
    return () => {
      isMounted = false
    }
  }, [])

  if (!hasActiveOpening) return null

  return addWordHoverTargets(
    <section className="urgent-bar" id="jobs">
      <a
        className="urgent-text"
        href="/urgent-hiring"
        aria-label="View urgent hiring openings"
      >
        <div className="urgent-marquee">
          <div className="urgent-marquee-track">
            <div className="urgent-marquee-group">
              <span>URGENT HIRING</span>
              <span>URGENT HIRING</span>
              <span>URGENT HIRING</span>
              <span>URGENT HIRING</span>
              <span>URGENT HIRING</span>
              <span>URGENT HIRING</span>
            </div>
            <div className="urgent-marquee-group" aria-hidden="true">
              <span>URGENT HIRING</span>
              <span>URGENT HIRING</span>
              <span>URGENT HIRING</span>
              <span>URGENT HIRING</span>
              <span>URGENT HIRING</span>
              <span>URGENT HIRING</span>
            </div>
          </div>
        </div>
      </a>
    </section>,
  )
}

const services = [
  {
    icon: '👥',
    title: 'Manpower Supply',
    text: 'Skilled & unskilled manpower for manufacturing, construction & operations',
  },
  {
    icon: '🧑‍🏭',
    title: 'Engineering Staffing',
    text: 'Qualified engineers, technicians & project staff for industrial & infrastructure projects',
  },
  {
    icon: '🧪',
    title: 'Pharma & Chemical Staffing',
    text: 'Trained professionals for pharma, chemical & laboratory operations',
  },
  {
    icon: '📋',
    title: 'On-Roll Staffing',
    text: 'Payroll & compliance management with on-roll staffing solutions',
  },
  {
    icon: '👔',
    title: 'Senior HR',
    text: 'Experienced senior HR professionals for workforce planning and employee management',
  },
  {
    icon: '🏢',
    title: 'HR Head',
    text: 'Strategic HR leadership for policy, compliance and organizational development',
  },
  {
    icon: '🤝',
    title: 'HR Manager',
    text: 'HR managers for recruitment, payroll coordination and employee operations',
  },
  {
    icon: '🏭',
    title: 'Plant Head',
    text: 'Plant leadership for production efficiency, operations and team management',
  },
  {
    icon: '⚙️',
    title: 'Production Head',
    text: 'Production leaders for planning, execution and operational performance',
  },
  {
    icon: '🔬',
    title: 'Quality Engineer',
    text: 'Quality engineers for inspection, testing and process improvement',
  },
  {
    icon: '✅',
    title: 'Quality Head',
    text: 'Quality leadership for standards, audits and continuous improvement',
  },
  {
    icon: '📊',
    title: 'Account Manager',
    text: 'Account management professionals for client handling and financial coordination',
  },
  {
    icon: '💼',
    title: 'Accountant Manager',
    text: 'Accounting professionals for reporting, compliance and financial operations',
  },
  {
    icon: '🛒',
    title: 'Purchase Head',
    text: 'Purchase leadership for vendor management, sourcing and cost control',
  },
  {
    icon: '⚖️',
    title: 'Company Secretary',
    text: 'Company secretarial support for governance, statutory compliance and documentation',
  },
]

const industries = [
  'Manufacturing',
  'Construction',
  'Engineering & Infrastructure',
  'Pharma & Chemical',
  'Laboratory Operations',
  'Factory Operations',
]

const pithampurCompanies = [
  {
    name: 'Force Motors',
    mark: 'FORCE',
    style: 'force',
    industry: 'Automotive',
    description:
      'An Indian automotive manufacturer with a major manufacturing facility in Pithampur.',
    products: 'Commercial vehicles, utility vehicles, engines and automotive components.',
    website: 'https://www.forcemotors.com/',
  },
  {
    name: 'VE Commercial Vehicles',
    mark: 'VECV',
    style: 'vecv',
    industry: 'Commercial vehicles',
    description:
      'A Volvo Group and Eicher Motors joint venture with manufacturing operations in Pithampur.',
    products: 'Eicher trucks, buses, engines and related engineering components.',
    website: 'https://www.vecv.in/',
  },
  {
    name: 'Bridgestone India',
    mark: 'BRIDGESTONE',
    style: 'bridgestone',
    industry: 'Automotive',
    description:
      'The Indian subsidiary of Bridgestone, a global tyre and mobility-solutions manufacturer.',
    products: 'Tyres for passenger cars, commercial vehicles and other applications.',
    website: 'https://www.bridgestone.co.in/',
  },
  {
    name: 'AVTEC',
    mark: 'AVTEC',
    style: 'avtec',
    industry: 'Automotive engineering',
    description:
      'An engineering and manufacturing company with an engine manufacturing plant in Pithampur.',
    products: 'Automotive engines, transmissions and powertrain components.',
    website: 'https://www.avtec.in/',
  },
  {
    name: 'Shakti Pumps',
    mark: 'SHAKTI',
    style: 'shakti',
    industry: 'Pumps and motors',
    description:
      'A pumping-solutions manufacturer whose domestic manufacturing unit is located in Pithampur.',
    products: 'Submersible pumps, solar pumping systems, motors and industrial pumps.',
    website: 'https://www.shaktipumps.com/',
  },
  {
    name: 'Pratibha Syntex',
    mark: 'PRATIBHA',
    style: 'pratibha',
    industry: 'Textiles',
    description:
      'A vertically integrated textile manufacturer established in Pithampur.',
    products: 'Yarn, knitted fabrics, garments and textile products.',
    website: 'https://pratibhasyntex.com/',
  },
  {
    name: 'Ipca Laboratories',
    mark: 'IPCA',
    style: 'ipca',
    industry: 'Pharmaceuticals',
    description:
      'A pharmaceutical company with manufacturing facilities in the Pithampur industrial area.',
    products: 'Branded medicines, formulations and active pharmaceutical ingredients.',
    website: 'https://www.ipca.com/',
  },
  {
    name: 'Lupin',
    mark: 'LUPIN',
    style: 'lupin',
    industry: 'Pharmaceuticals',
    description:
      'A global pharmaceutical company with a manufacturing facility in Pithampur.',
    products: 'Generic and branded medicines, formulations and active ingredients.',
    website: 'https://www.lupin.com/',
  },
  {
    name: 'Cipla',
    mark: 'CIPLA',
    style: 'cipla',
    industry: 'Pharmaceuticals',
    description:
      'A global pharmaceutical company operating manufacturing units in the Pithampur SEZ.',
    products: 'Generic and specialty medicines, including respiratory treatments.',
    website: 'https://www.cipla.com/',
  },
  {
    name: 'Glenmark Pharmaceuticals',
    mark: 'GLENMARK',
    style: 'glenmark',
    industry: 'Pharmaceuticals',
    description:
      'A research-led pharmaceutical company with a manufacturing facility in Pithampur.',
    products: 'Generic medicines, formulations and active pharmaceutical ingredients.',
    website: 'https://glenmarkpharma.com/',
  },
  {
    name: 'Torrent Pharmaceuticals',
    mark: 'TORRENT',
    style: 'torrent',
    industry: 'Pharmaceuticals',
    description:
      'An Indian pharmaceutical company with manufacturing operations in the Pithampur region.',
    products: 'Branded formulations and medicines across multiple therapeutic areas.',
    website: 'https://www.torrentpharma.com/',
  },
  {
    name: 'Macleods Pharmaceuticals',
    mark: 'MACLEODS',
    style: 'macleods',
    industry: 'Pharmaceuticals',
    description:
      'A pharmaceutical manufacturer with a plant in the Pithampur industrial area.',
    products: 'Generic medicines, finished formulations and active ingredients.',
    website: 'https://www.macleodspharma.com/',
  },
  {
    name: 'Alkem Laboratories',
    mark: 'ALKEM',
    style: 'alkem',
    industry: 'Pharmaceuticals',
    description:
      'An Indian pharmaceutical company with manufacturing operations in Pithampur.',
    products: 'Branded and generic medicines, formulations and active ingredients.',
    website: 'https://www.alkemlabs.com/',
  },
  {
    name: 'ACG Associated Capsules',
    mark: 'ACG',
    style: 'acg',
    industry: 'Pharmaceutical manufacturing',
    description:
      'A pharmaceutical technology and manufacturing company with a Pithampur SEZ facility.',
    products: 'Hard capsules and pharmaceutical packaging solutions.',
    website: 'https://www.acg-world.com/',
  },
  {
    name: 'Piramal Pharma',
    mark: 'PIRAMAL',
    style: 'piramal',
    industry: 'Pharmaceuticals',
    description:
      'A global pharmaceutical company with a manufacturing facility in Pithampur.',
    products: 'Pharmaceutical ingredients, formulations and contract development and manufacturing.',
    website: 'https://www.piramalpharma.com/',
  },
]

const staffingSteps = [
  {
    number: '01',
    title: 'Understand the requirement',
    text: 'We learn about your roles, workforce size, skills, location and project timelines.',
  },
  {
    number: '02',
    title: 'Match the right people',
    text: 'Our team identifies suitable candidates based on the role and your operational needs.',
  },
  {
    number: '03',
    title: 'Support the workforce',
    text: 'We help coordinate onboarding, staffing and payroll support for your engagement.',
  },
]

const roleDetails = {
  'Manpower Supply': [
    'Assess required headcount, skills, shifts and deployment location',
    'Source suitable skilled and unskilled workers for each role',
    'Screen candidate experience, availability and documents',
    'Coordinate workforce deployment, attendance and replacement support',
  ],
  'Engineering Staffing': [
    'Confirm technical qualifications, discipline and project experience',
    'Source engineers and technicians matched to project requirements',
    'Screen technical skills, certifications and relevant experience',
    'Coordinate interviews, mobilization and site onboarding',
  ],
  'Pharma & Chemical Staffing': [
    'Identify role-specific GMP, laboratory, process and safety requirements',
    'Source qualified professionals for pharma and chemical operations',
    'Verify candidate qualifications, training and compliance documents',
    'Coordinate interviews, safety induction and site onboarding',
  ],
  'On-Roll Staffing': [
    'Role-specific requirement analysis',
    'Candidate sourcing and screening',
    'Joining and onboarding coordination',
    'Payroll and documentation support',
  ],
  'Senior HR': [
    'Recruitment planning and candidate screening',
    'Employee relations and grievance handling',
    'Performance review and appraisal coordination',
    'HR policy implementation and compliance',
  ],
  'HR Head': [
    'Overall HR strategy and workforce planning',
    'Leadership hiring and succession planning',
    'Payroll, statutory compliance and audit support',
    'Organization culture and policy development',
  ],
  'HR Manager': [
    'End-to-end recruitment and onboarding',
    'Attendance and payroll coordination',
    'Employee engagement and grievance support',
    'Joining documentation and HR records',
  ],
  'Plant Head': [
    'Complete plant operations and production planning',
    'Team leadership and daily shift management',
    'Cost control, safety and quality performance',
    'Coordination with engineering, HR and maintenance',
  ],
  'Production Head': [
    'Production schedule and capacity planning',
    'Monitoring targets, output and manpower',
    'Process improvement and waste reduction',
    'Coordination with quality and maintenance teams',
  ],
  'Quality Engineer': [
    'Incoming, in-process and final inspection',
    'Quality testing and measurement reporting',
    'Defect analysis and corrective action',
    'Calibration and quality documentation',
  ],
  'Quality Head': [
    'Quality management system implementation',
    'Internal and external quality audits',
    'Customer complaint and CAPA management',
    'Supplier quality and process improvement',
  ],
  'Account Manager': [
    'Client account and relationship management',
    'Billing, receivables and payment follow-up',
    'Sales target and commercial coordination',
    'Account reports and business growth support',
  ],
  'Accountant Manager': [
    'Accounting records and financial reporting',
    'GST, TDS and statutory compliance',
    'Ledger review and monthly reconciliation',
    'Budgeting, audit and expense control',
  ],
  'Purchase Head': [
    'Vendor development and purchase planning',
    'Rate negotiation and procurement approval',
    'Purchase orders and delivery coordination',
    'Cost reduction and supply chain management',
  ],
  'Company Secretary': [
    'Board meetings and statutory record management',
    'Company and ROC compliance filings',
    'Corporate governance and policy support',
    'Secretarial audit and shareholder coordination',
  ],
}

const galleryImages = [
  {
    src: 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?auto=format&fit=crop&w=900&q=80',
    alt: 'Automotive factory engineer working with industrial equipment',
    className: 'photo large',
  },
  {
    src: 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&w=900&q=80',
    alt: 'Technician inspecting a car in an automotive workshop',
    className: 'photo tall',
  },
  {
    src: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=900&q=80',
    alt: 'Modern automobile ready for delivery',
    className: 'photo tall',
  },
]

function ContactPage() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submissionStatus, setSubmissionStatus] = useState(null)
  const searchParams = new URLSearchParams(window.location.search)
  const availability = searchParams.get('availability')
  const position = searchParams.get('position') || ''
  const location = searchParams.get('location') || ''
  const isJobInquiry = availability === 'available' || availability === 'not-found'
  const domainOptions = [
    ...(isJobInquiry ? ['Job Availability Inquiry'] : []),
    ...services.map((service) => service.title),
  ]

  const handleSubmit = async (event) => {
    event.preventDefault()
    const form = event.currentTarget
    const formData = new FormData(form)
    const enteredDomain = String(formData.get('service') || '').trim()
    const matchingDomain = domainOptions.find(
      (domain) => domain.toLowerCase() === enteredDomain.toLowerCase(),
    )
    const hasSuggestedMatch = domainOptions.some((domain) =>
      domain.toLowerCase().includes(enteredDomain.toLowerCase()),
    )

    if (enteredDomain.toLowerCase() === 'other') {
      setSubmissionStatus({
        type: 'error',
        message: 'Type the unlisted domain in the Interested domain field.',
      })
      return
    }

    if (!matchingDomain && hasSuggestedMatch) {
      setSubmissionStatus({
        type: 'error',
        message: 'Please select a listed domain, or type one that is not listed.',
      })
      return
    }

    formData.set('service', matchingDomain || enteredDomain)
    setIsSubmitting(true)
    setSubmissionStatus(null)

    try {
      const response = await fetch('/api/inquiries', {
        method: 'POST',
        body: formData,
      })
      const result = await response.json()

      if (!response.ok) {
        setSubmissionStatus({ type: 'error', message: result.error })
        return
      }

      form.reset()
      setSubmissionStatus({
        type: 'success',
        message: 'Thanks for connecting with AEAMS.',
      })
    } catch (error) {
      console.error('Failed to save contact inquiry', error)
      setSubmissionStatus({
        type: 'error',
        message: 'We could not save your inquiry. Please try again later.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return addWordHoverTargets(
    <>
    <main className="contact-page">
      <div className="site-sticky-header">
        <header className="contact-page-header">
          <a className="brand-wrap contact-page-brand" href="/" aria-label="AEAMS home">
            <img
              className="brand-badge"
              src="/aeams-logo.png"
              alt="Ahirwar Engineering and Manpower Services logo"
            />
            <span className="contact-page-brand-name">AEAMS</span>
          </a>
          <a className="contact-page-home" href="/">
            Back to Home
          </a>
        </header>
      </div>
      <section className="contact-form-card" aria-labelledby="contact-form-title">
        <span className="section-eyebrow">GET IN TOUCH</span>
        <h1 id="contact-form-title">Tell us what you need</h1>
        <p className="contact-form-intro">
          {isJobInquiry
            ? 'Share your contact details and our team will follow up about this job search.'
            : 'Share your details and workforce requirements with the AEAMS team.'}
        </p>

        {availability === 'available' && (
          <div className="job-availability-notice available" role="status">
            <strong>Yes, this position is available!</strong>
            <span>{position} in {location}</span>
          </div>
        )}
        {availability === 'not-found' && (
          <div className="job-availability-notice unavailable" role="status">
            <strong>Sorry, this position is not currently listed for this location.</strong>
            <span>
              Please get in touch with us and check back for future opportunities.
            </span>
            <span>Search: {position} in {location}</span>
          </div>
        )}

        <form className="contact-form" onSubmit={handleSubmit}>
          <div className="contact-form-row">
            <label>
              Full name
              <input name="name" type="text" autoComplete="name" maxLength="120" required />
            </label>
            <label>
              Contact number
              <input name="phone" type="tel" autoComplete="tel" maxLength="24" required />
            </label>
          </div>
          <div className="contact-form-row">
            <label>
              Preferred location
              <input
                name="preferredLocation"
                type="text"
                autoComplete="address-level2"
                maxLength="120"
                placeholder="City or area"
                required
              />
            </label>
            <label>
              Email ID
              <input name="email" type="email" autoComplete="email" maxLength="254" required />
            </label>
          </div>
          <div className="contact-form-row">
            <label>
              Preferred profile
              <input
                name="preferredProfile"
                type="text"
                maxLength="120"
                placeholder="e.g. Quality Engineer"
                required
              />
            </label>
            <label>
              Current company name (optional)
              <input name="company" type="text" autoComplete="organization" maxLength="160" />
            </label>
          </div>
          <div className="contact-form-row">
            <label>
              Current salary (optional)
              <input
                name="currentSalary"
                type="text"
                maxLength="80"
                placeholder="e.g. ₹35,000 per month"
              />
            </label>
            <label>
              Notice period
              <input
                name="noticePeriod"
                type="text"
                maxLength="80"
                placeholder="e.g. Immediate or 30 days"
                required
              />
            </label>
          </div>
          <div className="contact-form-row">
            <label>
              Total experience (years)
              <input
                name="totalExperience"
                type="number"
                min="0"
                max="60"
                step="0.1"
                placeholder="Enter 0 if fresher"
                required
              />
            </label>
            <label>
              Expected salary
              <input
                name="expectedSalary"
                type="text"
                maxLength="80"
                placeholder="e.g. ₹45,000 per month"
                required
              />
            </label>
          </div>
          <div className="contact-form-row">
            <label>
              Current location
              <input
                name="currentLocation"
                type="text"
                autoComplete="address-level2"
                maxLength="120"
                required
              />
            </label>
            <label>
              Home town
              <input name="homeTown" type="text" maxLength="120" required />
            </label>
          </div>
          <label>
            Interested domain
            <input
              name="service"
              type="text"
              list="interested-domain-options"
              defaultValue={isJobInquiry ? 'Job Availability Inquiry' : ''}
              onChange={() => setSubmissionStatus(null)}
              placeholder="Search listed domains or type if not listed"
              autoComplete="off"
              maxLength="120"
              required
            />
            <datalist id="interested-domain-options">
              <option value="Other" />
              {domainOptions.map((domain) => (
                <option key={domain} value={domain} />
              ))}
            </datalist>
          </label>
          <label>
            Message
            <textarea
              name="message"
              rows="5"
              maxLength="10000"
              defaultValue={
                isJobInquiry
                  ? `I am interested in the ${position} position in ${location}.`
                  : ''
              }
              required
            />
          </label>
          <label>
            Resume (PDF, DOC, or DOCX, up to 4 MB)
            <input name="resume" type="file" accept=".pdf,.doc,.docx" required />
          </label>
          <button className="contact-form-submit" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Submitting…' : 'Submit'}
          </button>
          {submissionStatus && (
            <p
              className={`contact-form-note ${submissionStatus.type}`}
              role={submissionStatus.type === 'error' ? 'alert' : 'status'}
            >
              {submissionStatus.message}
            </p>
          )}
        </form>
      </section>
    </main>
    <SiteFooter />
    </>,
  )
}

function UrgentHiringPage() {
  const [openings, setOpenings] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [warnings, setWarnings] = useState([])
  const [now, setNow] = useState(null)

  useEffect(() => {
    let isMounted = true

    const loadOpenings = async () => {
      try {
        const response = await fetch('/api/urgent-hiring', { cache: 'no-store' })
        const result = await response.json()
        if (!response.ok) {
          throw new Error(
            result.error || `Urgent hiring request failed with status ${response.status}.`,
          )
        }
        if (isMounted) {
          setOpenings(result.openings)
          setWarnings(result.warnings || [])
          setLoadError('')
        }
      } catch (error) {
        if (isMounted) {
          setLoadError(error.message || 'We could not load urgent hiring openings.')
        }
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    loadOpenings()
    const refreshTimer = window.setInterval(loadOpenings, 5000)
    return () => {
      isMounted = false
      window.clearInterval(refreshTimer)
    }
  }, [])

  useEffect(() => {
    const updateCurrentTime = () => setNow(Date.now())
    updateCurrentTime()
    const expiryTimer = window.setInterval(updateCurrentTime, 1000)
    return () => window.clearInterval(expiryTimer)
  }, [])

  const visibleOpenings =
    now === null
      ? openings
      : openings.filter(
          (opening) => isUrgentHiringOpeningActive(opening, now),
        )

  return addWordHoverTargets(
    <>
    <main className="urgent-hiring-page">
      <div className="site-sticky-header">
        <header className="urgent-page-header">
          <a className="brand-wrap urgent-page-brand" href="/" aria-label="AEAMS home">
            <img
              className="brand-badge"
              src="/aeams-logo.png"
              alt="Ahirwar Engineering and Manpower Services logo"
            />
            <span className="urgent-page-brand-copy">
              <strong>AEAMS</strong>
              <small>Urgent Hiring</small>
            </span>
          </a>
          <a className="urgent-page-home" href="/">
            Back to Home
          </a>
        </header>
      </div>
      <section className="urgent-posters" aria-label="Urgent job openings">
        {isLoading && (
          <p className="urgent-hiring-status">Loading urgent openings…</p>
        )}
        {!isLoading && !loadError && warnings.map((warning) => (
          <p className="urgent-hiring-status urgent-hiring-error" key={warning} role="status">
            {warning}
          </p>
        ))}
        {!isLoading && loadError && (
          <p className="urgent-hiring-status urgent-hiring-error" role="alert">
            {loadError}
          </p>
        )}
        {!isLoading && !loadError && visibleOpenings.length === 0 && (
          <p className="urgent-hiring-status">No urgent hiring openings available right now.</p>
        )}
        {visibleOpenings.map((opening, index) => (
          <article
            className="hiring-poster"
            key={`${opening.position}-${opening.location}-${opening.postedAt}-${index}`}
          >
            <div
              className="hiring-poster-countdown"
              role="timer"
              aria-label={`Available for ${getPosterRemainingTime(opening, now)}`}
            >
              <span>Available for</span>
              <strong>{getPosterRemainingTime(opening, now)}</strong>
            </div>

            <header className="hiring-poster-brand">
              <img src="/aeams-logo.png" alt="AEAMS company logo" />
              <div>
                <strong>Ahirwar Engineering and Manpower Services</strong>
                <span>AEAMS | Your Trusted Manpower Partner</span>
              </div>
            </header>

            <div className="urgent-poster-banner">
              <span className="urgent-poster-megaphone" aria-hidden="true">📣</span>
              <div>
                <span>URGENT</span>
                <strong>REQUIREMENT</strong>
              </div>
            </div>

            <div className="urgent-poster-info-row">
              <div className="urgent-poster-qualification">
                <span className="urgent-poster-qualification-icon" aria-hidden="true">🧑‍🔬</span>
                <div>
                  <span>Qualification:</span>
                  <strong>{opening.qualification}</strong>
                </div>
              </div>
              <div className="urgent-poster-position">
                <span>Position:</span>
                <strong>{opening.position}</strong>
              </div>
            </div>

            <div className="urgent-poster-details">
              <div className="urgent-poster-detail">
                <span className="urgent-poster-detail-icon" aria-hidden="true">₹</span>
                <div>
                  <span>Salary:</span>
                  <strong>{opening.salary}</strong>
                </div>
              </div>
              <div className="urgent-poster-detail">
                <span className="urgent-poster-detail-icon" aria-hidden="true">💼</span>
                <div>
                  <span>Experience:</span>
                  <strong>{opening.experience}</strong>
                </div>
              </div>
              <div className="urgent-poster-detail">
                <span className="urgent-poster-detail-icon" aria-hidden="true">🚌</span>
                <div>
                  <span>Facility:</span>
                  <strong>{opening.facility}</strong>
                </div>
              </div>
            </div>

            <footer className="urgent-poster-footer">
              <div className="urgent-poster-contact">
                <span className="urgent-poster-contact-icon" aria-hidden="true">☎</span>
                <div>
                  <span >Get In Touch :</span>
                  <strong>{opening.contact1 || 'AEAMS'}</strong>
                  {opening.contact2 && <strong>{opening.contact2}</strong>}
                </div>
              </div>
              <a className="urgent-poster-apply" href="/contact">
                <strong>Apply Now</strong>
                <span>Be a Part of Our Growing Team</span>
              </a>
            </footer>
            <div className="urgent-poster-tagline">
              Professional Recruitment <span>|</span> Better Career Opportunities <span>|</span> Stable Work Environment
            </div>
          </article>
        ))}
      </section>
    </main>
    <SiteFooter />
    </>,
  )
}

function getPosterRemainingTime(opening, now) {
  if (now === null) return '--:--:--'

  const expiresAt = Date.parse(opening.postedAt) + URGENT_HIRING_LIFETIME_MS
  const totalSeconds = Math.max(0, Math.floor((expiresAt - now) / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  return [hours, minutes, seconds]
    .map((value) => String(value).padStart(2, '0'))
    .join(':')
}

function SiteFooter() {
  return addWordHoverTargets(
    <footer className="site-footer">
      <section className="site-footer-contact-panel" aria-label="Contact AEAMS">
        <a className="site-footer-contact-item" href="tel:+916263152308">
          <svg className="site-footer-contact-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M7 3.5 4.5 5c-.9.6-.8 2.4.2 4.5 1.8 3.8 5 7 8.8 8.8 2.1 1 3.9 1.1 4.5.2l1.5-2.5-4.1-2-1.6 1.7a14.5 14.5 0 0 1-5.5-5.5L10 8.6 8 4.5 7 3.5Z"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.8"
            />
          </svg>
          <span className="site-footer-contact-copy">
            <strong>Maneesh Ahirwar</strong>
            <span>6263152308</span>
          </span>
        </a>
        <a className="site-footer-contact-item" href="tel:+917470681764">
          <svg className="site-footer-contact-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M7 3.5 4.5 5c-.9.6-.8 2.4.2 4.5 1.8 3.8 5 7 8.8 8.8 2.1 1 3.9 1.1 4.5.2l1.5-2.5-4.1-2-1.6 1.7a14.5 14.5 0 0 1-5.5-5.5L10 8.6 8 4.5 7 3.5Z"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.8"
            />
          </svg>
          <span className="site-footer-contact-copy">
            <strong>Laxmikant Ahirwar</strong>
            <span>7470681764</span>
          </span>
        </a>
        <a
          className="site-footer-contact-item site-footer-contact-email"
          href="mailto:info.ahirwarengineering@gmail.com"
        >
          <svg className="site-footer-contact-icon" viewBox="0 0 24 24" aria-hidden="true">
            <rect
              x="3"
              y="5"
              width="18"
              height="14"
              rx="1.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            />
            <path
              d="m4 7 8 6 8-6"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.8"
            />
          </svg>
          <span className="site-footer-contact-copy">
            <strong>Email Us</strong>
            <span>info.ahirwarengineering@gmail.com</span>
          </span>
        </a>
        <div className="site-footer-contact-item site-footer-contact-address">
          <svg className="site-footer-contact-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.8"
            />
            <circle cx="12" cy="10" r="2.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
          </svg>
          <span className="site-footer-contact-copy">
            <strong>Office Address</strong>
            <span>Chhatra Chhaya Gate, Near Dental Clinic, Pithampur, Indore, Madhya Pradesh</span>
          </span>
        </div>
        <a className="site-footer-apply" href="/contact">
          <strong>Apply Now</strong>
          <span>and Be a Part of Our Team!</span>
        </a>
      </section>
      <strong className="site-footer-heading">Connect with AEAMS</strong>
      <nav className="site-footer-social-links" aria-label="AEAMS contact and social links">
        <a
          className="site-footer-social-link"
          href="https://whatsapp.com/channel/0029VbDeL6nAe5Vr2Dizu629"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="AEAMS WhatsApp Channel"
          title="WhatsApp Channel"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <circle cx="12" cy="12" r="11" fill="#25D366" />
            <path
              d="M6.2 18.1 4.8 20l2.7-.8A8 8 0 1 0 6.2 18.1Z"
              fill="none"
              stroke="#fff"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
            />
            <path
              d="M8.2 7.5c-.3 0-.7.1-.9.5-.3.4-1 1-1 2.3 0 1.4 1 2.7 1.1 2.9.2.2 1.9 3 4.7 4.1 2.3.9 2.8.7 3.3.6.5-.1 1.6-.7 1.8-1.3.2-.6.2-1.1.1-1.2-.1-.1-.3-.2-.7-.4l-1.7-.8c-.3-.1-.5-.2-.7.2-.2.3-.7.9-.9 1.1-.2.2-.3.2-.6.1-.3-.1-1.2-.4-2.2-1.3-.8-.7-1.3-1.6-1.5-1.9-.2-.3 0-.4.1-.6.1-.1.3-.3.4-.5.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5-.1-.1-.6-1.5-.9-2-.2-.5-.4-.5-.7-.5h-.6Z"
              fill="#fff"
            />
          </svg>
          <span>WhatsApp</span>
        </a>
        <a
          className="site-footer-social-link"
          href="https://www.instagram.com/aeams2026?evlk=YzJsbmhkNHI1d3B2"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="AEAMS Instagram"
          title="Instagram"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <rect
              x="2.5"
              y="2.5"
              width="19"
              height="19"
              rx="5.5"
              fill="none"
              stroke="#C13584"
              strokeWidth="2"
            />
            <circle
              cx="12"
              cy="12"
              r="4.25"
              fill="none"
              stroke="#C13584"
              strokeWidth="2"
            />
            <circle cx="17.8" cy="6.4" r="1.2" fill="#C13584" />
          </svg>
          <span>Instagram</span>
        </a>
        <a
          className="site-footer-social-link"
          href="https://www.linkedin.com/in/maneesh-ahirwar-099177186?utm_source=share_via&utm_content=profile&utm_medium=member_android"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="AEAMS LinkedIn"
          title="LinkedIn"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <rect x="1.5" y="1.5" width="21" height="21" rx="4" fill="#0A66C2" />
            <path
              d="M7.3 9.2H4.7v8.1h2.6V9.2ZM6 5.2a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Zm11 3.8c-1.3 0-2.2.7-2.6 1.3V9.2h-2.5v8.1h2.6v-4c0-1 .2-2 1.5-2s1.3 1.2 1.3 2.1v3.9h2.6v-4.4c0-2.2-.5-3.9-2.9-3.9Z"
              fill="#fff"
            />
          </svg>
          <span>LinkedIn</span>
        </a>
        <a
          className="site-footer-social-link"
          href="https://www.google.com/maps/search/?api=1&query=Chhatra+Chhaya+Gate%2C+Near+Dental+Clinic%2C+Pithampur%2C+Indore%2C+Madhya+Pradesh"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="AEAMS office location"
          title="Location"
        >
          <svg className="site-footer-info-icon" viewBox="0 0 32 32" aria-hidden="true" focusable="false">
            <path
              d="M16 29S6 19.8 6 11.6a10 10 0 1 1 20 0C26 19.8 16 29 16 29Z"
              fill="#ff8c32"
            />
            <circle cx="16" cy="11.5" r="4.2" fill="#fff" />
            <circle cx="16" cy="11.5" r="1.8" fill="#17384c" />
          </svg>
          <span>Location</span>
        </a>
        <a
          className="site-footer-social-link"
          href="mailto:info.ahirwarengineering@gmail.com"
          aria-label="Email AEAMS"
          title="Email"
        >
          <svg className="site-footer-info-icon" viewBox="0 0 32 32" aria-hidden="true" focusable="false">
            <rect
              x="2"
              y="4"
              width="28"
              height="24"
              rx="5"
              fill="#17384c"
            />
            <path
              d="m5 9 11 8 11-8M5 24l8-7m14 7-8-7"
              fill="none"
              stroke="#fff"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.2"
            />
          </svg>
          <span>Email</span>
        </a>
        <a
          className="site-footer-social-link"
          href="tel:+916263152308"
          aria-label="Call AEAMS"
          title="Contact"
        >
          <svg className="site-footer-info-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <circle cx="12" cy="12" r="11" fill="#ff8c32" />
            <path
              d="M21.5 16.6v3a2 2 0 0 1-2.2 2 19.6 19.6 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.6 19.6 0 0 1 1.6 4a2 2 0 0 1 2-2.2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L7.5 9.7a16 16 0 0 0 6.8 6.8l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z"
              fill="none"
              stroke="#fff"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.8"
            />
          </svg>
          <span>Contact</span>
        </a>
      </nav>
      <p className="site-footer-copyright">
        © 2024 AEAMS - Ahirwar Engineering and Manpower Services | Indore, Madhya Pradesh | All Rights Reserved
      </p>
    </footer>,
  )
}

function App() {
  const [selectedRole, setSelectedRole] = useState(null)
  const [selectedCompany, setSelectedCompany] = useState(null)
  const [isUrgentHiringPopupOpen, setIsUrgentHiringPopupOpen] = useState(false)
  const [isSearchingJobs, setIsSearchingJobs] = useState(false)
  const [jobSearchResult, setJobSearchResult] = useState(null)
  const [activeNavSection, setActiveNavSection] = useState(() => {
    const section = window.location.hash.slice(1)
    return navigationSectionIds.includes(section) ? section : 'home'
  })

  useEffect(() => {
    const syncActiveNavSection = () => {
      const section = window.location.hash.slice(1)
      setActiveNavSection(
        navigationSectionIds.includes(section) ? section : 'home',
      )
    }

    window.addEventListener('hashchange', syncActiveNavSection)
    return () => window.removeEventListener('hashchange', syncActiveNavSection)
  }, [])

  useEffect(() => {
    const revealSelector = [
      '.aeams-page main section',
      '.service-card',
      '.company-logo-card',
      '.industry-item',
      '.process-card',
      '.contact-form-card',
      '.urgent-posters',
      '.hiring-poster',
      '.site-footer',
    ].join(', ')
    const reduceMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches
    const revealObserver =
      'IntersectionObserver' in window
        ? new IntersectionObserver(
            (entries) => {
              entries.forEach((entry) => {
                if (entry.isIntersecting) {
                  entry.target.classList.add('is-visible')
                  revealObserver.unobserve(entry.target)
                }
              })
            },
            { threshold: 0.14, rootMargin: '0px 0px -7% 0px' },
          )
        : null

    const prepareRevealTarget = (element) => {
      if (!element.classList.contains('scroll-reveal')) {
        element.classList.add('scroll-reveal')
        const siblingIndex = Array.prototype.indexOf.call(
          element.parentElement?.children || [],
          element,
        )
        element.style.setProperty(
          '--reveal-delay',
          `${Math.min(Math.max(siblingIndex, 0), 4) * 70}ms`,
        )
      }

      if (element.classList.contains('is-visible')) return

      if (reduceMotion || !revealObserver) {
        element.classList.add('is-visible')
      } else {
        revealObserver.observe(element)
      }
    }

    const prepareRevealTargets = (root) => {
      if (root instanceof Element && root.matches(revealSelector)) {
        prepareRevealTarget(root)
      }
      root.querySelectorAll?.(revealSelector).forEach(prepareRevealTarget)
    }

    prepareRevealTargets(document)
    const mutationObserver = new MutationObserver((records) => {
      records.forEach((record) => {
        record.addedNodes.forEach((node) => {
          if (node instanceof Element) prepareRevealTargets(node)
        })
      })
    })
    mutationObserver.observe(document.body, { childList: true, subtree: true })

    const sections = navigationSectionIds
      .map((id) => document.getElementById(id))
      .filter(Boolean)
    const activeSectionObserver =
      'IntersectionObserver' in window
        ? new IntersectionObserver(
            (entries) => {
              const activeEntry = entries.find((entry) => entry.isIntersecting)
              if (!activeEntry) return
              setActiveNavSection((current) =>
                current === activeEntry.target.id
                  ? current
                  : activeEntry.target.id,
              )
            },
            { rootMargin: '-25% 0px -60% 0px', threshold: 0 },
          )
        : null

    sections.forEach((section) => activeSectionObserver?.observe(section))

    let frameId = 0
    const updateScrollEffects = () => {
      if (frameId) return
      frameId = window.requestAnimationFrame(() => {
        const scrollRange =
          document.documentElement.scrollHeight - window.innerHeight
        const progress =
          scrollRange > 0 ? (window.scrollY / scrollRange) * 100 : 0
        document.documentElement.style.setProperty(
          '--aeams-scroll-progress',
          `${progress}%`,
        )
        const parallaxOffset = reduceMotion
          ? 0
          : Math.min(window.scrollY, 600) * -0.035
        document.documentElement.style.setProperty(
          '--aeams-hero-parallax',
          `${parallaxOffset}px`,
        )
        frameId = 0
      })
    }

    window.addEventListener('scroll', updateScrollEffects, { passive: true })
    window.addEventListener('resize', updateScrollEffects)
    updateScrollEffects()

    return () => {
      mutationObserver.disconnect()
      revealObserver?.disconnect()
      activeSectionObserver?.disconnect()
      window.removeEventListener('scroll', updateScrollEffects)
      window.removeEventListener('resize', updateScrollEffects)
      window.cancelAnimationFrame(frameId)
      document.documentElement.style.removeProperty('--aeams-scroll-progress')
      document.documentElement.style.removeProperty('--aeams-hero-parallax')
    }
  }, [])

  const handleJobSearch = async (event) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const positionQuery = String(formData.get('position') || '').trim()
    const locationQuery = String(formData.get('location') || '').trim()
    setIsSearchingJobs(true)
    setJobSearchResult(null)

    try {
      const response = await fetch('/api/openings', { cache: 'no-store' })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error)

      const normalize = (value) => String(value || '').trim().toLocaleLowerCase()
      const normalizedPosition = normalize(positionQuery)
      const normalizedLocation = normalize(locationQuery)
      const opening = result.openings.find(
        (item) =>
          normalize(item.position).includes(normalizedPosition) &&
          normalize(item.location).includes(normalizedLocation),
      )

      if (opening) {
        const params = new URLSearchParams({
          availability: 'available',
          position: opening.position,
          location: opening.location,
        })
        window.location.assign(`/contact?${params.toString()}`)
      } else {
        setJobSearchResult({
          type: 'not-found',
          position: positionQuery,
          location: locationQuery,
        })
      }
    } catch (error) {
      console.error('Failed to check job availability', error)
      setJobSearchResult({
        type: 'error',
        message: error.message || 'We could not check job availability. Please try again.',
      })
    } finally {
      setIsSearchingJobs(false)
    }
  }

  useEffect(() => {
    if (!selectedRole && !selectedCompany) return undefined

    const closeOnEscape = (event) => {
      if (event.key === 'Escape') {
        setSelectedRole(null)
        setSelectedCompany(null)
      }
    }

    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', closeOnEscape)

    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [selectedRole, selectedCompany])

  useEffect(() => {
    const navigation = window.performance.getEntriesByType('navigation')[0]
    const isExternalEntry =
      navigation?.type === 'navigate' &&
      (!document.referrer ||
        new URL(document.referrer).origin !== window.location.origin)

    if (navigation?.type === 'reload' || isExternalEntry) {
      resetUrgentHiringPopupSuppression()
    }

    if (window.location.pathname === '/urgent-hiring') {
      suppressUrgentHiringPopup()
      return undefined
    }

    if (
      window.location.pathname !== '/' ||
      isUrgentHiringPopupSuppressed()
    ) {
      return undefined
    }

    let isMounted = true
    const checkUrgentHiringOpenings = async () => {
      try {
        const response = await fetch('/api/urgent-hiring', { cache: 'no-store' })
        const result = await response.json()
        if (!response.ok) {
          throw new Error(
            result.error || `Urgent hiring request failed with status ${response.status}.`,
          )
        }
        if (!Array.isArray(result.openings)) {
          throw new Error('Urgent hiring response did not contain an openings list.')
        }

        const hasActiveOpening = result.openings.some((opening) =>
          isUrgentHiringOpeningActive(opening, Date.now()),
        )
        if (
          isMounted &&
          hasActiveOpening &&
          !isUrgentHiringPopupSuppressed()
        ) {
          setIsUrgentHiringPopupOpen(true)
        }
      } catch (error) {
        if (isMounted) {
          console.error('Failed to check urgent hiring openings for popup', error)
        }
      }
    }

    checkUrgentHiringOpenings()

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    if (!isUrgentHiringPopupOpen || window.location.pathname !== '/') return undefined

    const closeOnEscape = (event) => {
      if (event.key === 'Escape') {
        suppressUrgentHiringPopup()
        setIsUrgentHiringPopupOpen(false)
      }
    }

    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', closeOnEscape)

    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [isUrgentHiringPopupOpen])

  if (window.location.pathname === '/contact') {
    return <ContactPage />
  }

  if (window.location.pathname === '/urgent-hiring') {
    return <UrgentHiringPage />
  }

  return addWordHoverTargets(
    <div className="aeams-page">
      <div className="laptop-shell">
        <div className="site-sticky-header">
          <header className="top-header">
            <div className="brand-wrap">
              <a className="brand-logo-link" href="/" aria-label="AEAMS home">
                <img
                  className="brand-badge"
                  src="/aeams-logo.png"
                  alt="Ahirwar Engineering and Manpower Services logo"
                />
              </a>
              <div className="brand-copy">
                <h1>AEAMS</h1>
                <span>Ahirwar Engineering and Manpower Services</span>
              </div>
            </div>

            <nav className="main-nav" aria-label="Main navigation">
              <a
                href="#home"
                aria-current={activeNavSection === 'home' ? 'location' : undefined}
                onClick={() => setActiveNavSection('home')}
              >
                Home
              </a>
              <a
                href="#about"
                aria-current={activeNavSection === 'about' ? 'location' : undefined}
                onClick={() => setActiveNavSection('about')}
              >
                About
              </a>
              <a
                href="#services"
                aria-current={activeNavSection === 'services' ? 'location' : undefined}
                onClick={() => setActiveNavSection('services')}
              >
                Services
              </a>
            </nav>

            <a className="contact-button" href="/contact">
              Get in Touch
            </a>
          </header>
          <UrgentHiringMarqueeButton />
        </div>

        <main className="content-wrap">
          <section className="hero-section" id="home">
            <div className="hero-copy">
              <h2>
                Your Trusted
                <br />
                Manpower Partner
              </h2>

              <p className="hero-tagline">
                Find the <strong>right job</strong>, build your <strong>skills</strong>
                <span>and take the next step toward a <strong>better future</strong></span>
              </p>

              <form className="job-search" onSubmit={handleJobSearch}>
                <label className="job-search-field">
                  <span aria-hidden="true">🔎</span>
                  <input
                    type="text"
                    name="position"
                    placeholder="Available Positions"
                    aria-label="Available positions"
                    required
                    onChange={() => setJobSearchResult(null)}
                  />
                </label>
                <label className="job-search-field">
                  <span aria-hidden="true">📍</span>
                  <input
                    type="text"
                    name="location"
                    placeholder="Location"
                    aria-label="Job location"
                    required
                    onChange={() => setJobSearchResult(null)}
                  />
                </label>
                <button className="job-search-button" type="submit" disabled={isSearchingJobs}>
                  {isSearchingJobs ? 'Checking…' : 'Search Jobs'}
                </button>
              </form>

              {jobSearchResult?.type === 'not-found' && (
                <div className="job-search-result unavailable" role="status">
                  <p>
                    Sorry, <strong>{jobSearchResult.position}</strong> is not currently
                    available in <strong>{jobSearchResult.location}</strong>. Please get in
                    touch with us and check back for future opportunities.
                  </p>
                  <a
                    href={`/contact?availability=not-found&position=${encodeURIComponent(jobSearchResult.position)}&location=${encodeURIComponent(jobSearchResult.location)}`}
                  >
                    Get in Touch
                  </a>
                </div>
              )}
              {jobSearchResult?.type === 'error' && (
                <div className="job-search-result unavailable" role="alert">
                  <p>{jobSearchResult.message}</p>
                  <a href="/contact">Get in Touch</a>
                </div>
              )}

              <div className="trust-row" aria-label="Company trust indicators">
                <span>✓ ISO Certified</span>
                <span>✓ 500+ Clients Across India</span>
                <span>✓ 10+ Years Experience</span>
                <span>✓ 100% Verified Candidates</span>
                <span>✓ Quick Joining Support</span>
                <span>✓ On-Roll Jobs Available</span>
                <span>✓ Career Growth Opportunities</span>
              </div>
            </div>

            <div className="hero-gallery" aria-label="Automotive manufacturing and vehicle gallery">
              {galleryImages.map((image) => (
                <img key={image.src} src={image.src} alt={image.alt} className={image.className} />
              ))}
            </div>
          </section>

          <section className="companies-section" aria-labelledby="companies-title">
            <div className="section-heading">
              <span className="section-eyebrow">PITHAMPUR INDUSTRIAL HUB</span>
              <h3 id="companies-title">Companies in Pithampur</h3>
              <p className="section-subtitle">
                Explore 15 prominent companies and their products. This list is
                not an official ranking; click a company to view details.
              </p>
            </div>
            <div className="company-logo-grid">
              {pithampurCompanies.map((company) => (
                <button
                  className="company-logo-card"
                  key={company.name}
                  type="button"
                  aria-haspopup="dialog"
                  aria-label={`View details for ${company.name}`}
                  onClick={() => setSelectedCompany(company)}
                >
                  <div
                    className={`company-logo-mark ${company.style}`}
                    aria-hidden="true"
                  >
                    {company.mark}
                  </div>
                  <h4>{company.name}</h4>
                  <span className="company-card-industry">{company.industry}</span>
                  <span className="company-card-action">View details</span>
                </button>
              ))}
            </div>
          </section>

          <section className="services-section" id="services">
            <h3>Our Core Services</h3>
            <p className="section-subtitle">
              Comprehensive manpower solutions tailored to industry needs
            </p>

            <div className="services-grid">
              {services.map((service) => (
                <button
                  key={service.title}
                  type="button"
                  className="service-card"
                  onClick={() => setSelectedRole(service)}
                >
                  <div className="service-icon" aria-hidden="true">
                    {service.icon}
                  </div>
                  <h4>{service.title}</h4>
                  <p>{service.text}</p>
                  {roleDetails[service.title] && (
                    <span className="service-view-details">View role details →</span>
                  )}
                </button>
              ))}
            </div>
          </section>

          <section className="about-section" id="about">
            <div className="about-copy">
              <span className="section-eyebrow">ABOUT AEAMS</span>
              <h3>People and engineering support for growing businesses</h3>
              <p>
                <strong>AEAMS</strong> (Ahirwar Engineering and Manpower Services)
                is a people and workforce solutions company based in Indore,
                Madhya Pradesh. We connect skilled, semi-skilled and management
                professionals with growing manufacturing, engineering, pharma,
                infrastructure and corporate organizations.
              </p>
              <p>
                We understand each company’s role requirements, then source,
                screen, verify and coordinate suitable candidates for interviews
                and joining. Our support can include contract staffing,
                project-based manpower and on-roll payroll solutions.
              </p>
              <p>
                <strong>Our motive:</strong> create reliable employment
                opportunities, help businesses find the right talent faster,
                and build long-term partnerships based on trust, transparency
                and responsible workforce support.
              </p>
              <a className="text-link" href="/contact">
                Discuss your requirement <span aria-hidden="true">→</span>
              </a>
            </div>
            <div className="about-highlight">
              <img
                className="highlight-logo"
                src="/aeams-logo.png"
                alt="AEAMS logo"
              />
              <h4>How AEAMS works</h4>
              <ul>
                <li><strong>Understand:</strong> Roles, skills, location and joining needs</li>
                <li><strong>Source:</strong> Suitable candidates from our hiring network</li>
                <li><strong>Verify:</strong> Profiles and documentation before shortlisting</li>
                <li><strong>Coordinate:</strong> Interviews, joining and workforce support</li>
              </ul>
            </div>
          </section>

          <section className="industries-section" aria-labelledby="industries-title">
            <div className="section-heading">
              <span className="section-eyebrow">WHERE WE WORK</span>
              <h3 id="industries-title">Industries we support</h3>
              <p className="section-subtitle">
                Workforce solutions shaped around the people and skills each
                operation needs.
              </p>
            </div>
            <div className="industry-list">
              {industries.map((industry) => (
                <div className="industry-item" key={industry}>
                  <span aria-hidden="true">✓</span>
                  {industry}
                </div>
              ))}
            </div>
          </section>

          <section className="process-section" aria-labelledby="process-title">
            <div className="section-heading">
              <span className="section-eyebrow">HOW WE WORK</span>
              <h3 id="process-title">A clear path from requirement to workforce</h3>
              <p className="section-subtitle">
                We keep the process focused on your roles, timelines and
                workplace needs.
              </p>
            </div>
            <div className="process-grid">
              {staffingSteps.map((step) => (
                <article className="process-card" key={step.number}>
                  <span className="process-number">{step.number}</span>
                  <h4>{step.title}</h4>
                  <p>{step.text}</p>
                </article>
              ))}
            </div>
          </section>
        </main>

        {selectedCompany && (
          <div
            className="role-modal-backdrop"
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setSelectedCompany(null)
            }}
          >
            <section
              className="role-modal company-details-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="company-details-title"
            >
              <button
                className="role-modal-close"
                type="button"
                aria-label="Close company details"
                onClick={() => setSelectedCompany(null)}
              >
                ×
              </button>
              <div className="role-modal-icon company-details-mark" aria-hidden="true">
                {selectedCompany.mark}
              </div>
              <span className="section-eyebrow">{selectedCompany.industry}</span>
              <h3 id="company-details-title">{selectedCompany.name}</h3>
              <p className="role-modal-summary">{selectedCompany.description}</p>
              <h4>Products and focus</h4>
              <p className="role-modal-summary">{selectedCompany.products}</p>
              <p className="company-details-location">
                Manufacturing presence in Pithampur, Madhya Pradesh
              </p>
              <a
                className="role-modal-contact"
                href={selectedCompany.website}
                target="_blank"
                rel="noopener noreferrer"
              >
                Visit company website
              </a>
            </section>
          </div>
        )}

        {selectedRole && (
          <div
            className="role-modal-backdrop"
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setSelectedRole(null)
            }}
          >
            <section
              className="role-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="role-modal-title"
            >
              <button
                className="role-modal-close"
                type="button"
                aria-label="Close role details"
                onClick={() => setSelectedRole(null)}
              >
                ×
              </button>

              <div className="role-modal-icon" aria-hidden="true">
                {selectedRole.icon}
              </div>
              <span className="section-eyebrow">ROLE DETAILS</span>
              <h3 id="role-modal-title">{selectedRole.title}</h3>
              <p className="role-modal-summary">{selectedRole.text}</p>

              <h4>Key responsibilities</h4>
              <ul className="role-responsibilities">
                {roleDetails[selectedRole.title].map((responsibility) => (
                  <li key={responsibility}>
                    <span aria-hidden="true">✓</span>
                    {responsibility}
                  </li>
                ))}
              </ul>

              <a className="role-modal-contact" href="/contact" onClick={() => setSelectedRole(null)}>
                Apply for this role
              </a>
            </section>
          </div>
        )}

        {window.location.pathname === '/' && isUrgentHiringPopupOpen && (
          <div
            className="role-modal-backdrop urgent-hiring-popup-backdrop"
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                suppressUrgentHiringPopup()
                setIsUrgentHiringPopupOpen(false)
              }
            }}
          >
            <section
              className="role-modal urgent-hiring-popup"
              role="dialog"
              aria-modal="true"
              aria-labelledby="urgent-hiring-popup-title"
              aria-describedby="urgent-hiring-popup-subtitle"
            >
              <button
                className="role-modal-close"
                type="button"
                aria-label="Close urgent hiring popup"
                onClick={() => {
                  suppressUrgentHiringPopup()
                  setIsUrgentHiringPopupOpen(false)
                }}
              >
                ×
              </button>
              <div className="urgent-hiring-popup-board">
                <header className="urgent-hiring-popup-brand">
                  <img
                    src="/aeams-logo.png"
                    alt="Ahirwar Engineering and Manpower Services logo"
                  />
                  <div>
                    <strong>AEAMS</strong>
                    <span>Ahirwar Engineering and Manpower Services</span>
                  </div>
                </header>
                <h3 id="urgent-hiring-popup-title">URGENT HIRING</h3>
                <p id="urgent-hiring-popup-subtitle">
                  NOW HIRING — APPLY TODAY!
                </p>
              </div>
              <div className="urgent-hiring-popup-actions">
                <a
                  className="role-modal-contact"
                  href="/urgent-hiring"
                  onClick={suppressUrgentHiringPopup}
                >
                  View Openings
                </a>
                <button
                  className="urgent-hiring-popup-dismiss"
                  type="button"
                  onClick={() => {
                    suppressUrgentHiringPopup()
                    setIsUrgentHiringPopupOpen(false)
                  }}
                >
                  Maybe later
                </button>
              </div>
            </section>
          </div>
        )}

        <SiteFooter />
      </div>
    </div>,
  )
}

export default App
