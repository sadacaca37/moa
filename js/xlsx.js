// 엑셀(.xlsx)·CSV 읽고 쓰기 — 라이브러리 없이 브라우저에서 바로 (미니 게임·선생님 화면이 같이 씀)
/* 엑셀(.xlsx) 읽고 쓰기 — 압축 파일을 브라우저에서 바로 풀어요 */
export async function unzip(buf) {
  const dv = new DataView(buf); let e = buf.byteLength - 22;
  while (e >= 0 && dv.getUint32(e, true) !== 0x06054b50) e--;
  if (e < 0) throw new Error('zip');
  const n = dv.getUint16(e + 10, true), files = {}; let p = dv.getUint32(e + 16, true);
  for (let i = 0; i < n; i++) {
    const nl = dv.getUint16(p + 28, true), name = new TextDecoder().decode(new Uint8Array(buf, p + 46, nl));
    files[name] = { method: dv.getUint16(p + 10, true), size: dv.getUint32(p + 20, true), off: dv.getUint32(p + 42, true) };
    p += 46 + nl + dv.getUint16(p + 30, true) + dv.getUint16(p + 32, true);
  }
  return {
    names: Object.keys(files),
    async text(name) {
      const f = files[name]; if (!f) return null;
      const start = f.off + 30 + dv.getUint16(f.off + 26, true) + dv.getUint16(f.off + 28, true), data = new Uint8Array(buf, start, f.size);
      const out = f.method === 8 ? new Uint8Array(await new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer()) : data;
      return new TextDecoder().decode(out);
    }
  };
}
const colNo = ref => { const m = /^([A-Z]+)/.exec(ref || ''); if (!m) return -1; let n = 0; for (const ch of m[1]) n = n * 26 + ch.charCodeAt(0) - 64; return n - 1; };
const tags = (node, name) => [...node.getElementsByTagNameNS('*', name)];
export async function readXlsx(buf) {
  const z = await unzip(buf), P = s => new DOMParser().parseFromString(s, 'application/xml');
  const ss = []; const sst = await z.text('xl/sharedStrings.xml');
  if (sst) for (const si of tags(P(sst), 'si')) ss.push(tags(si, 't').map(t => t.textContent).join(''));
  let sheet = '';
  try { // 통합 문서의 첫 번째 시트
    const wb = P(await z.text('xl/workbook.xml')), rid = tags(wb, 'sheet')[0].getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id');
    const rel = tags(P(await z.text('xl/_rels/workbook.xml.rels')), 'Relationship').find(r => r.getAttribute('Id') === rid);
    const tg = rel.getAttribute('Target'); sheet = tg.startsWith('/') ? tg.slice(1) : 'xl/' + tg.replace(/^\.\//, '');
  } catch (e) { sheet = ''; }
  if (!z.names.includes(sheet)) sheet = z.names.filter(n => /^xl\/worksheets\/sheet\d+\.xml$/.test(n)).sort()[0];
  if (!sheet) throw new Error('sheet');
  const rows = [];
  for (const r of tags(P(await z.text(sheet)), 'row')) {
    const row = [];
    for (const c of tags(r, 'c')) {
      const t = c.getAttribute('t'); let v = '';
      if (t === 'inlineStr') v = tags(c, 't').map(x => x.textContent).join('');
      else { const vv = tags(c, 'v')[0]; v = vv ? vv.textContent : ''; if (t === 's') v = ss[+v] ?? ''; else if (t === 'b') v = v === '1' ? 'TRUE' : 'FALSE'; }
      const ci = colNo(c.getAttribute('r')); row[ci >= 0 ? ci : row.length] = v;
    }
    rows.push(Array.from(row, x => x ?? ''));
  }
  return rows;
}
export function readCSV(buf) {
  let t; try { t = new TextDecoder('utf-8', { fatal: true }).decode(buf); } catch (e) { t = new TextDecoder('euc-kr').decode(buf); } // 한글 엑셀 CSV
  t = t.replace(/^﻿/, ''); const rows = []; let row = [], cur = '', q = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) { if (c === '"') { if (t[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
    else if (c === '"') q = true;
    else if (c === ',' || c === '\t') { row.push(cur); cur = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && t[i + 1] === '\n') i++; row.push(cur); rows.push(row); row = []; cur = ''; }
    else cur += c;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  return rows;
}
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = u => { let c = 0xFFFFFFFF; for (let i = 0; i < u.length; i++) c = CRC[(c ^ u[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
export function zipStore(files) {
  const enc = new TextEncoder(), parts = [], cen = [], dosDate = ((2026 - 1980) << 9) | (1 << 5) | 1; let off = 0;
  for (const [name, str] of files) {
    const nm = enc.encode(name), data = enc.encode(str), crc = crc32(data), h = new DataView(new ArrayBuffer(30)), c = new DataView(new ArrayBuffer(46));
    h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(12, dosDate, true); h.setUint32(14, crc, true); h.setUint32(18, data.length, true); h.setUint32(22, data.length, true); h.setUint16(26, nm.length, true);
    c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(14, dosDate, true); c.setUint32(16, crc, true); c.setUint32(20, data.length, true); c.setUint32(24, data.length, true); c.setUint16(28, nm.length, true); c.setUint32(42, off, true);
    parts.push(new Uint8Array(h.buffer), nm, data); cen.push(new Uint8Array(c.buffer), nm); off += 30 + nm.length + data.length;
  }
  const size = cen.reduce((s, u) => s + u.length, 0), e = new DataView(new ArrayBuffer(22));
  e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, size, true); e.setUint32(16, off, true);
  return new Blob([...parts, ...cen, new Uint8Array(e.buffer)]);
}
export function makeXlsx(head, rows, widths) {
  const X = s => String(s).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const cell = (v, ci, ri, s) => { const ref = String.fromCharCode(65 + ci) + ri; return typeof v === 'number' ? `<c r="${ref}"${s ? ` s="${s}"` : ''}><v>${v}</v></c>` : `<c r="${ref}" t="inlineStr"${s ? ` s="${s}"` : ''}><is><t xml:space="preserve">${X(v)}</t></is></c>`; };
  const data = [head, ...rows].map((r, i) => `<row r="${i + 1}">${r.map((v, ci) => cell(v, ci, i + 1, i ? 2 : 1)).join('')}</row>`).join('');
  const NS = 'http://schemas.openxmlformats.org';
  return zipStore([
    ['[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="${NS}/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`],
    ['_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="${NS}/package/2006/relationships"><Relationship Id="rId1" Type="${NS}/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`],
    ['xl/workbook.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="${NS}/spreadsheetml/2006/main" xmlns:r="${NS}/officeDocument/2006/relationships"><sheets><sheet name="문제" sheetId="1" r:id="rId1"/></sheets></workbook>`],
    ['xl/_rels/workbook.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="${NS}/package/2006/relationships"><Relationship Id="rId1" Type="${NS}/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="${NS}/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`],
    ['xl/styles.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="${NS}/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="맑은 고딕"/></font><font><b/><sz val="11"/><name val="맑은 고딕"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFFD23F"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment wrapText="1" vertical="top"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`],
    ['xl/worksheets/sheet1.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="${NS}/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('')}</cols><sheetData>${data}</sheetData></worksheet>`]
  ]);
}
// 파일 내려받기
export function downloadBlob(name, blob) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.append(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
}
