import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { saveAs } from 'file-saver'
import { MUSTER_ROLL_HEADER } from './musterRollHeaderInfo'

const STATUS_LABEL = {
  HF: '½',
  NJ: '-',
}

const MARGIN_LEFT = 10
const MARGIN_RIGHT = 10
const HEADER_TABLE_TOP = 46

function drawStatutoryHeader(doc, salaryMonthLabel, pageNumber) {
  const pageWidth = doc.internal.pageSize.getWidth()
  const usableWidth = pageWidth - MARGIN_LEFT - MARGIN_RIGHT

  const zone1Width = usableWidth * 0.28
  const zone2Width = usableWidth * 0.2
  const zone3Width = usableWidth * 0.2
  const zone4Width = usableWidth * 0.22

  const x1 = MARGIN_LEFT
  const x2 = x1 + zone1Width
  const x3 = x2 + zone2Width
  const x4 = x3 + zone3Width
  const x5 = x4 + zone4Width

  const yLabel = 15
  const yLine1 = 22
  const yLine2 = 29
  const yLine3 = 34
  const yCategory = 41

  doc.setDrawColor(26, 26, 26)
  doc.setLineWidth(0.15)
  doc.setTextColor(26, 26, 26)

  const underlinedLabel = (x, y, text) => {
    doc.setFont(undefined, 'normal')
    doc.setFontSize(13)
    doc.text(text, x, y)
    const width = doc.getTextWidth(text)
    doc.line(x, y + 1, x + width, y + 1)
  }

  // Contractor
  underlinedLabel(x1, yLabel, 'Name & Address of Contractor :')
  doc.setFont(undefined, 'bold')
  doc.setFontSize(14)
  doc.text(MUSTER_ROLL_HEADER.contractorName, x1, yLine1)
  doc.setFont(undefined, 'normal')
  doc.setFontSize(10)
  doc.text(MUSTER_ROLL_HEADER.contractorAddress, x1, yLine2, { maxWidth: zone1Width - 4 })

  // Form title (centered in zone 2)
  const centerX2 = x2 + zone2Width / 2
  doc.setFont(undefined, 'bold')
  doc.setFontSize(16)
  MUSTER_ROLL_HEADER.formTitleLines.forEach((line, index) => {
    doc.text(line, centerX2, yLabel + index * 7, { align: 'center' })
  })
  doc.setFont(undefined, 'normal')
  doc.setFontSize(10)
  doc.text(MUSTER_ROLL_HEADER.formRule, centerX2, yLine3, { align: 'center' })

  // Establishment
  underlinedLabel(x3, yLabel, 'Name & Address of Establishment :')
  if (MUSTER_ROLL_HEADER.establishmentName) {
    doc.setFont(undefined, 'bold')
    doc.text(MUSTER_ROLL_HEADER.establishmentName, x3, yLine1)
  }
  if (MUSTER_ROLL_HEADER.establishmentAddress) {
    doc.setFont(undefined, 'normal')
    doc.text(MUSTER_ROLL_HEADER.establishmentAddress, x3, yLine2, { maxWidth: zone3Width - 4 })
  }

  // Principal employer
  underlinedLabel(x4, yLabel, 'Name & Address of Principal Employer :')
  if (MUSTER_ROLL_HEADER.principalEmployerName) {
    doc.setFont(undefined, 'bold')
    doc.text(MUSTER_ROLL_HEADER.principalEmployerName, x4, yLine1)
  }
  if (MUSTER_ROLL_HEADER.principalEmployerAddress) {
    doc.setFont(undefined, 'normal')
    doc.text(MUSTER_ROLL_HEADER.principalEmployerAddress, x4, yLine2, { maxWidth: zone4Width - 4 })
  }

  // Page no.
  doc.setFont(undefined, 'normal')
  doc.setFontSize(13)
  doc.text(`Page No. : ${pageNumber}`, x5, yLabel)

  // Category / month
  doc.setFont(undefined, 'normal')
  doc.setFontSize(13)
  const categoryLabel = 'Category : '
  doc.text(categoryLabel, x1, yCategory)
  doc.setFont(undefined, 'bold')
  doc.text(MUSTER_ROLL_HEADER.category, x1 + doc.getTextWidth(categoryLabel), yCategory)

  doc.setFont(undefined, 'bold')
  const monthValueWidth = doc.getTextWidth(salaryMonthLabel)
  doc.text(salaryMonthLabel, x1 + usableWidth, yCategory, { align: 'right' })
  doc.setFont(undefined, 'normal')
  doc.text('Month : ', x1 + usableWidth - monthValueWidth, yCategory, { align: 'right' })
}

export function generateMusterRollPdf({ calendar, rows, salaryMonthLabel }) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a3' })

  const totalColumnIndex = 2 + calendar.days.length
  const head = [['Sr.', 'Name', ...calendar.days.map((d) => String(d.day).padStart(2, '0')), 'Total']]
  const body = rows.map((row) => [
    row.sr,
    row.name,
    ...row.dayStatus.map((status) => STATUS_LABEL[status] ?? status),
    row.total,
  ])

  autoTable(doc, {
    head,
    body,
    startY: HEADER_TABLE_TOP,
    margin: { top: HEADER_TABLE_TOP, left: MARGIN_LEFT, right: MARGIN_RIGHT },
    theme: 'grid',
    styles: {
      fontSize: 10,
      halign: 'center',
      valign: 'middle',
      cellPadding: 1.5,
      lineColor: [221, 227, 231],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [26, 26, 26],
      fontStyle: 'bold',
      fontSize: 13,
    },
    columnStyles: {
      0: { cellWidth: 10 },
      1: { halign: 'left', cellWidth: 36 },
      [totalColumnIndex]: { cellWidth: 14, fontStyle: 'bold' },
    },
    didDrawPage: (data) => {
      drawStatutoryHeader(doc, salaryMonthLabel, data.pageNumber)
    },
  })

  return doc.output('blob')
}

export function downloadMusterRollPdf(blob, salaryMonthLabel) {
  saveAs(blob, `muster roll general ${salaryMonthLabel.toLowerCase().replace(/\s+/g, '-')}.pdf`)
}
