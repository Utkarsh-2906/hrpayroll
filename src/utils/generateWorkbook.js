import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'
import { MUSTER_ROLL_HEADER } from './musterRollHeaderInfo'

const STATUS_LABEL = {
  HF: '½',
  NJ: '-',
}

const THIN_BORDER = {
  top: { style: 'thin' },
  left: { style: 'thin' },
  bottom: { style: 'thin' },
  right: { style: 'thin' },
}

const HEADER_BLOCK_ROWS = 4
const SPACER_ROW = HEADER_BLOCK_ROWS + 1
const TABLE_HEADER_ROW = SPACER_ROW + 1
const TABLE_FIRST_DATA_ROW = TABLE_HEADER_ROW + 1

function drawStatutoryHeader(sheet, lastColumnIndex, salaryMonthLabel) {
  const zone1End = Math.round(lastColumnIndex * 0.28)
  const zone2End = zone1End + Math.round(lastColumnIndex * 0.2)
  const zone3End = zone2End + Math.round(lastColumnIndex * 0.2)
  const zone4End = zone3End + Math.round(lastColumnIndex * 0.22)
  const zone5End = lastColumnIndex

  const underlineLabel = (row, col1, col2, text) => {
    sheet.mergeCells(row, col1, row, col2)
    const cell = sheet.getCell(row, col1)
    cell.value = text
    cell.font = { underline: true, size: 14 }
    cell.alignment = { horizontal: 'left', vertical: 'bottom' }
  }

  // Row 1: section labels
  underlineLabel(1, 1, zone1End, 'Name & Address of Contractor :')
  underlineLabel(1, zone2End + 1, zone3End, 'Name & Address of Establishment :')
  underlineLabel(1, zone3End + 1, zone4End, 'Name & Address of Principal Employer :')
  sheet.mergeCells(1, zone4End + 1, 1, zone5End)
  const pageNoCell = sheet.getCell(1, zone4End + 1)
  pageNoCell.value = 'Page No. : 1'
  pageNoCell.font = { size: 14 }
  pageNoCell.alignment = { horizontal: 'left', vertical: 'bottom' }

  // Rows 1-3, zone 2: form title block
  sheet.mergeCells(1, zone1End + 1, HEADER_BLOCK_ROWS - 1, zone2End)
  const titleCell = sheet.getCell(1, zone1End + 1)
  titleCell.value = {
    richText: [
      { font: { bold: true, size: 16 }, text: `${MUSTER_ROLL_HEADER.formTitleLines.join('\n')}\n` },
      { font: { size: 11 }, text: MUSTER_ROLL_HEADER.formRule },
    ],
  }
  titleCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }

  // Row 2: contractor name (bold) / establishment & principal employer name
  sheet.mergeCells(2, 1, 2, zone1End)
  const contractorNameCell = sheet.getCell(2, 1)
  contractorNameCell.value = MUSTER_ROLL_HEADER.contractorName
  contractorNameCell.font = { bold: true, size: 14 }

  sheet.mergeCells(2, zone2End + 1, 2, zone3End)
  sheet.getCell(2, zone2End + 1).value = MUSTER_ROLL_HEADER.establishmentName
  sheet.getCell(2, zone2End + 1).font = { size: 12 }

  sheet.mergeCells(2, zone3End + 1, 2, zone4End)
  sheet.getCell(2, zone3End + 1).value = MUSTER_ROLL_HEADER.principalEmployerName
  sheet.getCell(2, zone3End + 1).font = { size: 12 }

  // Row 3: contractor address / establishment & principal employer address
  sheet.mergeCells(3, 1, 3, zone1End)
  const contractorAddressCell = sheet.getCell(3, 1)
  contractorAddressCell.value = MUSTER_ROLL_HEADER.contractorAddress
  contractorAddressCell.font = { size: 12 }
  contractorAddressCell.alignment = { wrapText: true, vertical: 'top' }

  sheet.mergeCells(3, zone2End + 1, 3, zone3End)
  sheet.getCell(3, zone2End + 1).value = MUSTER_ROLL_HEADER.establishmentAddress
  sheet.getCell(3, zone2End + 1).font = { size: 12 }

  sheet.mergeCells(3, zone3End + 1, 3, zone4End)
  sheet.getCell(3, zone3End + 1).value = MUSTER_ROLL_HEADER.principalEmployerAddress
  sheet.getCell(3, zone3End + 1).font = { size: 12 }

  // Row 4: category / month
  sheet.mergeCells(4, 1, 4, zone2End)
  const categoryCell = sheet.getCell(4, 1)
  categoryCell.value = {
    richText: [
      { font: { size: 14 }, text: 'Category : ' },
      { font: { size: 14, bold: true }, text: MUSTER_ROLL_HEADER.category },
    ],
  }

  sheet.mergeCells(4, zone2End + 1, 4, zone5End)
  const monthCell = sheet.getCell(4, zone2End + 1)
  monthCell.value = {
    richText: [
      { font: { size: 14 }, text: 'Month : ' },
      { font: { size: 14, bold: true }, text: salaryMonthLabel },
    ],
  }
  monthCell.alignment = { horizontal: 'right' }

  sheet.getRow(1).height = 20
  sheet.getRow(2).height = 20
  sheet.getRow(3).height = 34
  sheet.getRow(4).height = 18
  sheet.getRow(SPACER_ROW).height = 6
}

export async function generateMusterRollWorkbook({ calendar, rows, salaryMonthLabel }) {
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Muster Roll')

  const dayColumnCount = calendar.totalDays
  const lastColumnIndex = 2 + dayColumnCount + 1 // Sr. + Name + days + Total

  drawStatutoryHeader(sheet, lastColumnIndex, salaryMonthLabel)

  const headerRow = sheet.getRow(TABLE_HEADER_ROW)
  headerRow.getCell(1).value = 'Sr.'
  headerRow.getCell(2).value = 'Name'
  for (let day = 1; day <= dayColumnCount; day++) {
    const cell = headerRow.getCell(2 + day)
    cell.value = day
    cell.numFmt = '00'
  }
  headerRow.getCell(2 + dayColumnCount + 1).value = 'Total'

  headerRow.eachCell((cell) => {
    cell.font = { bold: true, size: 14 }
    cell.alignment = { horizontal: 'center', vertical: 'middle' }
    cell.border = THIN_BORDER
  })

  rows.forEach((row, rowIndex) => {
    const excelRow = sheet.getRow(TABLE_FIRST_DATA_ROW + rowIndex)
    excelRow.getCell(1).value = row.sr
    excelRow.getCell(2).value = row.name

    row.dayStatus.forEach((status, dayIndex) => {
      const cell = excelRow.getCell(2 + dayIndex + 1)
      cell.value = STATUS_LABEL[status] ?? status
      cell.alignment = { horizontal: 'center', vertical: 'middle' }
    })

    excelRow.getCell(2 + dayColumnCount + 1).value = row.total

    excelRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      cell.border = THIN_BORDER
      cell.font = { size: 12 }
      if (colNumber > 2 && colNumber <= 2 + dayColumnCount + 1) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' }
      }
    })
  })

  sheet.getColumn(1).width = 6
  sheet.getColumn(2).width = 28
  for (let day = 1; day <= dayColumnCount; day++) {
    sheet.getColumn(2 + day).width = 4
  }
  sheet.getColumn(2 + dayColumnCount + 1).width = 9

  sheet.views = [{ state: 'frozen', xSplit: 2, ySplit: TABLE_HEADER_ROW }]

  const buffer = await workbook.xlsx.writeBuffer()
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}

export function downloadMusterRollWorkbook(blob, salaryMonthLabel) {
  saveAs(blob, `muster roll general ${salaryMonthLabel.toLowerCase().replace(/\s+/g, '-')}.xlsx`)
}
