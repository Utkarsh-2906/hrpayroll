import { useState } from 'react'
import {
  Upload,
  Download,
  FileText,
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
  Calendar,
  CalendarOff,
  CalendarDays,
  PartyPopper,
  Users,
  UserCheck,
  UserX,
} from 'lucide-react'
import { parseEmployeeFile, buildMusterRollData, WEEKDAY_NAMES } from '../utils/musterRoll'
import { generateMusterRollWorkbook, downloadMusterRollWorkbook } from '../utils/generateWorkbook'
import { generateMusterRollPdf, downloadMusterRollPdf } from '../utils/generatePdf'

const DAY_STATUS_META = {
  P: { className: 'day-badge-present', label: 'P' },
  A: { className: 'day-badge-absent', label: 'A' },
  W: { className: 'day-badge-weekoff', label: 'W' },
  H: { className: 'day-badge-holiday', label: 'H' },
  HF: { className: 'day-badge-half', label: '½' },
  NJ: { className: 'day-badge-notjoined', label: '-' },
}

function monthLabelFromInput(value) {
  const [year, month] = value.split('-').map(Number)
  const date = new Date(year, month - 1, 1)
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

function MusterRoll() {
  const [file, setFile] = useState(null)
  const [salaryMonth, setSalaryMonth] = useState('')
  const [weekOffWeekday, setWeekOffWeekday] = useState(0)
  const [holidayInput, setHolidayInput] = useState('')
  const [errors, setErrors] = useState([])
  const [warnings, setWarnings] = useState([])
  const [result, setResult] = useState(null)
  const [workbookBlob, setWorkbookBlob] = useState(null)
  const [pdfBlob, setPdfBlob] = useState(null)
  const [isGenerating, setIsGenerating] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setErrors([])
    setWarnings([])
    setResult(null)
    setWorkbookBlob(null)
    setPdfBlob(null)

    if (!file) {
      setErrors(['Please upload an employee attendance Excel file.'])
      return
    }
    if (!salaryMonth) {
      setErrors(['Please select the salary month.'])
      return
    }

    setIsGenerating(true)
    try {
      const { employees, errors: parseErrors } = await parseEmployeeFile(file)
      if (parseErrors.length > 0) {
        setErrors(parseErrors)
        return
      }

      const [year, month] = salaryMonth.split('-').map(Number)
      const salaryMonthLabel = monthLabelFromInput(salaryMonth)

      const musterData = buildMusterRollData({
        employees,
        year,
        month: month - 1,
        weekOffWeekday: Number(weekOffWeekday),
        holidayInput,
        salaryMonthLabel,
      })

      const blob = await generateMusterRollWorkbook(musterData)
      const pdf = generateMusterRollPdf(musterData)

      setResult(musterData)
      setWorkbookBlob({ blob, label: salaryMonthLabel })
      setPdfBlob({ blob: pdf, label: salaryMonthLabel })
      setWarnings(musterData.warnings)
    } catch (error) {
      setErrors([`Something went wrong while generating the muster roll: ${error.message}`])
    } finally {
      setIsGenerating(false)
    }
  }

  const handleDownload = () => {
    if (!workbookBlob) return
    downloadMusterRollWorkbook(workbookBlob.blob, workbookBlob.label)
  }

  const handleDownloadPdf = () => {
    if (!pdfBlob) return
    downloadMusterRollPdf(pdfBlob.blob, pdfBlob.label)
  }

  const totalPresentDays = result
    ? result.rows.reduce((sum, row) => sum + row.total, 0)
    : 0
  const totalAbsentDays = result
    ? result.rows.reduce(
        (sum, row) => sum + row.dayStatus.filter((status) => status === 'A').length,
        0
      )
    : 0

  return (
    <section className="muster-roll-section general-padding">
      <div className="section-inner container-fluid m-auto">

        <form className="form-card" onSubmit={handleSubmit}>
          <div className="form-card-header">
            <span className="form-card-icon">
              <FileSpreadsheet size={20} aria-hidden="true" />
            </span>
            <div className="title title-black">
              <h2>Upload &amp; configure</h2>
            </div>
          </div>

          <div className="form-grid">
            <div className="field-group field-group-wide">
              <label className="field-label" htmlFor="attendance-file">
                <FileSpreadsheet size={14} aria-hidden="true" className="field-label-icon" />
                Employee attendance file (.xlsx)
              </label>
              <label className="dropzone" htmlFor="attendance-file">
                <span className="dropzone-icon">
                  <Upload size={20} aria-hidden="true" />
                </span>
                {file ? (
                  <span className="dropzone-title">
                    <span className="dropzone-title-accent">{file.name}</span>
                  </span>
                ) : (
                  <span className="dropzone-title">
                    Click to upload <span className="dropzone-title-accent">or drag and drop</span>
                  </span>
                )}
                <span className="dropzone-hint">
                  Columns expected: Employee Name, Present Days (Absent Days is auto-calculated),
                  Joining Date (optional, DD-MM-YYYY), Holiday (optional, Yes/No — &ldquo;No&rdquo; applies holiday penalty on surrounding days)
                </span>
                {file && (
                  <span className="dropzone-filename">
                    <CheckCircle2 size={14} aria-hidden="true" />
                    File selected
                  </span>
                )}
                <input
                  id="attendance-file"
                  type="file"
                  accept=".xlsx,.xls"
                  className="dropzone-input"
                  onChange={(event) => setFile(event.target.files[0] ?? null)}
                />
              </label>
            </div>

            <div className="field-group">
              <label className="field-label" htmlFor="salary-month">
                <Calendar size={14} aria-hidden="true" className="field-label-icon" />
                Salary month
              </label>
              <div className="input-wrap">
                <Calendar size={16} aria-hidden="true" className="input-icon" />
                <input
                  id="salary-month"
                  type="month"
                  className="input-field input-field-icon"
                  value={salaryMonth}
                  onChange={(event) => setSalaryMonth(event.target.value)}
                />
              </div>
            </div>

            <div className="field-group">
              <label className="field-label" htmlFor="week-off-day">
                <CalendarOff size={14} aria-hidden="true" className="field-label-icon" />
                Week off day
              </label>
              <div className="input-wrap">
                <CalendarOff size={16} aria-hidden="true" className="input-icon" />
                <select
                  id="week-off-day"
                  className="input-field input-field-icon"
                  value={weekOffWeekday}
                  onChange={(event) => setWeekOffWeekday(event.target.value)}
                >
                  {WEEKDAY_NAMES.map((name, index) => (
                    <option key={name} value={index}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="field-group">
              <label className="field-label" htmlFor="holiday-days">
                <PartyPopper size={14} aria-hidden="true" className="field-label-icon" />
                Holidays (optional)
              </label>
              <div className="input-wrap">
                <PartyPopper size={16} aria-hidden="true" className="input-icon" />
                <input
                  id="holiday-days"
                  type="text"
                  className="input-field input-field-icon"
                  placeholder="e.g. 15, 26"
                  value={holidayInput}
                  onChange={(event) => setHolidayInput(event.target.value)}
                />
              </div>
              <span className="field-hint">Comma-separated day numbers for this month</span>
            </div>
          </div>

          <div className="button-row">
            <button
              type="submit"
              className="btn btn-primary"
              aria-label="Generate muster roll from uploaded file"
              disabled={isGenerating}
            >
              <Upload size={18} aria-hidden="true" />
              {isGenerating ? 'Generating…' : 'Generate Muster Roll'}
            </button>

            {workbookBlob && (
              <button
                type="button"
                className="btn btn-secondary"
                aria-label="Download generated muster roll Excel file"
                onClick={handleDownload}
              >
                <Download size={18} aria-hidden="true" />
                Download Excel File
              </button>
            )}

            {pdfBlob && (
              <button
                type="button"
                className="btn btn-secondary"
                aria-label="Download generated muster roll PDF file"
                onClick={handleDownloadPdf}
              >
                <FileText size={18} aria-hidden="true" />
                Download PDF File
              </button>
            )}
          </div>
        </form>

        {errors.length > 0 && (
          <div className="status-banner status-banner-error">
            <span className="banner-icon">
              <AlertTriangle size={18} aria-hidden="true" />
            </span>
            <div className="banner-message-list">
              <span className="banner-title">Please fix the following</span>
              {errors.map((message) => (
                <span key={message}>{message}</span>
              ))}
            </div>
          </div>
        )}

        {warnings.length > 0 && (
          <div className="status-banner status-banner-warning">
            <span className="banner-icon">
              <AlertTriangle size={18} aria-hidden="true" />
            </span>
            <div className="banner-message-list">
              <span className="banner-title">Heads up</span>
              {warnings.map((message) => (
                <span key={message}>{message}</span>
              ))}
            </div>
          </div>
        )}

        {result && (
          <div className="result-panel">
            <div className="result-header">
              <div className="result-summary">
                <CheckCircle2 size={20} aria-hidden="true" className="icon-success" />
                <span className="employee-count-badge">{result.rows.length} employees processed</span>
              </div>
            </div>

            <div className="stat-grid">
              <div className="stat-card">
                <span className="stat-icon stat-icon-brand">
                  <Users size={18} aria-hidden="true" />
                </span>
                <div className="stat-copy">
                  <span className="stat-value">{result.rows.length}</span>
                  <span className="stat-label">Employees</span>
                </div>
              </div>

              <div className="stat-card">
                <span className="stat-icon stat-icon-brand">
                  <CalendarDays size={18} aria-hidden="true" />
                </span>
                <div className="stat-copy">
                  <span className="stat-value">{result.calendar.workingDays.length}</span>
                  <span className="stat-label">Working days</span>
                </div>
              </div>

              <div className="stat-card">
                <span className="stat-icon stat-icon-success">
                  <UserCheck size={18} aria-hidden="true" />
                </span>
                <div className="stat-copy">
                  <span className="stat-value">{totalPresentDays}</span>
                  <span className="stat-label">Present days</span>
                </div>
              </div>

              <div className="stat-card">
                <span className="stat-icon stat-icon-danger">
                  <UserX size={18} aria-hidden="true" />
                </span>
                <div className="stat-copy">
                  <span className="stat-value">{totalAbsentDays}</span>
                  <span className="stat-label">Absent days</span>
                </div>
              </div>
            </div>

            <div className="legend-row">
              <span className="legend-item">
                <span className="day-badge day-badge-present">P</span>
                Present
              </span>
              <span className="legend-item">
                <span className="day-badge day-badge-absent">A</span>
                Absent
              </span>
              <span className="legend-item">
                <span className="day-badge day-badge-weekoff">W</span>
                Week off
              </span>
              <span className="legend-item">
                <span className="day-badge day-badge-holiday">H</span>
                Holiday
              </span>
              <span className="legend-item">
                <span className="day-badge day-badge-half">½</span>
                Half day
              </span>
              <span className="legend-item">
                <span className="day-badge day-badge-notjoined">-</span>
                Not yet joined
              </span>
            </div>

            <div className="preview-table-wrap">
              <table className="preview-table">
                <thead>
                  <tr>
                    <th scope="col">Sr.</th>
                    <th scope="col">Name</th>
                    {result.calendar.days.map((d) => (
                      <th scope="col" key={d.day}>
                        {String(d.day).padStart(2, '0')}
                      </th>
                    ))}
                    <th scope="col">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((row) => (
                    <tr key={row.sr}>
                      <td>{row.sr}</td>
                      <td>{row.name}</td>
                      {row.dayStatus.map((status, index) => (
                        <td key={index}>
                          <span className={`day-badge ${DAY_STATUS_META[status].className}`}>
                            {DAY_STATUS_META[status].label}
                          </span>
                        </td>
                      ))}
                      <td>{row.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

export default MusterRoll
