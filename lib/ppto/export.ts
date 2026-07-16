// Exportación a Excel del módulo PPTO — portada VERBATIM desde presupuestos.html.
// NO tocar posiciones de fila/columna, fórmulas ni estilos: están calibradas contra la
// plantilla real de la agencia. Único cambio vs el HTML: ExcelJS/XLSX vienen por import
// (dinámico para ExcelJS) en vez de globales window.ExcelJS / window.XLSX.

import * as XLSX from 'xlsx'
import type { PptoBudget } from './calculations'
import { fmt } from './calculations'

export const LOGO_B64 = "iVBORw0KGgoAAAANSUhEUgAAAWcAAADKCAMAAABOk3E7AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAALlUExURQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABwcHAAAABoaABoaGhcXFwAAABUVABUVFRQUFAAAABISEg8PDw4ODg0NDRsbDRsbGw0NDRoaDRoaGgwMDBgYGBYWCxYWFgsLCxUVFQoKChQUChQUFBQUFBMTCRsbEhISEhoaGhoaGhAQEBkZGRgYGBYWDxYWFhUVFRwcFRQUFBsbGxoaFBoaGhcXFxYWFhYWFhUVFRsbGxoaFRoaGhkZFBkZGRkZFBgYExgYGB0dGBcXFxsbFxUVFRoaGhgYGBsbGBsbFxsbFxoaGhoaGhoaGhkZFh0dGRwcGRgYGBgYGBwcGBoaFxoaGh0dGhkZGRgYGBgYGBsbFRsbGB0dGhoaGhkZGRkZFhkZGRwcGRkZGRsbGRsbGBoaGB0dGhwcGRoaGB0dGhwcGhoaFxoaFxwcGhwcFxwcGR0dGx0dGRsbGBoaGhwcGhwcGBwcGhsbGR4eGx0dGxsbFxsbGRsbGRsbGx0dGx0dGxoaGBwcGB0dGxwcGhoaGhwcGBoaGhsbGhkZGRsbFx0dGxsbGRwcGhsbFhsbGBsbFxsbGxwcFxwcGxwcGh0dGRsbGh0dGBwcGRsbGRwcGRwcGxoaGRsbGB0dGhwcGxoaFxoaGhoaGhwcGhoaGhwcGhgYGBsbGB0dGB0dGxsbGhwcGRwcGRoaGRwcFxsbGRsbGhsbGR0dGRwcGBwcGRwcGBwcGxwcGhoaGhsbGRsbGx0dGhsbGRwcGRwcGRwcGBsbGhsbGx0dGRoaGRwcGRwcGhwcGhwcGRwcGxwcGRwcGR0dGB0dGhsbGhwcGxwcGhsbGhwcGhwcGhsbGRwcGRwcGRwcGhwcGhsbGRwcGhwcGhwcGhwcGRsbGRoaGBsbGhwcGhsbGhwcGRwcGhwcGhsbGhwcGhwcGhsbGR0dGhsbGRwcGhsbGRwcGhsbGRwcGhwcGhsbGRwcGhwcGhwcGhwcGh0dG8LjAvIAAAD2dFJOUwABAgMEBQYHCAkJCgoKCwwMDA0ODhESExMTFBQUFRUXFxgYGRkZGhscHR0eHx8gIyMkJCYmJycsLi8wMDEyMzM0NTU1ODg8PEFBQkNE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"

/* ---------- exportación con el diseño exacto de la plantilla ---------- */
const AZUL = "FF5B9BD5", BLANCO = "FFFFFFFF", NEGRO = "FF000000"
const GRIS_F = "FFD8D8D8", GRIS_H = "FFD9D9D9", GRIS_TOTAL = "FF7F7F7F"
const CONT = '_-"$"* #,##0_-;-"$"* #,##0_-;_-"$"* "-"_-;_-@_-'
const PESOS = '"$"#,##0'
const thin = { style: "thin", color: { argb: "FF000000" } } as const
const bordes = { top: thin, left: thin, bottom: thin, right: thin }
const fill = (c: string) => ({ type: "pattern", pattern: "solid", fgColor: { argb: c } } as const)
const ar = (size: number, extra?: Record<string, unknown>) => Object.assign({ name: "Arial", size }, extra || {})

export async function buildStyledBlob(b: PptoBudget): Promise<Blob> {
  const ExcelJS = (await import('exceljs')).default
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet("PPTO " + (b.cliente || "").slice(0, 20))
  const widths = [22.2, 70.7, 15.3, 14.2, 12.2, 21.5, 10.5, 16.5, 14, 16.5, 10.5, 16.5, 29.7]
  ws.columns = widths.map(w => ({ width: w }))

  const imgId = wb.addImage({ base64: LOGO_B64, extension: "png" })
  ws.addImage(imgId, { tl: { col: 0.1, row: 0.1 }, ext: { width: 149, height: 54 } })
  ws.mergeCells("A1:A3")
  ws.mergeCells("B1:F3")
  const title = ws.getCell("B1")
  title.value = "PRESUPUESTO"
  title.font = ar(20, { bold: true })
  title.alignment = { horizontal: "center", vertical: "middle" }

  const meta: [string, string][] = [["CENTRO COSTO:", b.centroCosto], ["CLIENTE:", b.cliente],
    ["EVENTO:", b.evento], ["FECHA:", b.fecha], ["CIUDAD", b.ciudad],
    ["DIRECTOR PROYECTO", b.director]]
  meta.forEach((m, i) => {
    const row = 4 + i
    ws.getCell("A" + row).value = m[0]
    ws.getCell("A" + row).font = ar(10, { bold: true })
    ws.mergeCells("B" + row + ":F" + row)
    ws.getCell("B" + row).value = m[1]
    ws.getCell("B" + row).font = ar(10)
    for (let cix = 1; cix <= 6; cix++) ws.getCell(row, cix).border = bordes
  })

  const heads: Record<number, string> = { 1: "PROCESO", 2: "ÍTEM", 3: "COSTO UNIDAD", 4: "CANTIDAD", 5: "DÍAS", 6: "COSTO TOTAL",
    8: "VENTA SUGERIDA", 9: "COSTO REAL UND", 10: "COSTO REAL TOTAL", 12: "COSTO TOTAL ORDENADO", 13: "PROVEEDOR" }
  Object.entries(heads).forEach(([cix, h]) => {
    const c = ws.getCell(11, Number(cix))
    c.value = h
    c.font = ar(10, { bold: true, color: { argb: BLANCO } })
    c.fill = fill(AZUL)
    c.alignment = { horizontal: "center", vertical: "middle", wrapText: true }
    c.border = bordes
  })
  ws.getRow(11).height = 30.8

  const first = 12
  const factor = 1 - (b.margenPct || 0) / 100
  b.rows.forEach((r, i) => {
    const x = first + i
    const row = ws.getRow(x)
    row.getCell(1).value = r.proceso || ""
    row.getCell(2).value = r.item || ""
    row.getCell(3).value = r.costoUnd || 0
    row.getCell(4).value = r.cant || 0
    row.getCell(5).value = r.dias || 0
    row.getCell(6).value = { formula: `C${x}*D${x}*E${x}` }
    row.getCell(8).value = { formula: factor > 0 ? `I${x}/${factor.toFixed(4)}` : "0" }
    row.getCell(9).value = r.costoRealUnd || 0
    row.getCell(10).value = { formula: `I${x}*D${x}*E${x}` }
    row.getCell(12).value = r.ordenado || 0
    row.getCell(13).value = r.proveedor || ""
    ;[1, 2, 3, 4, 5, 6, 8, 9, 10, 12, 13].forEach(cix => {
      const c = row.getCell(cix)
      c.border = bordes
      c.font = ar(10)
      if ([3, 6, 8, 9, 10, 12].includes(cix)) c.numFmt = CONT
    })
    row.getCell(1).font = ar(10, { bold: true })
    row.getCell(1).alignment = { horizontal: "center", vertical: "middle" }
    row.getCell(2).alignment = { wrapText: true, vertical: "middle" }
    row.getCell(4).alignment = { horizontal: "center" }
    row.getCell(5).alignment = { horizontal: "center" }
    row.getCell(6).fill = fill(GRIS_F)
    row.getCell(8).fill = fill(GRIS_H)
    row.height = Math.max(19, Math.ceil((r.item || "").length / 75) * 15)
  })

  // combinar grupos consecutivos de PROCESO
  let g0 = 0
  for (let i = 1; i <= b.rows.length; i++) {
    const cur = i < b.rows.length ? (b.rows[i].proceso || "") : null
    const prev = b.rows[g0].proceso || ""
    if (cur !== prev || i === b.rows.length) {
      if (i - g0 > 1 && prev) ws.mergeCells(first + g0, 1, first + i - 1, 1)
      g0 = i
    }
  }

  const last = first + b.rows.length - 1
  const T = last + 1

  ws.mergeCells(T, 1, T, 5)
  const tot = ws.getCell(T, 6)
  tot.value = { formula: `SUM(F${first}:F${last})` }
  tot.numFmt = CONT
  tot.font = ar(10, { bold: true, color: { argb: BLANCO } })
  tot.fill = fill(GRIS_TOTAL)
  tot.border = bordes

  const bold10 = ar(10, { bold: true })
  const setLM = (rowN: number, lVal: unknown, mText: string, opts?: { pct?: boolean }) => {
    opts = opts || {}
    const l = ws.getCell(rowN, 12), m = ws.getCell(rowN, 13)
    if (lVal !== null) l.value = lVal as never
    l.numFmt = opts.pct ? "0%" : PESOS
    l.font = bold10
    m.value = mText
    m.font = bold10
  }
  setLM(T, null, "COMPRAS CON TARJETA")
  setLM(T + 1, null, "ANTICIPOS SOLICITADOS")
  setLM(T + 2, { formula: `SUM(L${first}:L${last})` }, "TOTAL REAL ORDENADO")
  setLM(T + 3, { formula: `L${T + 2}` }, "COSTO TOTAL REAL")
  setLM(T + 4, { formula: `F${T + 7}-L${T + 3}` }, "UTILIDAD REAL")
  setLM(T + 5, { formula: `IF(F${T + 7}=0,0,L${T + 4}/F${T + 7})` }, "UT. REAL EXPRESADA EN %", { pct: true })

  for (let cix = 1; cix <= 5; cix++) ws.getCell(T + 2, cix).fill = fill(AZUL)

  ws.mergeCells(T + 2, 9, T + 2, 10)
  const proy = ws.getCell(T + 2, 9)
  proy.value = "PROYECCION"
  proy.font = bold10
  proy.alignment = { horizontal: "center" }
  const setIJ = (rowN: number, iText: string, jFormula: string, pct?: boolean) => {
    const ic = ws.getCell(rowN, 9), jc = ws.getCell(rowN, 10)
    ic.value = iText; ic.font = bold10
    jc.value = { formula: jFormula }
    jc.numFmt = pct ? "0%" : PESOS
    jc.font = bold10
  }
  setIJ(T + 3, "COSTO TOTAL", `SUM(J${first}:J${last})`)
  setIJ(T + 4, "UTILIDAD", `F${T + 7}-J${T + 3}`)
  setIJ(T + 5, "U %", `IF(F${T + 7}=0,0,J${T + 4}/F${T + 7})`, true)

  ws.mergeCells(T + 3, 4, T + 3, 6)
  const rh = ws.getCell(T + 3, 4)
  rh.value = "RESUMEN PRESUPUESTO"
  rh.font = ar(11, { bold: true, color: { argb: BLANCO } })
  rh.fill = fill(AZUL)
  rh.alignment = { horizontal: "center" }
  rh.border = bordes
  const banda = (rowN: number, texto: string, formula: string, merge: boolean) => {
    if (merge) ws.mergeCells(rowN, 4, rowN, 5)
    for (let cix = 4; cix <= 6; cix++) {
      const c = ws.getCell(rowN, cix)
      c.fill = fill(NEGRO)
      c.font = ar(11, { bold: true, color: { argb: BLANCO } })
      c.border = bordes
    }
    ws.getCell(rowN, 4).value = texto
    const f = ws.getCell(rowN, 6)
    f.value = { formula }
    f.numFmt = CONT
  }
  banda(T + 4, "SUBTOTAL", `F${T}`, false)
  banda(T + 5, "UTILIDAD DE AGENCIA", `F${T + 4}*${((b.agenciaPct || 0) / 100).toFixed(4)}`, true)
  banda(T + 7, "TOTAL ANTES DE IVA", `SUM(F${T + 4}:F${T + 5})`, true)

  // ----- pie: condiciones y firma -----
  // banda negra bajo el total de costos
  ws.mergeCells(T + 1, 1, T + 1, 6)
  for (let cix = 1; cix <= 6; cix++) ws.getCell(T + 1, cix).fill = fill(NEGRO)

  // nota de orden de producción
  ws.mergeCells(T + 3, 1, T + 3, 3)
  const nota = ws.getCell(T + 3, 1)
  nota.value = "*SE REQUIERE ORDEN DE PRODUCCIÓN O DOCUMENTO EQUIVALENTE"
  nota.font = ar(9, { bold: true })

  // forma de pago y validez
  const cond = (rowN: number, label: string, valor: string) => {
    const l = ws.getCell(rowN, 1)
    l.value = label
    l.font = ar(9, { bold: true })
    ws.mergeCells(rowN, 2, rowN, 3)
    const v = ws.getCell(rowN, 2)
    v.value = valor
    v.font = ar(10)
    v.alignment = { horizontal: "center" }
    for (let cix = 1; cix <= 3; cix++) ws.getCell(rowN, cix).border = { bottom: thin }
  }
  cond(T + 5, "* FORMA DE PAGO:", b.formaPago || "")
  cond(T + 6, "* VALIDEZ DE LA OFERTA:", b.validez || "")

  // banda negra: los valores no incluyen IVA
  ws.mergeCells(T + 7, 1, T + 7, 2)
  const iva = ws.getCell(T + 7, 1)
  iva.value = "* LOS ANTERIORES VALORES NO INCLUYEN IVA"
  iva.font = ar(9, { bold: true, color: { argb: BLANCO } })
  iva.fill = fill(NEGRO)
  iva.alignment = { horizontal: "center" }
  ws.getCell(T + 7, 2).fill = fill(NEGRO)

  // firma del director
  ws.mergeCells(T + 10, 1, T + 10, 3)
  const firma = ws.getCell(T + 10, 1)
  firma.value = b.director || ""
  firma.font = ar(10, { bold: true })
  firma.alignment = { horizontal: "center" }
  firma.border = { bottom: thin }
  ws.getCell(T + 10, 2).border = { bottom: thin }
  ws.getCell(T + 10, 3).border = { bottom: thin }
  ws.mergeCells(T + 11, 1, T + 11, 3)
  const cargo = ws.getCell(T + 11, 1)
  cargo.value = "DIRECTOR DEL PROYECTO A CARGO"
  cargo.font = ar(9, { bold: true })
  cargo.alignment = { horizontal: "center" }

  const buf = await wb.xlsx.writeBuffer()
  return new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
}

export function buildBasicBlob(b: PptoBudget): Blob {
  const wb = XLSX.utils.book_new()
  const aoa: unknown[][] = []
  for (let i = 0; i < 11; i++) aoa.push([])
  aoa[0] = ["", "PRESUPUESTO"]
  aoa[3] = ["CENTRO COSTO:", b.centroCosto]
  aoa[4] = ["CLIENTE:", b.cliente]
  aoa[5] = ["EVENTO:", b.evento]
  aoa[6] = ["FECHA:", b.fecha]
  aoa[7] = ["CIUDAD", b.ciudad]
  aoa[8] = ["DIRECTOR PROYECTO", b.director]
  aoa[10] = ["PROCESO", "ÍTEM", "COSTO UNIDAD", "CANTIDAD", "DÍAS", "COSTO TOTAL", "", "VENTA SUGERIDA", "COSTO REAL UND", "COSTO REAL TOTAL", "", "COSTO TOTAL ORDENADO", "PROVEEDOR"]
  const first = 12
  b.rows.forEach(r => {
    aoa.push([r.proceso || "", r.item, r.costoUnd || 0, r.cant || 0, r.dias || 0, 0, "", 0, r.costoRealUnd || 0, 0, "", r.ordenado || 0, r.proveedor || ""])
  })
  const last = first + b.rows.length - 1, T = last + 1
  const ws = XLSX.utils.aoa_to_sheet(aoa)
  const factor = 1 - (b.margenPct || 0) / 100
  for (let i = 0; i < b.rows.length; i++) {
    const x = first + i
    ws["F" + x] = { t: "n", f: `C${x}*D${x}*E${x}` }
    ws["H" + x] = { t: "n", f: factor > 0 ? `I${x}/${factor.toFixed(4)}` : "0" }
    ws["J" + x] = { t: "n", f: `I${x}*D${x}*E${x}` }
  }
  const putF = (addr: string, f: string) => { ws[addr] = { t: "n", f } }
  const putS = (addr: string, v: string) => { ws[addr] = { t: "s", v } }
  putF("F" + T, `SUM(F${first}:F${last})`)
  putS("M" + T, "COMPRAS CON TARJETA")
  putS("M" + (T + 1), "ANTICIPOS SOLICITADOS")
  putS("M" + (T + 2), "TOTAL REAL ORDENADO"); putF("L" + (T + 2), `SUM(L${first}:L${last})`)
  putS("M" + (T + 3), "COSTO TOTAL REAL"); putF("L" + (T + 3), `L${T + 2}`)
  putS("M" + (T + 4), "UTILIDAD REAL"); putF("L" + (T + 4), `F${T + 7}-L${T + 3}`)
  putS("M" + (T + 5), "UT. REAL EXPRESADA EN %"); putF("L" + (T + 5), `IF(F${T + 7}=0,0,L${T + 4}/F${T + 7})`)
  putS("I" + (T + 2), "PROYECCION")
  putS("I" + (T + 3), "COSTO TOTAL"); putF("J" + (T + 3), `SUM(J${first}:J${last})`)
  putS("I" + (T + 4), "UTILIDAD"); putF("J" + (T + 4), `F${T + 7}-J${T + 3}`)
  putS("I" + (T + 5), "U %"); putF("J" + (T + 5), `IF(F${T + 7}=0,0,J${T + 4}/F${T + 7})`)
  putS("D" + (T + 3), "RESUMEN PRESUPUESTO")
  putS("D" + (T + 4), "SUBTOTAL"); putF("F" + (T + 4), `F${T}`)
  putS("D" + (T + 5), "UTILIDAD DE AGENCIA"); putF("F" + (T + 5), `F${T + 4}*${((b.agenciaPct || 0) / 100).toFixed(4)}`)
  putS("D" + (T + 7), "TOTAL ANTES DE IVA"); putF("F" + (T + 7), `SUM(F${T + 4}:F${T + 5})`)
  putS("A" + (T + 3), "*SE REQUIERE ORDEN DE PRODUCCIÓN O DOCUMENTO EQUIVALENTE")
  putS("A" + (T + 5), "* FORMA DE PAGO:"); putS("B" + (T + 5), b.formaPago || "")
  putS("A" + (T + 6), "* VALIDEZ DE LA OFERTA:"); putS("B" + (T + 6), b.validez || "")
  putS("A" + (T + 7), "* LOS ANTERIORES VALORES NO INCLUYEN IVA")
  putS("A" + (T + 10), b.director || "")
  putS("A" + (T + 11), "DIRECTOR DEL PROYECTO A CARGO")
  const ref = XLSX.utils.decode_range(ws["!ref"] as string)
  ref.e.r = Math.max(ref.e.r, T + 11); ref.e.c = Math.max(ref.e.c, 12)
  ws["!ref"] = XLSX.utils.encode_range(ref)
  ws["!cols"] = [{ wch: 22 }, { wch: 70.7 }, { wch: 15 }, { wch: 14 }, { wch: 12 }, { wch: 21 }, { wch: 10 }, { wch: 16 }, { wch: 14 }, { wch: 16 }, { wch: 10 }, { wch: 16 }, { wch: 29 }]
  XLSX.utils.book_append_sheet(wb, ws, "PPTO")
  const out = XLSX.write(wb, { bookType: "xlsx", type: "array" })
  return new Blob([out], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
}

export const exportName = (b: PptoBudget) =>
  ("PPTO_" + (b.centroCosto || "SC") + "_" + (b.evento || "presupuesto") + "_V" + (b.version || 1))
    .replace(/\s+/g, "_").replace(/_+$/, "") + ".xlsx"
