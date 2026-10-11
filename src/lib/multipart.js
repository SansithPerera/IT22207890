'use strict';
// A small multipart/form-data parser for a request body that has already been
// read into memory (see readBody). It replaces Node's Request.formData(), which
// can parse uploads too but is deprecated in recent Node.js versions.
// Returns [[name, string | File], …] in the order the browser sent them.
const { File } = require('buffer');

function boundaryOf(contentType) {
  const m = /;\s*boundary=(?:"([^"]+)"|([^;\s]+))/i.exec(String(contentType || ''));
  return m ? m[1] || m[2] : '';
}

// A parameter of the Content-Disposition header, e.g. name="title".
// Browsers write " CR LF inside names as %22 %0D %0A.
function param(header, key) {
  const quoted = new RegExp(`;\\s*${key}="((?:[^"\\\\]|\\\\.)*)"`, 'i').exec(header);
  const bare = quoted ? null : new RegExp(`;\\s*${key}=([^;\\s]+)`, 'i').exec(header);
  const raw = quoted ? quoted[1].replace(/\\(["\\])/g, '$1') : bare ? bare[1] : undefined;
  return raw === undefined ? undefined : raw.replace(/%22/g, '"').replace(/%0D/gi, '\r').replace(/%0A/gi, '\n');
}

function parseMultipart(body, contentType) {
  const boundary = boundaryOf(contentType);
  if (!boundary || boundary.length > 200) throw new Error('Missing multipart boundary');
  const delimiter = Buffer.from(`--${boundary}`);
  const nextDelimiter = Buffer.from(`\r\n--${boundary}`);
  const entries = [];
  let pos = body.indexOf(delimiter);
  if (pos === -1) throw new Error('No multipart parts');
  for (;;) {
    pos += delimiter.length;
    if (body[pos] === 0x2d && body[pos + 1] === 0x2d) return entries; // "--": the closing delimiter
    while (body[pos] === 0x20 || body[pos] === 0x09) pos += 1; // optional padding
    if (body[pos] !== 0x0d || body[pos + 1] !== 0x0a) throw new Error('Malformed multipart delimiter');
    // pos is at the CRLF that ends the delimiter line; the headers end at the first blank line.
    const headerEnd = body.indexOf('\r\n\r\n', pos);
    if (headerEnd === -1) throw new Error('Malformed multipart headers');
    const headers = headerEnd > pos ? body.toString('utf8', pos + 2, headerEnd) : '';
    const dataStart = headerEnd + 4;
    const dataEnd = body.indexOf(nextDelimiter, dataStart);
    if (dataEnd === -1) throw new Error('Unterminated multipart part');
    const disposition = (/^content-disposition:([^\r\n]*)/im.exec(headers) || [])[1] || '';
    const name = param(disposition, 'name');
    if (name !== undefined) {
      const data = body.subarray(dataStart, dataEnd);
      const filename = param(disposition, 'filename');
      if (filename !== undefined) {
        const type = ((/^content-type:\s*([^\r\n]+)/im.exec(headers) || [])[1] || 'application/octet-stream').trim();
        entries.push([name, new File([data], filename, { type })]);
      } else {
        entries.push([name, data.toString('utf8')]);
      }
    }
    pos = dataEnd + 2; // now at the next delimiter
  }
}

module.exports = { parseMultipart, boundaryOf };
