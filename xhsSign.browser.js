/**
 * 小红书 x-s / x-s-common 签名 —— 纯浏览器版（无 Node crypto / Buffer 依赖）
 * 算法与原 xhsSign.js 完全一致，仅在浏览器/油猴环境下运行。
 */
;(function (root) {
  // ---------- 纯 JS MD5（输入 string，返回 hex；移植自 blueimp-md5，已验证，规避 JS 位运算符号陷阱） ----------
  function getMd5(s) {
    function safeAdd(x, y) {
      var lsw = (x & 0xffff) + (y & 0xffff)
      var msw = (x >> 16) + (y >> 16) + (lsw >> 16)
      return (msw << 16) | (lsw & 0xffff)
    }
    function bitRotateLeft(num, cnt) { return (num << cnt) | (num >>> (32 - cnt)) }
    function cmn(q, a, b, x, ss, t) { return safeAdd(bitRotateLeft(safeAdd(safeAdd(a, q), safeAdd(x, t)), ss), b) }
    function ff(a, b, c, d, x, ss, t) { return cmn((b & c) | (~b & d), a, b, x, ss, t) }
    function gg(a, b, c, d, x, ss, t) { return cmn((b & d) | (c & ~d), a, b, x, ss, t) }
    function hh(a, b, c, d, x, ss, t) { return cmn(b ^ c ^ d, a, b, x, ss, t) }
    function ii(a, b, c, d, x, ss, t) { return cmn(c ^ (b | ~d), a, b, x, ss, t) }
    function binlMD5(x, len) {
      x[len >> 5] |= 0x80 << len % 32
      x[(((len + 64) >>> 9) << 4) + 14] = len
      var a = 1732584193, b = -271733879, c = -1732584194, d = 271733878
      for (var i = 0; i < x.length; i += 16) {
        var olda = a, oldb = b, oldc = c, oldd = d
        a = ff(a,b,c,d,x[i],7,-680876936); d=ff(d,a,b,c,x[i+1],12,-389564586); c=ff(c,d,a,b,x[i+2],17,606105819); b=ff(b,c,d,a,x[i+3],22,-1044525330)
        a = ff(a,b,c,d,x[i+4],7,-176418897); d=ff(d,a,b,c,x[i+5],12,1200080426); c=ff(c,d,a,b,x[i+6],17,-1473231341); b=ff(b,c,d,a,x[i+7],22,-45705983)
        a = ff(a,b,c,d,x[i+8],7,1770035416); d=ff(d,a,b,c,x[i+9],12,-1958414417); c=ff(c,d,a,b,x[i+10],17,-42063); b=ff(b,c,d,a,x[i+11],22,-1990404162)
        a = ff(a,b,c,d,x[i+12],7,1804603682); d=ff(d,a,b,c,x[i+13],12,-40341101); c=ff(c,d,a,b,x[i+14],17,-1502002290); b=ff(b,c,d,a,x[i+15],22,1236535329)
        a = gg(a,b,c,d,x[i+1],5,-165796510); d=gg(d,a,b,c,x[i+6],9,-1069501632); c=gg(c,d,a,b,x[i+11],14,643717713); b=gg(b,c,d,a,x[i],20,-373897302)
        a = gg(a,b,c,d,x[i+5],5,-701558691); d=gg(d,a,b,c,x[i+10],9,38016083); c=gg(c,d,a,b,x[i+15],14,-660478335); b=gg(b,c,d,a,x[i+4],20,-405537848)
        a = gg(a,b,c,d,x[i+9],5,568446438); d=gg(d,a,b,c,x[i+14],9,-1019803690); c=gg(c,d,a,b,x[i+3],14,-187363961); b=gg(b,c,d,a,x[i+8],20,1163531501)
        a = gg(a,b,c,d,x[i+13],5,-1444681467); d=gg(d,a,b,c,x[i+2],9,-51403784); c=gg(c,d,a,b,x[i+7],14,1735328473); b=gg(b,c,d,a,x[i+12],20,-1926607734)
        a = hh(a,b,c,d,x[i+5],4,-378558); d=hh(d,a,b,c,x[i+8],11,-2022574463); c=hh(c,d,a,b,x[i+11],16,1839030562); b=hh(b,c,d,a,x[i+14],23,-35309556)
        a = hh(a,b,c,d,x[i+1],4,-1530992060); d=hh(d,a,b,c,x[i+4],11,1272893353); c=hh(c,d,a,b,x[i+7],16,-155497632); b=hh(b,c,d,a,x[i+10],23,-1094730640)
        a = hh(a,b,c,d,x[i+13],4,681279174); d=hh(d,a,b,c,x[i],11,-358537222); c=hh(c,d,a,b,x[i+3],16,-722521979); b=hh(b,c,d,a,x[i+6],23,76029189)
        a = hh(a,b,c,d,x[i+9],4,-640364487); d=hh(d,a,b,c,x[i+12],11,-421815835); c=hh(c,d,a,b,x[i+15],16,530742520); b=hh(b,c,d,a,x[i+2],23,-995338651)
        a = ii(a,b,c,d,x[i],6,-198630844); d=ii(d,a,b,c,x[i+7],10,1126891415); c=ii(c,d,a,b,x[i+14],15,-1416354905); b=ii(b,c,d,a,x[i+5],21,-57434055)
        a = ii(a,b,c,d,x[i+12],6,1700485571); d=ii(d,a,b,c,x[i+3],10,-1894986606); c=ii(c,d,a,b,x[i+10],15,-1051523); b=ii(b,c,d,a,x[i+1],21,-2054922799)
        a = ii(a,b,c,d,x[i+8],6,1873313359); d=ii(d,a,b,c,x[i+15],10,-30611744); c=ii(c,d,a,b,x[i+6],15,-1560198380); b=ii(b,c,d,a,x[i+13],21,1309151649)
        a = ii(a,b,c,d,x[i+4],6,-145523070); d=ii(d,a,b,c,x[i+11],10,-1120210379); c=ii(c,d,a,b,x[i+2],15,718787259); b=ii(b,c,d,a,x[i+9],21,-343485551)
        a = safeAdd(a, olda); b = safeAdd(b, oldb); c = safeAdd(c, oldc); d = safeAdd(d, oldd)
      }
      return [a, b, c, d]
    }
    function binl2rstr(input) {
      var output = ''
      for (var i = 0; i < input.length * 32; i += 8) output += String.fromCharCode((input[i >> 5] >>> i % 32) & 0xff)
      return output
    }
    function rstr2binl(input) {
      var output = []
      output[(input.length >> 2) - 1] = undefined
      for (var i = 0; i < output.length; i++) output[i] = 0
      for (var i = 0; i < input.length * 8; i += 8) output[i >> 5] |= (input.charCodeAt(i / 8) & 0xff) << i % 32
      return output
    }
    function rstrMD5(s) { return binl2rstr(binlMD5(rstr2binl(s), s.length * 8)) }
    function rstr2hex(input) {
      var hexTab = '0123456789abcdef', output = ''
      for (var i = 0; i < input.length; i++) {
        var x = input.charCodeAt(i)
        output += hexTab.charAt((x >>> 4) & 0x0f) + hexTab.charAt(x & 0x0f)
      }
      return output
    }
    function str2rstrUTF8(input) { return unescape(encodeURIComponent(input)) }
    return rstr2hex(rstrMD5(str2rstrUTF8(s)))
  }

  // ---------- 字节工具（用 Uint8Array 替代 Buffer） ----------
  const CUSTOM_BASE64_CHARS = [
    'Z', 'm', 's', 'e', 'r', 'b', 'B', 'o', 'H', 'Q', 't', 'N', 'P', '+', 'w', 'O',
    'c', 'z', 'a', '/', 'L', 'p', 'n', 'g', 'G', '8', 'y', 'J', 'q', '4', '2', 'K',
    'W', 'Y', 'j', '0', 'D', 'S', 'f', 'd', 'i', 'k', 'x', '3', 'V', 'T', '1', '6',
    'I', 'l', 'U', 'A', 'F', 'M', '9', '7', 'h', 'E', 'C', 'v', 'u', 'R', 'X', '5'
  ]
  const BASE58_ALPHABET = 'NOPQRStuvwxWXYZabcyz012DEFTKLMdefghijkl4563GHIJBC7mnop89+/'
  const BASE58_BASE = 58n

  function u8(arr) { return Uint8Array.from(arr) }
  function concatB() {
    let len = 0
    for (const a of arguments) len += a.length
    const out = new Uint8Array(len)
    let o = 0
    for (const a of arguments) { out.set(a, o); o += a.length }
    return out
  }
  function u32le(n) {
    const b = new Uint8Array(4)
    new DataView(b.buffer).setUint32(0, n >>> 0, true)
    return b
  }
  function u64le(n) {
    const b = new Uint8Array(8)
    new DataView(b.buffer).setBigUint64(0, BigInt(n), true)
    return b
  }
  function bytesPrefixLen(s) {
    const data = new TextEncoder().encode(s)
    if (data.length > 255) throw new Error('string too long')
    return concatB(u8([data.length]), data)
  }
  function computeValue(seed) {
    seed = seed >>> 0
    const s15 = seed >>> 15, s13 = seed >>> 13, s12 = seed >>> 12, s10 = seed >>> 10
    const xorPart = ((s15 & ~s13) | (s13 & ~s15)) >>> 0
    return (((xorPart ^ s12 ^ s10) << 31) & 0xFFFFFFFF) >>> 0
  }
  function xorBytes(arr, seed) {
    const res = new Uint8Array(arr.length)
    let s = seed >>> 0
    for (let i = 0; i < arr.length; i++) {
      res[i] = arr[i] ^ (s & 0xFF)
      s = ((computeValue(s) | (s >>> 1)) & 0xFFFFFFFF) >>> 0
    }
    return res
  }
  function hashXor(hashStr, xorKey) {
    const data = new Uint8Array(hashStr.length / 2)
    for (let i = 0; i < data.length; i++) data[i] = parseInt(hashStr.substr(i * 2, 2), 16)
    const ret = new Uint8Array(data.length)
    for (let i = 0; i < data.length; i++) ret[i] = data[i] ^ xorKey
    return ret.subarray(0, 8)
  }
  function encodeTimestamp(ts, randomizeFirst) {
    const key = u8([41, 41, 41, 41, 41, 41, 41, 41])
    const arr = u64le(ts)
    const encoded = new Uint8Array(arr)
    for (let i = 0; i < 8; i++) encoded[i] = arr[i] ^ key[i]
    if (randomizeFirst) encoded[0] = Math.floor(Math.random() * 256)
    return encoded
  }
  function buildX3(randNum, ts, startupTs, hashStr, a1, platform, params) {
    let b = u8([119, 104, 96, 41])
    b = concatB(b, u32le(randNum))
    b = concatB(b, encodeTimestamp(ts, true))
    b = concatB(b, u64le(startupTs))
    b = concatB(b, u32le(4))
    b = concatB(b, u32le(1269))
    b = concatB(b, u32le(new TextEncoder().encode(params).length))
    const randData = u32le(randNum)
    b = concatB(b, hashXor(hashStr, randData[0]))
    b = concatB(b, bytesPrefixLen(a1))
    b = concatB(b, bytesPrefixLen(platform))
    const tail = [1, Math.floor(Math.random() * 256), 249, 83, 102, 103, 201, 181, 128, 99, 94, 7, 68, 250, 132, 21]
    b = concatB(b, u8(tail))
    return b
  }
  function encodeBase58(data) {
    let num = 0n
    for (const byte of data) num = (num << 8n) | BigInt(byte)
    if (num === 0n) return BASE58_ALPHABET[0]
    const result = []
    while (num > 0n) {
      const mod = num % BASE58_BASE
      result.push(BASE58_ALPHABET[Number(mod)])
      num = num / BASE58_BASE
    }
    return result.reverse().join('')
  }
  function mnsv2(hashStr, a1, platform, params, opts) {
    opts = opts || {}
    const randNum = (opts.randNum != null) ? (opts.randNum >>> 0) : (Math.floor(Math.random() * 0xFFFFFFFF) >>> 0)
    const ts = (opts.ts != null) ? opts.ts : Date.now()
    const startupTs = (opts.startupTs != null) ? opts.startupTs : (ts - (1000 + Math.floor(Math.random() * 4000)))
    const x3 = buildX3(randNum, ts, startupTs, hashStr, a1, platform, params)
    const data = xorBytes(x3, 858975407)
    return 'mns0101_' + encodeBase58(data)
  }
  function tripletToBase64(e) {
    return CUSTOM_BASE64_CHARS[e >> 18 & 63] + CUSTOM_BASE64_CHARS[e >> 12 & 63] + CUSTOM_BASE64_CHARS[e >> 6 & 63] + CUSTOM_BASE64_CHARS[e & 63]
  }
  function encodeChunk(e, a, r) {
    const d = []
    let s = a
    while (s < r) {
      const c = ((e[s] << 16) & 0xff0000) + ((e[s + 1] << 8) & 0xff00) + (255 & e[s + 2])
      d.push(tripletToBase64(c)); s += 3
    }
    return d.join('')
  }
  function b64Encode(e) {
    const r = e.length
    const d = r % 3
    const s = []
    const f = 16383
    let u = 0
    const l = r - d
    while (u < l) { s.push(encodeChunk(e, u, u + f <= l ? u + f : l)); u += f }
    if (d === 1) {
      const a = e[r - 1]
      s.push(CUSTOM_BASE64_CHARS[a >> 2] + CUSTOM_BASE64_CHARS[(a << 4) & 63] + '==')
    } else if (d === 2) {
      const a = (e[r - 2] << 8) + e[r - 1]
      s.push(CUSTOM_BASE64_CHARS[a >> 10] + CUSTOM_BASE64_CHARS[a >> 4 & 63] + CUSTOM_BASE64_CHARS[(a << 2) & 63] + '=')
    }
    return s.join('')
  }

  function generateSign(apiPath, jsonData, a1, opts) {
    const jsonStr = JSON.stringify(jsonData)
    const params = apiPath + jsonStr
    const md5Hash = getMd5(params)
    const platform = 'xhs-pc-web'
    const x3 = mnsv2(md5Hash, a1, platform, params, opts)
    const f = { x0: '4.2.6', x1: 'xhs-pc-web', x2: 'Mac OS', x3, x4: 'object' }
    const X_s = 'XYS_' + b64Encode(new TextEncoder().encode(JSON.stringify(f)))
    const y = {
      s0: 3, s1: '', x0: '1', x1: '4.2.6', x2: 'Mac OS', x3: 'xhs-pc-web',
      x4: '4.83.0', x5: '', x6: '', x7: '', x8: '', x9: '', x10: 0, x11: 'normal'
    }
    const X_s_common = b64Encode(new TextEncoder().encode(JSON.stringify(y)))
    const X_t = String(Date.now())
    return { 'X-s': X_s, 'X-s-common': X_s_common, 'X-t': X_t }
  }

  const api = { generateSign, getMd5 }
  if (typeof module !== 'undefined' && module.exports) module.exports = api
  else root.xhsSignBrowser = api
})(typeof self !== 'undefined' ? self : this)
