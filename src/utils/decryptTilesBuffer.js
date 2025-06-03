const crypto = require('crypto');


function fromhex(h) {
  return Uint8Array.from(h.match(/[0-9a-fA-F]{2}/g).map(x => parseInt(x, 16)));
}

function tohex(b) {
  return Array.from(b).map(x => x.toString(16).padStart(2, '0')).join('')
}

const aes_key = fromhex('5b63db113b7af3e0b1435556c8f9530c');
const aes_iv = fromhex('71e70405353a778bfa6fbc30321b9592');

// Create a cipher for padding
const cipher = crypto.createCipheriv('aes-128-cbc', aes_key, aes_iv);
const clearpad = new Uint8Array(32).fill(16);
const pad = Buffer.concat([cipher.update(clearpad), cipher.final()]);

function concat(...arrs) {
  const l = arrs.map(a => a.byteLength).reduce((x, y) => x + y, 0);
  const r = new Uint8Array(l);
  for (let i = 0, offset = 0; i < arrs.length; i++) {
    r.set(arrs[i], offset);
    offset += arrs[i].byteLength;
  }
  return r;
}

async function aes_decrypt_buffer(buffer) {
  // Pad the input
  const c = concat(buffer, pad);
  const decipher = crypto.createDecipheriv('aes-128-cbc', aes_key, aes_iv);
  const decrypted = Buffer.concat([decipher.update(c), decipher.final()]);
  // Un-pad the output
  return new Uint8Array(decrypted).slice(0, decrypted.byteLength - 32);
}

async function decryptImage({ buffer }) {
  // The file is composed of a constant header, a body,         
  // and a last 4-byte word indicating the start of the encrypted part
  const view = new DataView(buffer);

  // return if the encryption marker isn't present at the start of the file
  if (view.getUint32(0) !== 0x0A0A0A0A) {
    return new Uint8Array(buffer);
  }

  const index = view.getUint32(view.byteLength - 4, true);
  const clear_prefix = new Uint8Array(view.buffer, 4, index);
  const replace_count = view.getUint32(4 + index, true);
  const encrypted = new Uint8Array(view.buffer, 4 + index + 4, replace_count);
  const suffix_start = 4 + index + 4 + replace_count;
  const clear_suffix = new Uint8Array(view.buffer, suffix_start, view.byteLength - suffix_start - 4);
  return concat(clear_prefix, await aes_decrypt_buffer(encrypted), clear_suffix);
}


module.exports = { decryptImage };