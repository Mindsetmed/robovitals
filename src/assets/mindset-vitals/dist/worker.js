var wt = typeof self < "u" ? self : {};
function pt() {
  throw Error("Invalid UTF8");
}
function li(e, t) {
  return t = String.fromCharCode.apply(null, t), e == null ? t : e + t;
}
let wn, mr;
const T2 = typeof TextDecoder < "u";
let S2;
const L2 = typeof TextEncoder < "u";
function Fo(e) {
  if (L2) e = (S2 || (S2 = new TextEncoder())).encode(e);
  else {
    let n = 0;
    const r = new Uint8Array(3 * e.length);
    for (let s = 0; s < e.length; s++) {
      var t = e.charCodeAt(s);
      if (t < 128) r[n++] = t;
      else {
        if (t < 2048) r[n++] = t >> 6 | 192;
        else {
          if (t >= 55296 && t <= 57343) {
            if (t <= 56319 && s < e.length) {
              const i = e.charCodeAt(++s);
              if (i >= 56320 && i <= 57343) {
                t = 1024 * (t - 55296) + i - 56320 + 65536, r[n++] = t >> 18 | 240, r[n++] = t >> 12 & 63 | 128, r[n++] = t >> 6 & 63 | 128, r[n++] = 63 & t | 128;
                continue;
              }
              s--;
            }
            t = 65533;
          }
          r[n++] = t >> 12 | 224, r[n++] = t >> 6 & 63 | 128;
        }
        r[n++] = 63 & t | 128;
      }
    }
    e = n === r.length ? r : r.subarray(0, n);
  }
  return e;
}
var ns, Fn;
e: {
  for (var fi = ["CLOSURE_FLAGS"], yr = wt, _r = 0; _r < fi.length; _r++) if ((yr = yr[fi[_r]]) == null) {
    Fn = null;
    break e;
  }
  Fn = yr;
}
var sn, di = Fn && Fn[610401301];
ns = di != null && di;
const pi = wt.navigator;
function Dr(e) {
  return !!ns && !!sn && sn.brands.some((({ brand: t }) => t && t.indexOf(e) != -1));
}
function Te(e) {
  var t;
  return (t = wt.navigator) && (t = t.userAgent) || (t = ""), t.indexOf(e) != -1;
}
function rt() {
  return !!ns && !!sn && sn.brands.length > 0;
}
function wr() {
  return rt() ? Dr("Chromium") : (Te("Chrome") || Te("CriOS")) && !(!rt() && Te("Edge")) || Te("Silk");
}
function rs(e) {
  return rs[" "](e), e;
}
sn = pi && pi.userAgentData || null, rs[" "] = function() {
};
var x2 = !rt() && (Te("Trident") || Te("MSIE"));
!Te("Android") || wr(), wr(), Te("Safari") && (wr() || !rt() && Te("Coast") || !rt() && Te("Opera") || !rt() && Te("Edge") || (rt() ? Dr("Microsoft Edge") : Te("Edg/")) || rt() && Dr("Opera"));
var Oo = {}, Qt = null;
function M2(e) {
  const t = e.length;
  let n = 3 * t / 4;
  n % 3 ? n = Math.floor(n) : "=.".indexOf(e[t - 1]) != -1 && (n = "=.".indexOf(e[t - 2]) != -1 ? n - 2 : n - 1);
  const r = new Uint8Array(n);
  let s = 0;
  return (function(i, o) {
    function a(u) {
      for (; c < i.length; ) {
        const h = i.charAt(c++), l = Qt[h];
        if (l != null) return l;
        if (!/^[\s\xa0]*$/.test(h)) throw Error("Unknown base64 encoding at char: " + h);
      }
      return u;
    }
    Po();
    let c = 0;
    for (; ; ) {
      const u = a(-1), h = a(0), l = a(64), b = a(64);
      if (b === 64 && u === -1) break;
      o(u << 2 | h >> 4), l != 64 && (o(h << 4 & 240 | l >> 2), b != 64 && o(l << 6 & 192 | b));
    }
  })(e, (function(i) {
    r[s++] = i;
  })), s !== n ? r.subarray(0, s) : r;
}
function Po() {
  if (!Qt) {
    Qt = {};
    var e = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789".split(""), t = ["+/=", "+/", "-_=", "-_.", "-_"];
    for (let n = 0; n < 5; n++) {
      const r = e.concat(t[n].split(""));
      Oo[n] = r;
      for (let s = 0; s < r.length; s++) {
        const i = r[s];
        Qt[i] === void 0 && (Qt[i] = s);
      }
    }
  }
}
var Ro = typeof Uint8Array < "u", Io = !x2 && typeof btoa == "function";
function gi(e) {
  if (!Io) {
    var t;
    t === void 0 && (t = 0), Po(), t = Oo[t];
    var n = Array(Math.floor(e.length / 3)), r = t[64] || "";
    let c = 0, u = 0;
    for (; c < e.length - 2; c += 3) {
      var s = e[c], i = e[c + 1], o = e[c + 2], a = t[s >> 2];
      s = t[(3 & s) << 4 | i >> 4], i = t[(15 & i) << 2 | o >> 6], o = t[63 & o], n[u++] = a + s + i + o;
    }
    switch (a = 0, o = r, e.length - c) {
      case 2:
        o = t[(15 & (a = e[c + 1])) << 2] || r;
      case 1:
        e = e[c], n[u] = t[e >> 2] + t[(3 & e) << 4 | a >> 4] + o + r;
    }
    return n.join("");
  }
  for (t = "", n = 0, r = e.length - 10240; n < r; ) t += String.fromCharCode.apply(null, e.subarray(n, n += 10240));
  return t += String.fromCharCode.apply(null, n ? e.subarray(n) : e), btoa(t);
}
const mi = /[-_.]/g, F2 = { "-": "+", _: "/", ".": "=" };
function O2(e) {
  return F2[e] || "";
}
function Co(e) {
  if (!Io) return M2(e);
  mi.test(e) && (e = e.replace(mi, O2)), e = atob(e);
  const t = new Uint8Array(e.length);
  for (let n = 0; n < e.length; n++) t[n] = e.charCodeAt(n);
  return t;
}
function un(e) {
  return Ro && e != null && e instanceof Uint8Array;
}
var Pt = {};
function vt() {
  return P2 || (P2 = new Xe(null, Pt));
}
function ss(e) {
  No(Pt);
  var t = e.g;
  return (t = t == null || un(t) ? t : typeof t == "string" ? Co(t) : null) == null ? t : e.g = t;
}
var Xe = class {
  h() {
    return new Uint8Array(ss(this) || 0);
  }
  constructor(e, t) {
    if (No(t), this.g = e, e != null && e.length === 0) throw Error("ByteString should be constructed with non-empty values");
  }
};
let P2, R2;
function No(e) {
  if (e !== Pt) throw Error("illegal external caller");
}
function Do(e, t) {
  e.__closure__error__context__984382 || (e.__closure__error__context__984382 = {}), e.__closure__error__context__984382.severity = t;
}
function Ur(e) {
  return Do(e = Error(e), "warning"), e;
}
var Vn = typeof Symbol == "function" && typeof Symbol() == "symbol", I2 = /* @__PURE__ */ new Set();
function hn(e, t, n = !1, r = !1) {
  return e = typeof Symbol == "function" && typeof Symbol() == "symbol" ? r && Symbol.for && e ? Symbol.for(e) : e != null ? Symbol(e) : Symbol() : t, n && I2.add(e), e;
}
var C2 = hn("jas", void 0, !0, !0), yi = hn(void 0, "0di"), vr = hn(void 0, "2ex"), Jt = hn(void 0, "1oa", !0), Rt = hn(void 0, Symbol(), !0);
const m = Vn ? C2 : "Ga", Uo = { Ga: { value: 0, configurable: !0, writable: !0, enumerable: !1 } }, Bo = Object.defineProperties;
function jn(e, t) {
  Vn || m in e || Bo(e, Uo), e[m] |= t;
}
function $(e, t) {
  Vn || m in e || Bo(e, Uo), e[m] = t;
}
function jt(e) {
  return jn(e, 34), e;
}
function N2(e, t) {
  $(t, -30975 & (0 | e));
}
function Br(e, t) {
  $(t, -30941 & (34 | e));
}
function is() {
  return typeof BigInt == "function";
}
function le(e) {
  return Array.prototype.slice.call(e);
}
var os, ln = {}, Go = {};
function _i(e) {
  return !(!e || typeof e != "object" || e.Ia !== Go);
}
function as(e) {
  return e !== null && typeof e == "object" && !Array.isArray(e) && e.constructor === Object;
}
function cs(e, t) {
  if (e != null) {
    if (typeof e == "string") e = e ? new Xe(e, Pt) : vt();
    else if (e.constructor !== Xe) if (un(e)) e = e.length ? new Xe(new Uint8Array(e), Pt) : vt();
    else {
      if (!t) throw Error();
      e = void 0;
    }
  }
  return e;
}
function On(e) {
  return !(!Array.isArray(e) || e.length) && !!(1 & (0 | e[m]));
}
const wi = [];
function ut(e) {
  if (2 & e) throw Error();
}
$(wi, 55), os = Object.freeze(wi);
class Pn {
  constructor(t, n, r) {
    this.l = 0, this.g = t, this.h = n, this.m = r;
  }
  next() {
    if (this.l < this.g.length) {
      const t = this.g[this.l++];
      return { done: !1, value: this.h ? this.h.call(this.m, t) : t };
    }
    return { done: !0, value: void 0 };
  }
  [Symbol.iterator]() {
    return new Pn(this.g, this.h, this.m);
  }
}
function us(e) {
  return Rt ? e[Rt] : void 0;
}
var D2 = Object.freeze({});
function Hn(e) {
  return e.Qa = !0, e;
}
var U2 = Hn(((e) => typeof e == "number")), vi = Hn(((e) => typeof e == "string")), B2 = Hn(((e) => typeof e == "boolean")), Wn = typeof wt.BigInt == "function" && typeof wt.BigInt(0) == "bigint", Gr = Hn(((e) => Wn ? e >= V2 && e <= H2 : e[0] === "-" ? Ei(e, G2) : Ei(e, j2)));
const G2 = Number.MIN_SAFE_INTEGER.toString(), V2 = Wn ? BigInt(Number.MIN_SAFE_INTEGER) : void 0, j2 = Number.MAX_SAFE_INTEGER.toString(), H2 = Wn ? BigInt(Number.MAX_SAFE_INTEGER) : void 0;
function Ei(e, t) {
  if (e.length > t.length) return !1;
  if (e.length < t.length || e === t) return !0;
  for (let n = 0; n < e.length; n++) {
    const r = e[n], s = t[n];
    if (r > s) return !1;
    if (r < s) return !0;
  }
}
const W2 = typeof Uint8Array.prototype.slice == "function";
let Vo, P = 0, H = 0;
function bi(e) {
  const t = e >>> 0;
  P = t, H = (e - t) / 4294967296 >>> 0;
}
function It(e) {
  if (e < 0) {
    bi(-e);
    const [t, n] = ds(P, H);
    P = t >>> 0, H = n >>> 0;
  } else bi(e);
}
function hs(e) {
  const t = Vo || (Vo = new DataView(new ArrayBuffer(8)));
  t.setFloat32(0, +e, !0), H = 0, P = t.getUint32(0, !0);
}
function ls(e, t) {
  const n = 4294967296 * t + (e >>> 0);
  return Number.isSafeInteger(n) ? n : on(e, t);
}
function fs(e, t) {
  const n = 2147483648 & t;
  return n && (t = ~t >>> 0, (e = 1 + ~e >>> 0) == 0 && (t = t + 1 >>> 0)), typeof (e = ls(e, t)) == "number" ? n ? -e : e : n ? "-" + e : e;
}
function on(e, t) {
  if (e >>>= 0, (t >>>= 0) <= 2097151) var n = "" + (4294967296 * t + e);
  else is() ? n = "" + (BigInt(t) << BigInt(32) | BigInt(e)) : (e = (16777215 & e) + 6777216 * (n = 16777215 & (e >>> 24 | t << 8)) + 6710656 * (t = t >> 16 & 65535), n += 8147497 * t, t *= 2, e >= 1e7 && (n += e / 1e7 >>> 0, e %= 1e7), n >= 1e7 && (t += n / 1e7 >>> 0, n %= 1e7), n = t + Ai(n) + Ai(e));
  return n;
}
function Ai(e) {
  return e = String(e), "0000000".slice(e.length) + e;
}
function zn(e) {
  if (e.length < 16) It(Number(e));
  else if (is()) e = BigInt(e), P = Number(e & BigInt(4294967295)) >>> 0, H = Number(e >> BigInt(32) & BigInt(4294967295));
  else {
    const t = +(e[0] === "-");
    H = P = 0;
    const n = e.length;
    for (let r = t, s = (n - t) % 6 + t; s <= n; r = s, s += 6) {
      const i = Number(e.slice(r, s));
      H *= 1e6, P = 1e6 * P + i, P >= 4294967296 && (H += Math.trunc(P / 4294967296), H >>>= 0, P >>>= 0);
    }
    if (t) {
      const [r, s] = ds(P, H);
      P = r, H = s;
    }
  }
}
function ds(e, t) {
  return t = ~t, e ? e = 1 + ~e : t += 1, [e, t];
}
const ps = typeof BigInt == "function" ? BigInt.asIntN : void 0, z2 = typeof BigInt == "function" ? BigInt.asUintN : void 0, Lt = Number.isSafeInteger, qn = Number.isFinite, Rn = Math.trunc;
function ht(e) {
  return e == null || typeof e == "number" ? e : e === "NaN" || e === "Infinity" || e === "-Infinity" ? Number(e) : void 0;
}
function jo(e) {
  return e == null || typeof e == "boolean" ? e : typeof e == "number" ? !!e : void 0;
}
const q2 = /^-?([1-9][0-9]*|0)(\.[0-9]+)?$/;
function Kn(e) {
  switch (typeof e) {
    case "bigint":
      return !0;
    case "number":
      return qn(e);
    case "string":
      return q2.test(e);
    default:
      return !1;
  }
}
function Ht(e) {
  if (e == null) return e;
  if (typeof e == "string" && e) e = +e;
  else if (typeof e != "number") return;
  return qn(e) ? 0 | e : void 0;
}
function Ho(e) {
  if (e == null) return e;
  if (typeof e == "string" && e) e = +e;
  else if (typeof e != "number") return;
  return qn(e) ? e >>> 0 : void 0;
}
function ki(e) {
  if (e[0] === "-") return !1;
  const t = e.length;
  return t < 20 || t === 20 && Number(e.substring(0, 6)) < 184467;
}
function gs(e) {
  return e = Rn(e), Lt(e) || (It(e), e = fs(P, H)), e;
}
function ms(e) {
  var t = Rn(Number(e));
  if (Lt(t)) return String(t);
  if ((t = e.indexOf(".")) !== -1 && (e = e.substring(0, t)), t = e.length, !(e[0] === "-" ? t < 20 || t === 20 && Number(e.substring(0, 7)) > -922337 : t < 19 || t === 19 && Number(e.substring(0, 6)) < 922337)) if (zn(e), e = P, 2147483648 & (t = H)) if (is()) e = "" + (BigInt(0 | t) << BigInt(32) | BigInt(e >>> 0));
  else {
    const [n, r] = ds(e, t);
    e = "-" + on(n, r);
  }
  else e = on(e, t);
  return e;
}
function In(e) {
  return e == null ? e : typeof e == "bigint" ? (Gr(e) ? e = Number(e) : (e = ps(64, e), e = Gr(e) ? Number(e) : String(e)), e) : Kn(e) ? typeof e == "number" ? gs(e) : ms(e) : void 0;
}
function K2(e) {
  if (e == null) return e;
  var t = typeof e;
  if (t === "bigint") return String(z2(64, e));
  if (Kn(e)) {
    if (t === "string") return t = Rn(Number(e)), Lt(t) && t >= 0 ? e = String(t) : ((t = e.indexOf(".")) !== -1 && (e = e.substring(0, t)), ki(e) || (zn(e), e = on(P, H))), e;
    if (t === "number") return (e = Rn(e)) >= 0 && Lt(e) ? e : (function(n) {
      if (n < 0) {
        It(n);
        var r = on(P, H);
        return n = Number(r), Lt(n) ? n : r;
      }
      return ki(r = String(n)) ? r : (It(n), ls(P, H));
    })(e);
  }
}
function Wo(e) {
  if (typeof e != "string") throw Error();
  return e;
}
function Wt(e) {
  if (e != null && typeof e != "string") throw Error();
  return e;
}
function Ct(e) {
  return e == null || typeof e == "string" ? e : void 0;
}
function ys(e, t, n, r) {
  if (e != null && typeof e == "object" && e.W === ln) return e;
  if (!Array.isArray(e)) return n ? 2 & r ? ((e = t[yi]) || (jt((e = new t()).u), e = t[yi] = e), t = e) : t = new t() : t = void 0, t;
  let s = n = 0 | e[m];
  return s === 0 && (s |= 32 & r), s |= 2 & r, s !== n && $(e, s), new t(e);
}
function $2(e, t, n) {
  if (t) e: {
    if (!Kn(t = e)) throw Ur("int64");
    switch (typeof t) {
      case "string":
        t = ms(t);
        break e;
      case "bigint":
        if (e = t = ps(64, t), vi(e)) {
          if (!/^\s*(?:-?[1-9]\d*|0)?\s*$/.test(e)) throw Error(String(e));
        } else if (U2(e) && !Number.isSafeInteger(e)) throw Error(String(e));
        t = Wn ? BigInt(t) : B2(t) ? t ? "1" : "0" : vi(t) ? t.trim() || "0" : String(t);
        break e;
      default:
        t = gs(t);
    }
  }
  else t = In(e);
  return typeof (n = (e = t) == null ? n ? 0 : void 0 : e) == "string" && Lt(t = +n) ? t : n;
}
const X2 = {};
let Y2 = (function() {
  try {
    return rs(new class extends Map {
      constructor() {
        super();
      }
    }()), !1;
  } catch {
    return !0;
  }
})();
class Er {
  constructor() {
    this.g = /* @__PURE__ */ new Map();
  }
  get(t) {
    return this.g.get(t);
  }
  set(t, n) {
    return this.g.set(t, n), this.size = this.g.size, this;
  }
  delete(t) {
    return t = this.g.delete(t), this.size = this.g.size, t;
  }
  clear() {
    this.g.clear(), this.size = this.g.size;
  }
  has(t) {
    return this.g.has(t);
  }
  entries() {
    return this.g.entries();
  }
  keys() {
    return this.g.keys();
  }
  values() {
    return this.g.values();
  }
  forEach(t, n) {
    return this.g.forEach(t, n);
  }
  [Symbol.iterator]() {
    return this.entries();
  }
}
const J2 = Y2 ? (Object.setPrototypeOf(Er.prototype, Map.prototype), Object.defineProperties(Er.prototype, { size: { value: 0, configurable: !0, enumerable: !0, writable: !0 } }), Er) : class extends Map {
  constructor() {
    super();
  }
};
function Ti(e) {
  return e;
}
function br(e) {
  if (2 & e.L) throw Error("Cannot mutate an immutable Map");
}
var Le = class extends J2 {
  constructor(e, t, n = Ti, r = Ti) {
    super();
    let s = 0 | e[m];
    s |= 64, $(e, s), this.L = s, this.S = t, this.R = n, this.Y = this.S ? Z2 : r;
    for (let i = 0; i < e.length; i++) {
      const o = e[i], a = n(o[0], !1, !0);
      let c = o[1];
      t ? c === void 0 && (c = null) : c = r(o[1], !1, !0, void 0, void 0, s), super.set(a, c);
    }
  }
  na(e = Si) {
    if (this.size !== 0) return this.X(e);
  }
  X(e = Si) {
    const t = [], n = super.entries();
    for (var r; !(r = n.next()).done; ) (r = r.value)[0] = e(r[0]), r[1] = e(r[1]), t.push(r);
    return t;
  }
  clear() {
    br(this), super.clear();
  }
  delete(e) {
    return br(this), super.delete(this.R(e, !0, !1));
  }
  entries() {
    var e = this.ma();
    return new Pn(e, Q2, this);
  }
  keys() {
    return this.Ha();
  }
  values() {
    var e = this.ma();
    return new Pn(e, Le.prototype.get, this);
  }
  forEach(e, t) {
    super.forEach(((n, r) => {
      e.call(t, this.get(r), r, this);
    }));
  }
  set(e, t) {
    return br(this), (e = this.R(e, !0, !1)) == null ? this : t == null ? (super.delete(e), this) : super.set(e, this.Y(t, !0, !0, this.S, !1, this.L));
  }
  Na(e) {
    const t = this.R(e[0], !1, !0);
    e = e[1], e = this.S ? e === void 0 ? null : e : this.Y(e, !1, !0, void 0, !1, this.L), super.set(t, e);
  }
  has(e) {
    return super.has(this.R(e, !1, !1));
  }
  get(e) {
    e = this.R(e, !1, !1);
    const t = super.get(e);
    if (t !== void 0) {
      var n = this.S;
      return n ? ((n = this.Y(t, !1, !0, n, this.ra, this.L)) !== t && super.set(e, n), n) : t;
    }
  }
  ma() {
    return Array.from(super.keys());
  }
  Ha() {
    return super.keys();
  }
  [Symbol.iterator]() {
    return this.entries();
  }
};
function Z2(e, t, n, r, s, i) {
  return e = ys(e, r, n, i), s && (e = Xn(e)), e;
}
function Si(e) {
  return e;
}
function Q2(e) {
  return [e, this.get(e)];
}
let e1, zo, t1;
function Li() {
  return e1 || (e1 = new Le(jt([]), void 0, void 0, void 0, X2));
}
function _s(e, t, n, r, s) {
  if (e != null) {
    if (Array.isArray(e)) e = On(e) ? void 0 : s && 2 & (0 | e[m]) ? e : ws(e, t, n, r !== void 0, s);
    else if (as(e)) {
      const i = {};
      for (let o in e) i[o] = _s(e[o], t, n, r, s);
      e = i;
    } else e = t(e, r);
    return e;
  }
}
function ws(e, t, n, r, s) {
  const i = r || n ? 0 | e[m] : 0, o = r ? !!(32 & i) : void 0;
  r = le(e);
  for (let a = 0; a < r.length; a++) r[a] = _s(r[a], t, n, o, s);
  return n && ((e = us(e)) && (r[Rt] = le(e)), n(i, r)), r;
}
function n1(e) {
  return _s(e, qo, void 0, void 0, !1);
}
function qo(e) {
  return e.W === ln ? e.toJSON() : e instanceof Le ? e.na(n1) : (function(t) {
    switch (typeof t) {
      case "number":
        return isFinite(t) ? t : String(t);
      case "bigint":
        return Gr(t) ? Number(t) : String(t);
      case "boolean":
        return t ? 1 : 0;
      case "object":
        if (t) if (Array.isArray(t)) {
          if (On(t)) return;
        } else {
          if (un(t)) return gi(t);
          if (t instanceof Xe) {
            const n = t.g;
            return n == null ? "" : typeof n == "string" ? n : t.g = gi(n);
          }
          if (t instanceof Le) return t.na();
        }
    }
    return t;
  })(e);
}
function Ko(e) {
  return ws(e, qo, void 0, void 0, !1);
}
function it(e, t, n) {
  return e = $o(e, t[0], t[1], n ? 1 : 2), t !== zo && n && jn(e, 16384), e;
}
function $o(e, t, n, r) {
  if (e == null) {
    var s = 96;
    n ? (e = [n], s |= 512) : e = [], t && (s = -33521665 & s | (1023 & t) << 15);
  } else {
    if (!Array.isArray(e)) throw Error("narr");
    if (2048 & (s = 0 | e[m])) throw Error("farr");
    if (64 & s) return e;
    if (r === 1 || r === 2 || (s |= 64), n && (s |= 512, n !== e[0])) throw Error("mid");
    e: {
      if (r = (n = e).length) {
        const i = r - 1;
        if (as(n[i])) {
          if ((t = i - (512 & (s |= 256) ? 0 : -1)) >= 1024) throw Error("pvtlmt");
          s = -33521665 & s | (1023 & t) << 15;
          break e;
        }
      }
      if (t) {
        if ((t = Math.max(t, r - (512 & s ? 0 : -1))) > 1024) throw Error("spvt");
        s = -33521665 & s | (1023 & t) << 15;
      }
    }
  }
  return $(e, s), e;
}
function Vr(e, t, n = Br) {
  if (e != null) {
    if (Ro && e instanceof Uint8Array) return t ? e : new Uint8Array(e);
    if (Array.isArray(e)) {
      var r = 0 | e[m];
      return 2 & r ? e : (t && (t = r === 0 || !!(32 & r) && !(64 & r || !(16 & r))), t ? ($(e, -12293 & (34 | r)), e) : ws(e, Vr, 4 & r ? Br : n, !0, !0));
    }
    return e.W === ln ? e = 2 & (r = 0 | (n = e.u)[m]) ? e : new e.constructor($n(n, r, !0)) : e instanceof Le && !(2 & e.L) && (n = jt(e.X(Vr)), e = new Le(n, e.S, e.R, e.Y)), e;
  }
}
function $n(e, t, n) {
  const r = n || 2 & t ? Br : N2, s = !!(32 & t);
  return e = (function(i, o, a) {
    const c = le(i);
    var u = c.length;
    const h = 256 & o ? c[u - 1] : void 0;
    for (u += h ? -1 : 0, o = 512 & o ? 1 : 0; o < u; o++) c[o] = a(c[o]);
    if (h) {
      o = c[o] = {};
      for (const l in h) o[l] = a(h[l]);
    }
    return (i = us(i)) && (c[Rt] = le(i)), c;
  })(e, t, ((i) => Vr(i, s, r))), jn(e, 32 | (n ? 2 : 0)), e;
}
function Xn(e) {
  const t = e.u, n = 0 | t[m];
  return 2 & n ? new e.constructor($n(t, n, !1)) : e;
}
function Nt(e, t) {
  return et(e = e.u, 0 | e[m], t);
}
function et(e, t, n, r) {
  if (n === -1) return null;
  var s = n + (512 & t ? 0 : -1);
  const i = e.length - 1;
  return s >= i && 256 & t ? e[i][n] : r && 256 & t && (t = e[i][n]) != null ? (e[s] != null && vr != null && ((s = (e = R2 ?? (R2 = {}))[vr] || 0) >= 4 || (e[vr] = s + 1, Do(e = Error(), "incident"), (function(o) {
    wt.setTimeout((() => {
      throw o;
    }), 0);
  })(e))), t) : s <= i ? e[s] : void 0;
}
function R(e, t, n) {
  const r = e.u;
  let s = 0 | r[m];
  return ut(s), V(r, s, t, n), e;
}
function V(e, t, n, r) {
  const s = 512 & t ? 0 : -1, i = n + s;
  var o = e.length - 1;
  return i >= o && 256 & t ? (e[o][n] = r, t) : i <= o ? (e[i] = r, 256 & t && n in (e = e[o]) && delete e[n], t) : (r !== void 0 && (n >= (o = t >> 15 & 1023 || 536870912) ? r != null && (e[o + s] = { [n]: r }, $(e, t |= 256)) : e[i] = r), t);
}
function kn(e, t) {
  let n = 0 | (e = e.u)[m];
  const r = et(e, n, t), s = ht(r);
  return s != null && s !== r && V(e, n, t, s), s;
}
function Xo(e) {
  let t = 0 | (e = e.u)[m];
  const n = et(e, t, 1), r = cs(n, !0);
  return r != null && r !== n && V(e, t, 1, r), r;
}
function mt() {
  return D2 === void 0 ? 2 : 4;
}
function yt(e, t, n, r, s) {
  const i = e.u, o = 2 & (e = 0 | i[m]) ? 1 : r;
  s = !!s;
  let a = 0 | (r = vs(i, e, t))[m];
  if (!(4 & a)) {
    4 & a && (r = le(r), a = Ye(a, e), e = V(i, e, t, r));
    let c = 0, u = 0;
    for (; c < r.length; c++) {
      const h = n(r[c]);
      h != null && (r[u++] = h);
    }
    u < c && (r.length = u), a = Es(a, e), n = -4097 & (20 | a), a = n &= -8193, $(r, a), 2 & a && Object.freeze(r);
  }
  return o === 1 || o === 4 && 32 & a ? $e(a) || (s = a, a |= 2, a !== s && $(r, a), Object.freeze(r)) : (o === 2 && $e(a) && (r = le(r), a = Ye(a, e), a = ot(a, e, s), $(r, a), e = V(i, e, t, r)), $e(a) || (t = a, a = ot(a, e, s), a !== t && $(r, a))), r;
}
function vs(e, t, n, r) {
  return e = et(e, t, n, r), Array.isArray(e) ? e : os;
}
function Es(e, t) {
  return e === 0 && (e = Ye(e, t)), 1 | e;
}
function $e(e) {
  return !!(2 & e) && !!(4 & e) || !!(2048 & e);
}
function Yo(e) {
  e = le(e);
  for (let t = 0; t < e.length; t++) {
    const n = e[t] = le(e[t]);
    Array.isArray(n[1]) && (n[1] = jt(n[1]));
  }
  return e;
}
function jr(e, t, n, r) {
  let s = 0 | (e = e.u)[m];
  ut(s), V(e, s, t, (r === "0" ? Number(n) === 0 : n === r) ? void 0 : n);
}
function zt(e, t, n, r, s) {
  ut(t);
  var i = !(!(64 & t) && 16384 & t);
  const o = (s = vs(e, t, n, s)) !== os;
  if (i || !o) {
    let a = i = o ? 0 | s[m] : 0;
    (!o || 2 & a || $e(a) || 4 & a && !(32 & a)) && (s = le(s), a = Ye(a, t), t = V(e, t, n, s)), a = -13 & Es(a, t), a = ot(r ? -17 & a : 16 | a, t, !0), a !== i && $(s, a);
  }
  return s;
}
function Ar(e, t) {
  var n = Ba;
  return As(bs(e = e.u), e, 0 | e[m], n) === t ? t : -1;
}
function bs(e) {
  if (Vn) return e[Jt] ?? (e[Jt] = /* @__PURE__ */ new Map());
  if (Jt in e) return e[Jt];
  const t = /* @__PURE__ */ new Map();
  return Object.defineProperty(e, Jt, { value: t }), t;
}
function Jo(e, t, n, r) {
  const s = bs(e), i = As(s, e, t, n);
  return i !== r && (i && (t = V(e, t, i)), s.set(n, r)), t;
}
function As(e, t, n, r) {
  let s = e.get(r);
  if (s != null) return s;
  s = 0;
  for (let i = 0; i < r.length; i++) {
    const o = r[i];
    et(t, n, o) != null && (s !== 0 && (n = V(t, n, s)), s = o);
  }
  return e.set(r, s), s;
}
function ks(e, t, n, r) {
  let s, i = 0 | e[m];
  if ((r = et(e, i, n, r)) != null && r.W === ln) return (t = Xn(r)) !== r && V(e, i, n, t), t.u;
  if (Array.isArray(r)) {
    const o = 0 | r[m];
    s = 2 & o ? it($n(r, o, !1), t, !0) : 64 & o ? r : it(s, t, !0);
  } else s = it(void 0, t, !0);
  return s !== r && V(e, i, n, s), s;
}
function Zo(e, t, n, r) {
  let s = 0 | (e = e.u)[m];
  return (t = ys(r = et(e, s, n, r), t, !1, s)) !== r && t != null && V(e, s, n, t), t;
}
function T(e, t, n, r = !1) {
  if ((t = Zo(e, t, n, r)) == null) return t;
  if (!(2 & (r = 0 | (e = e.u)[m]))) {
    const s = Xn(t);
    s !== t && V(e, r, n, t = s);
  }
  return t;
}
function Qo(e, t, n, r, s, i, o) {
  e = e.u;
  var a = !!(2 & t);
  const c = a ? 1 : s;
  i = !!i, o && (o = !a);
  var u = 0 | (s = vs(e, t, r))[m];
  if (!(a = !!(4 & u))) {
    var h = s, l = t;
    const b = !!(2 & (u = Es(u, t)));
    b && (l |= 2);
    let x = !b, O = !0, Q = 0, E = 0;
    for (; Q < h.length; Q++) {
      const ne = ys(h[Q], n, !1, l);
      if (ne instanceof n) {
        if (!b) {
          const ie = !!(2 & (0 | ne.u[m]));
          x && (x = !ie), O && (O = ie);
        }
        h[E++] = ne;
      }
    }
    E < Q && (h.length = E), u |= 4, u = O ? 16 | u : -17 & u, $(h, u = x ? 8 | u : -9 & u), b && Object.freeze(h);
  }
  if (o && !(8 & u || !s.length && (c === 1 || c === 4 && 32 & u))) {
    for ($e(u) && (s = le(s), u = Ye(u, t), t = V(e, t, r, s)), n = s, o = u, h = 0; h < n.length; h++) (u = n[h]) !== (l = Xn(u)) && (n[h] = l);
    o |= 8, $(n, o = n.length ? -17 & o : 16 | o), u = o;
  }
  return c === 1 || c === 4 && 32 & u ? $e(u) || (t = u, (u |= !s.length || 16 & u && (!a || 32 & u) ? 2 : 2048) !== t && $(s, u), Object.freeze(s)) : (c === 2 && $e(u) && ($(s = le(s), u = ot(u = Ye(u, t), t, i)), t = V(e, t, r, s)), $e(u) || (r = u, (u = ot(u, t, i)) !== r && $(s, u))), s;
}
function Ze(e, t, n) {
  const r = 0 | e.u[m];
  return Qo(e, r, t, n, mt(), !1, !(2 & r));
}
function y(e, t, n, r) {
  return r == null && (r = void 0), R(e, n, r);
}
function tn(e, t, n, r) {
  r == null && (r = void 0);
  e: {
    let s = 0 | (e = e.u)[m];
    if (ut(s), r == null) {
      const i = bs(e);
      if (As(i, e, s, n) !== t) break e;
      i.set(n, 0);
    } else s = Jo(e, s, n, t);
    V(e, s, t, r);
  }
}
function Ye(e, t) {
  return -2049 & (e = 32 | (2 & t ? 2 | e : -3 & e));
}
function ot(e, t, n) {
  return 32 & t && n || (e &= -33), e;
}
function Cn(e, t, n, r) {
  const s = 0 | e.u[m];
  ut(s), e = Qo(e, s, n, t, 2, !0), r = r ?? new n(), e.push(r), e[m] = 2 & (0 | r.u[m]) ? -9 & e[m] : -17 & e[m];
}
function Se(e, t) {
  return Ht(Nt(e, t));
}
function xe(e, t) {
  return Ct(Nt(e, t));
}
function q(e, t) {
  return kn(e, t) ?? 0;
}
function an(e, t, n) {
  if (n != null && typeof n != "boolean") throw e = typeof n, Error(`Expected boolean but got ${e != "object" ? e : n ? Array.isArray(n) ? "array" : e : "null"}: ${n}`);
  R(e, t, n);
}
function je(e, t, n) {
  if (n != null) {
    if (typeof n != "number" || !qn(n)) throw Ur("int32");
    n |= 0;
  }
  R(e, t, n);
}
function p(e, t, n) {
  if (n != null && typeof n != "number") throw Error(`Value of float/double field must be a number, found ${typeof n}: ${n}`);
  R(e, t, n);
}
function Nn(e, t, n) {
  {
    const o = e.u;
    let a = 0 | o[m];
    if (ut(a), n == null) V(o, a, t);
    else {
      var r = e = 0 | n[m], s = $e(e), i = s || Object.isFrozen(n);
      for (s || (e = 0), i || (n = le(n), r = 0, e = ot(e = Ye(e, a), a, !0), i = !1), e |= 21, s = 0; s < n.length; s++) {
        const c = n[s], u = Wo(c);
        Object.is(c, u) || (i && (n = le(n), r = 0, e = ot(e = Ye(e, a), a, !0), i = !1), n[s] = u);
      }
      e !== r && (i && (n = le(n), e = ot(e = Ye(e, a), a, !0)), $(n, e)), V(o, a, t, n);
    }
  }
}
function Yn(e, t, n) {
  ut(0 | e.u[m]), yt(e, t, Ct, 2, !0).push(Wo(n));
}
function ea(e, t) {
  return Error(`Invalid wire type: ${e} (at position ${t})`);
}
function Ts() {
  return Error("Failed to read varint, encoding is invalid.");
}
function ta(e, t) {
  return Error(`Tried to read past the end of the data ${t} > ${e}`);
}
function Ss(e) {
  if (typeof e == "string") return { buffer: Co(e), N: !1 };
  if (Array.isArray(e)) return { buffer: new Uint8Array(e), N: !1 };
  if (e.constructor === Uint8Array) return { buffer: e, N: !1 };
  if (e.constructor === ArrayBuffer) return { buffer: new Uint8Array(e), N: !1 };
  if (e.constructor === Xe) return { buffer: ss(e) || new Uint8Array(0), N: !0 };
  if (e instanceof Uint8Array) return { buffer: new Uint8Array(e.buffer, e.byteOffset, e.byteLength), N: !1 };
  throw Error("Type not convertible to a Uint8Array, expected a Uint8Array, an ArrayBuffer, a base64 encoded string, a ByteString or an Array of numbers");
}
function Ls(e, t) {
  let n, r = 0, s = 0, i = 0;
  const o = e.h;
  let a = e.g;
  do
    n = o[a++], r |= (127 & n) << i, i += 7;
  while (i < 32 && 128 & n);
  for (i > 32 && (s |= (127 & n) >> 4), i = 3; i < 32 && 128 & n; i += 7) n = o[a++], s |= (127 & n) << i;
  if (_t(e, a), n < 128) return t(r >>> 0, s >>> 0);
  throw Ts();
}
function xs(e) {
  let t = 0, n = e.g;
  const r = n + 10, s = e.h;
  for (; n < r; ) {
    const i = s[n++];
    if (t |= i, (128 & i) == 0) return _t(e, n), !!(127 & t);
  }
  throw Ts();
}
function at(e) {
  const t = e.h;
  let n = e.g, r = t[n++], s = 127 & r;
  if (128 & r && (r = t[n++], s |= (127 & r) << 7, 128 & r && (r = t[n++], s |= (127 & r) << 14, 128 & r && (r = t[n++], s |= (127 & r) << 21, 128 & r && (r = t[n++], s |= r << 28, 128 & r && 128 & t[n++] && 128 & t[n++] && 128 & t[n++] && 128 & t[n++] && 128 & t[n++]))))) throw Ts();
  return _t(e, n), s;
}
function Qe(e) {
  return at(e) >>> 0;
}
function Hr(e) {
  var t = e.h;
  const n = e.g, r = t[n], s = t[n + 1], i = t[n + 2];
  return t = t[n + 3], _t(e, e.g + 4), (r << 0 | s << 8 | i << 16 | t << 24) >>> 0;
}
function Wr(e) {
  var t = Hr(e);
  e = 2 * (t >> 31) + 1;
  const n = t >>> 23 & 255;
  return t &= 8388607, n == 255 ? t ? NaN : e * (1 / 0) : n == 0 ? 1401298464324817e-60 * e * t : e * Math.pow(2, n - 150) * (t + 8388608);
}
function r1(e) {
  return at(e);
}
function kr(e, t, { ba: n = !1 } = {}) {
  e.ba = n, t && (t = Ss(t), e.h = t.buffer, e.m = t.N, e.j = 0, e.l = e.h.length, e.g = e.j);
}
function _t(e, t) {
  if (e.g = t, t > e.l) throw ta(e.l, t);
}
function na(e, t) {
  if (t < 0) throw Error(`Tried to read a negative byte length: ${t}`);
  const n = e.g, r = n + t;
  if (r > e.l) throw ta(t, e.l - n);
  return e.g = r, n;
}
function ra(e, t) {
  if (t == 0) return vt();
  var n = na(e, t);
  return e.ba && e.m ? n = e.h.subarray(n, n + t) : (e = e.h, n = n === (t = n + t) ? new Uint8Array(0) : W2 ? e.slice(n, t) : new Uint8Array(e.subarray(n, t))), n.length == 0 ? vt() : new Xe(n, Pt);
}
Le.prototype.toJSON = void 0, Le.prototype.Ia = Go;
var xi = [];
function sa(e) {
  var t = e.g;
  if (t.g == t.l) return !1;
  e.l = e.g.g;
  var n = Qe(e.g);
  if (t = n >>> 3, !((n &= 7) >= 0 && n <= 5)) throw ea(n, e.l);
  if (t < 1) throw Error(`Invalid field number: ${t} (at position ${e.l})`);
  return e.m = t, e.h = n, !0;
}
function Tn(e) {
  switch (e.h) {
    case 0:
      e.h != 0 ? Tn(e) : xs(e.g);
      break;
    case 1:
      _t(e = e.g, e.g + 8);
      break;
    case 2:
      if (e.h != 2) Tn(e);
      else {
        var t = Qe(e.g);
        _t(e = e.g, e.g + t);
      }
      break;
    case 5:
      _t(e = e.g, e.g + 4);
      break;
    case 3:
      for (t = e.m; ; ) {
        if (!sa(e)) throw Error("Unmatched start-group tag: stream EOF");
        if (e.h == 4) {
          if (e.m != t) throw Error("Unmatched end-group tag");
          break;
        }
        Tn(e);
      }
      break;
    default:
      throw ea(e.h, e.l);
  }
}
function fn(e, t, n) {
  const r = e.g.l, s = Qe(e.g), i = e.g.g + s;
  let o = i - r;
  if (o <= 0 && (e.g.l = i, n(t, e, void 0, void 0, void 0), o = i - e.g.g), o) throw Error(`Message parsing ended unexpectedly. Expected to read ${s} bytes, instead read ${s - o} bytes, either the data ended unexpectedly or the message misreported its own length`);
  return e.g.g = i, e.g.l = r, t;
}
function Ms(e) {
  var t = Qe(e.g), n = na(e = e.g, t);
  if (e = e.h, T2) {
    var r, s = e;
    (r = mr) || (r = mr = new TextDecoder("utf-8", { fatal: !0 })), t = n + t, s = n === 0 && t === s.length ? s : s.subarray(n, t);
    try {
      var i = r.decode(s);
    } catch (a) {
      if (wn === void 0) {
        try {
          r.decode(new Uint8Array([128]));
        } catch {
        }
        try {
          r.decode(new Uint8Array([97])), wn = !0;
        } catch {
          wn = !1;
        }
      }
      throw !wn && (mr = void 0), a;
    }
  } else {
    t = (i = n) + t, n = [];
    let a, c = null;
    for (; i < t; ) {
      var o = e[i++];
      o < 128 ? n.push(o) : o < 224 ? i >= t ? pt() : (a = e[i++], o < 194 || (192 & a) != 128 ? (i--, pt()) : n.push((31 & o) << 6 | 63 & a)) : o < 240 ? i >= t - 1 ? pt() : (a = e[i++], (192 & a) != 128 || o === 224 && a < 160 || o === 237 && a >= 160 || (192 & (r = e[i++])) != 128 ? (i--, pt()) : n.push((15 & o) << 12 | (63 & a) << 6 | 63 & r)) : o <= 244 ? i >= t - 2 ? pt() : (a = e[i++], (192 & a) != 128 || a - 144 + (o << 28) >> 30 != 0 || (192 & (r = e[i++])) != 128 || (192 & (s = e[i++])) != 128 ? (i--, pt()) : (o = (7 & o) << 18 | (63 & a) << 12 | (63 & r) << 6 | 63 & s, o -= 65536, n.push(55296 + (o >> 10 & 1023), 56320 + (1023 & o)))) : pt(), n.length >= 8192 && (c = li(c, n), n.length = 0);
    }
    i = li(c, n);
  }
  return i;
}
function ia(e) {
  const t = Qe(e.g);
  return ra(e.g, t);
}
function Jn(e, t, n) {
  var r = Qe(e.g);
  for (r = e.g.g + r; e.g.g < r; ) n.push(t(e.g));
}
var vn = [];
function s1(e) {
  return e;
}
let xt;
function Pe(e, t, n) {
  t.g ? t.m(e, t.g, t.h, n) : t.m(e, t.h, n);
}
var d = class {
  constructor(e, t) {
    this.u = $o(e, t);
  }
  toJSON() {
    const e = !xt;
    try {
      return e && (xt = Ko), oa(this);
    } finally {
      e && (xt = void 0);
    }
  }
  l() {
    var e = G1;
    return e.g ? e.l(this, e.g, e.h, !0) : e.l(this, e.h, e.defaultValue, !0);
  }
  clone() {
    const e = this.u;
    return new this.constructor($n(e, 0 | e[m], !1));
  }
  N() {
    return !!(2 & (0 | this.u[m]));
  }
};
function oa(e) {
  var t = e.u;
  {
    t = (e = xt(t)) !== t;
    let u = e.length;
    if (u) {
      var n = e[u - 1], r = as(n);
      r ? u-- : n = void 0;
      var s = e;
      if (r) {
        e: {
          var i, o = n, a = !1;
          if (o) for (let h in o) isNaN(+h) ? (i ?? (i = {}))[h] = o[h] : (r = o[h], Array.isArray(r) && (On(r) || _i(r) && r.size === 0) && (r = null), r == null && (a = !0), r != null && ((i ?? (i = {}))[h] = r));
          if (a || (i = o), i) for (let h in i) {
            a = i;
            break e;
          }
          a = null;
        }
        o = a == null ? n != null : a !== n;
      }
      for (; u > 0 && ((i = s[u - 1]) == null || On(i) || _i(i) && i.size === 0); u--) var c = !0;
      (s !== e || o || c) && (t ? (c || o || a) && (s.length = u) : s = Array.prototype.slice.call(s, 0, u), a && s.push(a)), c = s;
    } else c = e;
  }
  return c;
}
function Mi(e) {
  return e ? /^\d+$/.test(e) ? (zn(e), new zr(P, H)) : null : i1 || (i1 = new zr(0, 0));
}
d.prototype.W = ln, d.prototype.toString = function() {
  try {
    return xt = s1, oa(this).toString();
  } finally {
    xt = void 0;
  }
};
var zr = class {
  constructor(e, t) {
    this.h = e >>> 0, this.g = t >>> 0;
  }
};
let i1;
function Fi(e) {
  return e ? /^-?\d+$/.test(e) ? (zn(e), new qr(P, H)) : null : o1 || (o1 = new qr(0, 0));
}
var qr = class {
  constructor(e, t) {
    this.h = e >>> 0, this.g = t >>> 0;
  }
};
let o1;
function Mt(e, t, n) {
  for (; n > 0 || t > 127; ) e.g.push(127 & t | 128), t = (t >>> 7 | n << 25) >>> 0, n >>>= 7;
  e.g.push(t);
}
function qt(e, t) {
  for (; t > 127; ) e.g.push(127 & t | 128), t >>>= 7;
  e.g.push(t);
}
function Zn(e, t) {
  if (t >= 0) qt(e, t);
  else {
    for (let n = 0; n < 9; n++) e.g.push(127 & t | 128), t >>= 7;
    e.g.push(1);
  }
}
function cn(e, t) {
  e.g.push(t >>> 0 & 255), e.g.push(t >>> 8 & 255), e.g.push(t >>> 16 & 255), e.g.push(t >>> 24 & 255);
}
function Dt(e, t) {
  t.length !== 0 && (e.l.push(t), e.h += t.length);
}
function ve(e, t, n) {
  qt(e.g, 8 * t + n);
}
function Fs(e, t) {
  return ve(e, t, 2), t = e.g.end(), Dt(e, t), t.push(e.h), t;
}
function Os(e, t) {
  var n = t.pop();
  for (n = e.h + e.g.length() - n; n > 127; ) t.push(127 & n | 128), n >>>= 7, e.h++;
  t.push(n), e.h++;
}
function Qn(e, t, n) {
  ve(e, t, 2), qt(e.g, n.length), Dt(e, e.g.end()), Dt(e, n);
}
function Dn(e, t, n, r) {
  n != null && (t = Fs(e, t), r(n, e), Os(e, t));
}
function Re() {
  const e = class {
    constructor() {
      throw Error();
    }
  };
  return Object.setPrototypeOf(e, e.prototype), e;
}
var Ps = Re(), aa = Re(), Rs = Re(), Is = Re(), ca = Re(), ua = Re(), Cs = Re(), ha = Re(), la = Re(), Kt = class {
  constructor(e, t, n) {
    this.g = e, this.h = t, e = Ps, this.l = !!e && n === e || !1;
  }
};
function er(e, t) {
  return new Kt(e, t, Ps);
}
function fa(e, t, n, r, s) {
  Dn(e, n, ma(t, r), s);
}
const a1 = er((function(e, t, n, r, s) {
  return e.h === 2 && (fn(e, ks(t, r, n), s), !0);
}), fa), c1 = er((function(e, t, n, r, s) {
  return e.h === 2 && (fn(e, ks(t, r, n, !0), s), !0);
}), fa);
var tr = Symbol(), Ns = Symbol(), Oi = Symbol(), Pi = Symbol();
let da, pa;
function Et(e, t, n, r) {
  var s = r[e];
  if (s) return s;
  (s = {}).Pa = r, s.V = (function(l) {
    switch (typeof l) {
      case "boolean":
        return zo || (zo = [0, void 0, !0]);
      case "number":
        return l > 0 ? void 0 : l === 0 ? t1 || (t1 = [0, void 0]) : [-l, void 0];
      case "string":
        return [0, l];
      case "object":
        return l;
    }
  })(r[0]);
  var i = r[1];
  let o = 1;
  i && i.constructor === Object && (s.ga = i, typeof (i = r[++o]) == "function" && (s.la = !0, da ?? (da = i), pa ?? (pa = r[o + 1]), i = r[o += 2]));
  const a = {};
  for (; i && Array.isArray(i) && i.length && typeof i[0] == "number" && i[0] > 0; ) {
    for (var c = 0; c < i.length; c++) a[i[c]] = i;
    i = r[++o];
  }
  for (c = 1; i !== void 0; ) {
    let l;
    typeof i == "number" && (c += i, i = r[++o]);
    var u = void 0;
    if (i instanceof Kt ? l = i : (l = a1, o--), l == null ? void 0 : l.l) {
      i = r[++o], u = r;
      var h = o;
      typeof i == "function" && (i = i(), u[h] = i), u = i;
    }
    for (h = c + 1, typeof (i = r[++o]) == "number" && i < 0 && (h -= i, i = r[++o]); c < h; c++) {
      const b = a[c];
      u ? n(s, c, l, u, b) : t(s, c, l, b);
    }
  }
  return r[e] = s;
}
function ga(e) {
  return Array.isArray(e) ? e[0] instanceof Kt ? e : [c1, e] : [e, void 0];
}
function ma(e, t) {
  return e instanceof d ? e.u : Array.isArray(e) ? it(e, t, !1) : void 0;
}
function Ds(e, t, n, r) {
  const s = n.g;
  e[t] = r ? (i, o, a) => s(i, o, a, r) : s;
}
function Us(e, t, n, r, s) {
  const i = n.g;
  let o, a;
  e[t] = (c, u, h) => i(c, u, h, a || (a = Et(Ns, Ds, Us, r).V), o || (o = Bs(r)), s);
}
function Bs(e) {
  let t = e[Oi];
  if (t != null) return t;
  const n = Et(Ns, Ds, Us, e);
  return t = n.la ? (r, s) => da(r, s, n) : (r, s) => {
    const i = 0 | r[m];
    for (; sa(s) && s.h != 4; ) {
      var o = s.m, a = n[o];
      if (a == null) {
        var c = n.ga;
        c && (c = c[o]) && (c = u1(c)) != null && (a = n[o] = c);
      }
      a != null && a(s, r, o) || (o = (a = s).l, Tn(a), a.fa ? a = void 0 : (c = a.g.g - o, a.g.g = o, a = ra(a.g, c)), o = r, a && ((c = o[Rt]) ? c.push(a) : o[Rt] = [a]));
    }
    return 16384 & i && jt(r), !0;
  }, e[Oi] = t;
}
function u1(e) {
  const t = (e = ga(e))[0].g;
  if (e = e[1]) {
    const n = Bs(e), r = Et(Ns, Ds, Us, e).V;
    return (s, i, o) => t(s, i, o, r, n);
  }
  return t;
}
function nr(e, t, n) {
  e[t] = n.h;
}
function rr(e, t, n, r) {
  let s, i;
  const o = n.h;
  e[t] = (a, c, u) => o(a, c, u, i || (i = Et(tr, nr, rr, r).V), s || (s = ya(r)));
}
function ya(e) {
  let t = e[Pi];
  if (!t) {
    const n = Et(tr, nr, rr, e);
    t = (r, s) => _a(r, s, n), e[Pi] = t;
  }
  return t;
}
function _a(e, t, n) {
  for (var r = 0 | e[m], s = 512 & r ? 0 : -1, i = e.length, o = 512 & r ? 1 : 0, a = i + (256 & r ? -1 : 0); o < a; o++) {
    const c = e[o];
    if (c == null) continue;
    const u = o - s, h = Ri(n, u);
    h && h(t, c, u);
  }
  if (256 & r) {
    r = e[i - 1];
    for (const c in r) s = +c, Number.isNaN(s) || (i = r[s]) != null && (a = Ri(n, s)) && a(t, i, s);
  }
  if (e = us(e)) for (Dt(t, t.g.end()), n = 0; n < e.length; n++) Dt(t, ss(e[n]) || new Uint8Array(0));
}
function Ri(e, t) {
  var n = e[t];
  if (n) return n;
  if ((n = e.ga) && (n = n[t])) {
    var r = (n = ga(n))[0].h;
    if (n = n[1]) {
      const s = ya(n), i = Et(tr, nr, rr, n).V;
      n = e.la ? pa(i, s) : (o, a, c) => r(o, a, c, i, s);
    } else n = r;
    return e[t] = n;
  }
}
function $t(e, t) {
  if (Array.isArray(t)) {
    var n = 0 | t[m];
    if (4 & n) return t;
    for (var r = 0, s = 0; r < t.length; r++) {
      const i = e(t[r]);
      i != null && (t[s++] = i);
    }
    return s < r && (t.length = s), $(t, -12289 & (5 | n)), 2 & n && Object.freeze(t), t;
  }
}
function ce(e, t, n) {
  return new Kt(e, t, n);
}
function Xt(e, t, n) {
  return new Kt(e, t, n);
}
function ue(e, t, n) {
  V(e, 0 | e[m], t, n);
}
var h1 = er((function(e, t, n, r, s) {
  return e.h === 2 && (e = fn(e, it([void 0, void 0], r, !0), s), ut(r = 0 | t[m]), (s = et(t, r, n)) instanceof Le ? (2 & s.L) != 0 ? ((s = s.X()).push(e), V(t, r, n, s)) : s.Na(e) : Array.isArray(s) ? (2 & (0 | s[m]) && V(t, r, n, s = Yo(s)), s.push(e)) : V(t, r, n, [e]), !0);
}), (function(e, t, n, r, s) {
  if (t instanceof Le) t.forEach(((i, o) => {
    Dn(e, n, it([o, i], r, !1), s);
  }));
  else if (Array.isArray(t)) for (let i = 0; i < t.length; i++) {
    const o = t[i];
    Array.isArray(o) && Dn(e, n, it(o, r, !1), s);
  }
}));
function wa(e, t, n) {
  if (t = (function(r) {
    if (r == null) return r;
    const s = typeof r;
    if (s === "bigint") return String(ps(64, r));
    if (Kn(r)) {
      if (s === "string") return ms(r);
      if (s === "number") return gs(r);
    }
  })(t), t != null && (typeof t == "string" && Fi(t), t != null))
    switch (ve(e, n, 0), typeof t) {
      case "number":
        e = e.g, It(t), Mt(e, P, H);
        break;
      case "bigint":
        n = BigInt.asUintN(64, t), n = new qr(Number(n & BigInt(4294967295)), Number(n >> BigInt(32))), Mt(e.g, n.h, n.g);
        break;
      default:
        n = Fi(t), Mt(e.g, n.h, n.g);
    }
}
function va(e, t, n) {
  (t = Ht(t)) != null && t != null && (ve(e, n, 0), Zn(e.g, t));
}
function Ea(e, t, n) {
  (t = jo(t)) != null && (ve(e, n, 0), e.g.g.push(t ? 1 : 0));
}
function ba(e, t, n) {
  (t = Ct(t)) != null && Qn(e, n, Fo(t));
}
function Aa(e, t, n, r, s) {
  Dn(e, n, ma(t, r), s);
}
function ka(e, t, n) {
  (t = t == null || typeof t == "string" || un(t) || t instanceof Xe ? t : void 0) != null && Qn(e, n, Ss(t).buffer);
}
function Ta(e, t, n) {
  return (e.h === 5 || e.h === 2) && (t = zt(t, 0 | t[m], n, !1, !1), e.h == 2 ? Jn(e, Wr, t) : t.push(Wr(e.g)), !0);
}
var ze = ce((function(e, t, n) {
  if (e.h !== 1) return !1;
  var r = e.g;
  e = Hr(r);
  const s = Hr(r);
  r = 2 * (s >> 31) + 1;
  const i = s >>> 20 & 2047;
  return e = 4294967296 * (1048575 & s) + e, ue(t, n, i == 2047 ? e ? NaN : r * (1 / 0) : i == 0 ? 5e-324 * r * e : r * Math.pow(2, i - 1075) * (e + 4503599627370496)), !0;
}), (function(e, t, n) {
  (t = ht(t)) != null && (ve(e, n, 1), e = e.g, (n = Vo || (Vo = new DataView(new ArrayBuffer(8)))).setFloat64(0, +t, !0), P = n.getUint32(0, !0), H = n.getUint32(4, !0), cn(e, P), cn(e, H));
}), Re()), X = ce((function(e, t, n) {
  return e.h === 5 && (ue(t, n, Wr(e.g)), !0);
}), (function(e, t, n) {
  (t = ht(t)) != null && (ve(e, n, 5), e = e.g, hs(t), cn(e, P));
}), Cs), l1 = Xt(Ta, (function(e, t, n) {
  if ((t = $t(ht, t)) != null) for (let o = 0; o < t.length; o++) {
    var r = e, s = n, i = t[o];
    i != null && (ve(r, s, 5), r = r.g, hs(i), cn(r, P));
  }
}), Cs), Gs = Xt(Ta, (function(e, t, n) {
  if ((t = $t(ht, t)) != null && t.length) {
    ve(e, n, 2), qt(e.g, 4 * t.length);
    for (let r = 0; r < t.length; r++) n = e.g, hs(t[r]), cn(n, P);
  }
}), Cs), ct = ce((function(e, t, n) {
  return e.h === 0 && (ue(t, n, Ls(e.g, fs)), !0);
}), wa, ua), Tr = ce((function(e, t, n) {
  return e.h === 0 && (ue(t, n, (e = Ls(e.g, fs)) === 0 ? void 0 : e), !0);
}), wa, ua), f1 = ce((function(e, t, n) {
  return e.h === 0 && (ue(t, n, Ls(e.g, ls)), !0);
}), (function(e, t, n) {
  if ((t = K2(t)) != null && (typeof t == "string" && Mi(t), t != null))
    switch (ve(e, n, 0), typeof t) {
      case "number":
        e = e.g, It(t), Mt(e, P, H);
        break;
      case "bigint":
        n = BigInt.asUintN(64, t), n = new zr(Number(n & BigInt(4294967295)), Number(n >> BigInt(32))), Mt(e.g, n.h, n.g);
        break;
      default:
        n = Mi(t), Mt(e.g, n.h, n.g);
    }
}), Re()), W = ce((function(e, t, n) {
  return e.h === 0 && (ue(t, n, at(e.g)), !0);
}), va, Is), sr = Xt((function(e, t, n) {
  return (e.h === 0 || e.h === 2) && (t = zt(t, 0 | t[m], n, !1, !1), e.h == 2 ? Jn(e, at, t) : t.push(at(e.g)), !0);
}), (function(e, t, n) {
  if ((t = $t(Ht, t)) != null && t.length) {
    n = Fs(e, n);
    for (let r = 0; r < t.length; r++) Zn(e.g, t[r]);
    Os(e, n);
  }
}), Is), St = ce((function(e, t, n) {
  return e.h === 0 && (ue(t, n, (e = at(e.g)) === 0 ? void 0 : e), !0);
}), va, Is), D = ce((function(e, t, n) {
  return e.h === 0 && (ue(t, n, xs(e.g)), !0);
}), Ea, aa), Ft = ce((function(e, t, n) {
  return e.h === 0 && (ue(t, n, (e = xs(e.g)) === !1 ? void 0 : e), !0);
}), Ea, aa), se = Xt((function(e, t, n) {
  return e.h === 2 && (e = Ms(e), zt(t, 0 | t[m], n, !1).push(e), !0);
}), (function(e, t, n) {
  if ((t = $t(Ct, t)) != null) for (let o = 0; o < t.length; o++) {
    var r = e, s = n, i = t[o];
    i != null && Qn(r, s, Fo(i));
  }
}), Rs), st = ce((function(e, t, n) {
  return e.h === 2 && (ue(t, n, (e = Ms(e)) === "" ? void 0 : e), !0);
}), ba, Rs), M = ce((function(e, t, n) {
  return e.h === 2 && (ue(t, n, Ms(e)), !0);
}), ba, Rs), Z = (function(e, t, n = Ps) {
  return new Kt(e, t, n);
})((function(e, t, n, r, s) {
  return e.h === 2 && (r = it(void 0, r, !0), zt(t, 0 | t[m], n, !0).push(r), fn(e, r, s), !0);
}), (function(e, t, n, r, s) {
  if (Array.isArray(t)) for (let i = 0; i < t.length; i++) Aa(e, t[i], n, r, s);
})), F = er((function(e, t, n, r, s, i) {
  return e.h === 2 && (Jo(t, 0 | t[m], i, n), fn(e, t = ks(t, r, n), s), !0);
}), Aa), Sa = ce((function(e, t, n) {
  return e.h === 2 && (ue(t, n, ia(e)), !0);
}), ka, ha), d1 = Xt((function(e, t, n) {
  return (e.h === 0 || e.h === 2) && (t = zt(t, 0 | t[m], n, !1, !1), e.h == 2 ? Jn(e, Qe, t) : t.push(Qe(e.g)), !0);
}), (function(e, t, n) {
  if ((t = $t(Ho, t)) != null) for (let o = 0; o < t.length; o++) {
    var r = e, s = n, i = t[o];
    i != null && (ve(r, s, 0), qt(r.g, i));
  }
}), ca), p1 = ce((function(e, t, n) {
  return e.h === 0 && (ue(t, n, (e = Qe(e.g)) === 0 ? void 0 : e), !0);
}), (function(e, t, n) {
  (t = Ho(t)) != null && t != null && (ve(e, n, 0), qt(e.g, t));
}), ca), Me = ce((function(e, t, n) {
  return e.h === 0 && (ue(t, n, at(e.g)), !0);
}), (function(e, t, n) {
  (t = Ht(t)) != null && (t = parseInt(t, 10), ve(e, n, 0), Zn(e.g, t));
}), la);
class g1 {
  constructor(t, n) {
    this.h = t, this.g = n, this.l = T, this.m = y, this.defaultValue = void 0;
  }
}
function Ie(e, t) {
  return new g1(e, t);
}
function lt(e, t) {
  return (n, r) => {
    if (vn.length) {
      const i = vn.pop();
      i.o(r), kr(i.g, n, r), n = i;
    } else n = new class {
      constructor(i, o) {
        if (xi.length) {
          const a = xi.pop();
          kr(a, i, o), i = a;
        } else i = new class {
          constructor(a, c) {
            this.h = null, this.m = !1, this.g = this.l = this.j = 0, kr(this, a, c);
          }
          clear() {
            this.h = null, this.m = !1, this.g = this.l = this.j = 0, this.ba = !1;
          }
        }(i, o);
        this.g = i, this.l = this.g.g, this.h = this.m = -1, this.o(o);
      }
      o({ fa: i = !1 } = {}) {
        this.fa = i;
      }
    }(n, r);
    try {
      const i = new e(), o = i.u;
      Bs(t)(o, n);
      var s = i;
    } finally {
      n.g.clear(), n.m = -1, n.h = -1, vn.length < 100 && vn.push(n);
    }
    return s;
  };
}
function ir(e) {
  return function() {
    const t = new class {
      constructor() {
        this.l = [], this.h = 0, this.g = new class {
          constructor() {
            this.g = [];
          }
          length() {
            return this.g.length;
          }
          end() {
            const o = this.g;
            return this.g = [], o;
          }
        }();
      }
    }();
    _a(this.u, t, Et(tr, nr, rr, e)), Dt(t, t.g.end());
    const n = new Uint8Array(t.h), r = t.l, s = r.length;
    let i = 0;
    for (let o = 0; o < s; o++) {
      const a = r[o];
      n.set(a, i), i += a.length;
    }
    return t.l = [n], n;
  };
}
var Ii = class extends d {
  constructor(e) {
    super(e);
  }
}, Ci = [0, st, ce((function(e, t, n) {
  return e.h === 2 && (ue(t, n, (e = ia(e)) === vt() ? void 0 : e), !0);
}), (function(e, t, n) {
  if (t != null) {
    if (t instanceof d) {
      const r = t.Ra;
      return void (r && (t = r(t), t != null && Qn(e, n, Ss(t).buffer)));
    }
    if (Array.isArray(t)) return;
  }
  ka(e, t, n);
}), ha)];
let Sr, Ni = globalThis.trustedTypes;
function Di(e) {
  Sr === void 0 && (Sr = (function() {
    let n = null;
    if (!Ni) return n;
    try {
      const r = (s) => s;
      n = Ni.createPolicy("goog#html", { createHTML: r, createScript: r, createScriptURL: r });
    } catch {
    }
    return n;
  })());
  var t = Sr;
  return new class {
    constructor(n) {
      this.g = n;
    }
    toString() {
      return this.g + "";
    }
  }(t ? t.createScriptURL(e) : e);
}
function m1(e, ...t) {
  if (t.length === 0) return Di(e[0]);
  let n = e[0];
  for (let r = 0; r < t.length; r++) n += encodeURIComponent(t[r]) + e[r + 1];
  return Di(n);
}
var La = [0, W, Me, D, -1, sr, Me, -1], y1 = class extends d {
  constructor(e) {
    super(e);
  }
}, xa = [0, D, M, D, Me, -1, Xt((function(e, t, n) {
  return (e.h === 0 || e.h === 2) && (t = zt(t, 0 | t[m], n, !1, !1), e.h == 2 ? Jn(e, r1, t) : t.push(at(e.g)), !0);
}), (function(e, t, n) {
  if ((t = $t(Ht, t)) != null && t.length) {
    n = Fs(e, n);
    for (let r = 0; r < t.length; r++) Zn(e.g, t[r]);
    Os(e, n);
  }
}), la), M, -1, [0, D, -1], Me, D, -1], Ma = [0, M, -2], Ui = class extends d {
  constructor(e) {
    super(e);
  }
}, Fa = [0], Oa = [0, W, D, 1, D, -3], we = class extends d {
  constructor(e) {
    super(e, 2);
  }
}, Y = {};
Y[336783863] = [0, M, D, -1, W, [0, [1, 2, 3, 4, 5, 6, 7, 8], F, Fa, F, xa, F, Ma, F, Oa, F, La, F, [0, M, -2], F, [0, M, Me], F, [0, Me, M]], [0, M], D, [0, [1, 3], [2, 4], F, [0, sr], -1, F, [0, se], -1, Z, [0, M, -1]], M];
var Bi = [0, Tr, -1, Ft, -3, Tr, sr, st, St, Tr, -1, Ft, St, Ft, -2, st];
function Ee(e, t) {
  jr(e, 2, Wt(t), "");
}
function I(e, t) {
  Yn(e, 3, t);
}
function k(e, t) {
  Yn(e, 4, t);
}
var ae = class extends d {
  constructor(e) {
    super(e, 500);
  }
  o(e) {
    return y(this, 0, 7, e);
  }
}, nn = [-1, {}], Gi = [0, M, 1, nn], Vi = [0, M, se, nn];
function be(e, t) {
  Cn(e, 1, ae, t);
}
function C(e, t) {
  Yn(e, 10, t);
}
function L(e, t) {
  Yn(e, 15, t);
}
var de = class extends d {
  constructor(e) {
    super(e, 500);
  }
  o(e) {
    return y(this, 0, 1001, e);
  }
}, Pa = [-500, Z, [-500, st, -1, se, -3, [-2, Y, D], Z, Ci, St, -1, Gi, Vi, Z, [0, st, Ft], st, Bi, St, se, 987, se], 4, Z, [-500, M, -1, [-1, {}], 998, M], Z, [-500, M, se, -1, [-2, {}, D], 997, se, -1], St, Z, [-500, M, se, nn, 998, se], se, St, Gi, Vi, Z, [0, st, -1, nn], se, -2, Bi, st, -1, Ft, [0, Ft, p1], 978, nn, Z, Ci];
de.prototype.g = ir(Pa);
var _1 = lt(de, Pa), w1 = class extends d {
  constructor(e) {
    super(e);
  }
}, Ra = class extends d {
  constructor(e) {
    super(e);
  }
  g() {
    return Ze(this, w1, 1);
  }
}, Ia = [0, Z, [0, W, X, M, -1]], or = lt(Ra, Ia), v1 = class extends d {
  constructor(e) {
    super(e);
  }
}, E1 = class extends d {
  constructor(e) {
    super(e);
  }
}, Lr = class extends d {
  constructor(e) {
    super(e);
  }
  h() {
    return T(this, v1, 2);
  }
  g() {
    return Ze(this, E1, 5);
  }
}, Ca = lt(class extends d {
  constructor(e) {
    super(e);
  }
}, [0, se, sr, Gs, [0, Me, [0, W, -3], [0, X, -3], [0, W, -1, [0, Z, [0, W, -2]]], Z, [0, X, -1, M, X]], M, -1, ct, Z, [0, W, X], se, ct]), Na = class extends d {
  constructor(e) {
    super(e);
  }
}, Ot = lt(class extends d {
  constructor(e) {
    super(e);
  }
}, [0, Z, [0, X, -4]]), Da = class extends d {
  constructor(e) {
    super(e);
  }
}, dn = lt(class extends d {
  constructor(e) {
    super(e);
  }
}, [0, Z, [0, X, -4]]), b1 = class extends d {
  constructor(e) {
    super(e);
  }
}, A1 = [0, W, -1, Gs, Me], Ua = class extends d {
  constructor(e) {
    super(e);
  }
};
Ua.prototype.g = ir([0, X, -4, ct]);
var k1 = class extends d {
  constructor(e) {
    super(e);
  }
}, T1 = lt(class extends d {
  constructor(e) {
    super(e);
  }
}, [0, Z, [0, 1, W, M, Ia], ct]), ji = class extends d {
  constructor(e) {
    super(e);
  }
}, S1 = class extends d {
  constructor(e) {
    super(e);
  }
  oa() {
    const e = Xo(this);
    return e ?? vt();
  }
}, L1 = class extends d {
  constructor(e) {
    super(e);
  }
}, Ba = [1, 2], x1 = lt(class extends d {
  constructor(e) {
    super(e);
  }
}, [0, Z, [0, Ba, F, [0, Gs], F, [0, Sa], W, M], ct]), Vs = class extends d {
  constructor(e) {
    super(e);
  }
}, Ga = [0, M, W, X, se, -1], Hi = class extends d {
  constructor(e) {
    super(e);
  }
}, M1 = [0, D, -1], Wi = class extends d {
  constructor(e) {
    super(e);
  }
}, Sn = [1, 2, 3, 4, 5], Un = class extends d {
  constructor(e) {
    super(e);
  }
  g() {
    return Xo(this) != null;
  }
  h() {
    return xe(this, 2) != null;
  }
}, U = class extends d {
  constructor(e) {
    super(e);
  }
  g() {
    return jo(Nt(this, 2)) ?? !1;
  }
}, Va = [0, Sa, M, [0, W, ct, -1], [0, f1, ct]], K = [0, Va, D, [0, Sn, F, Oa, F, xa, F, La, F, Fa, F, Ma], Me], ar = class extends d {
  constructor(e) {
    super(e);
  }
}, js = [0, K, X, -1, W], F1 = Ie(502141897, ar);
Y[502141897] = js;
var O1 = lt(class extends d {
  constructor(e) {
    super(e);
  }
}, [0, [0, Me, -1, l1, d1], A1]), ja = class extends d {
  constructor(e) {
    super(e);
  }
}, Ha = class extends d {
  constructor(e) {
    super(e);
  }
}, Hs = [0, K, X, [0, K], D], Wa = [0, K, js, Hs, X, [0, [0, Va]]], P1 = Ie(508968150, Ha);
Y[508968150] = Wa, Y[508968149] = Hs;
var za = class extends d {
  constructor(e) {
    super(e);
  }
}, R1 = Ie(513916220, za);
Y[513916220] = [0, K, Wa, W];
var kt = class extends d {
  constructor(e) {
    super(e);
  }
  h() {
    return T(this, Vs, 2);
  }
  g() {
    R(this, 2);
  }
}, qa = [0, K, Ga];
Y[478825465] = qa;
var I1 = class extends d {
  constructor(e) {
    super(e);
  }
}, Ka = class extends d {
  constructor(e) {
    super(e);
  }
}, Ws = class extends d {
  constructor(e) {
    super(e);
  }
}, zs = class extends d {
  constructor(e) {
    super(e);
  }
}, $a = class extends d {
  constructor(e) {
    super(e);
  }
}, zi = [0, K, [0, K], qa, -1], Xa = [0, K, X, W], qs = [0, K, X], Ya = [0, K, Xa, qs, X], C1 = Ie(479097054, $a);
Y[479097054] = [0, K, Ya, zi], Y[463370452] = zi, Y[464864288] = Xa;
var N1 = Ie(462713202, zs);
Y[462713202] = Ya, Y[474472470] = qs;
var D1 = class extends d {
  constructor(e) {
    super(e);
  }
}, Ja = class extends d {
  constructor(e) {
    super(e);
  }
}, Za = class extends d {
  constructor(e) {
    super(e);
  }
}, Qa = class extends d {
  constructor(e) {
    super(e);
  }
}, Ks = [0, K, X, -1, W], Kr = [0, K, X, D];
Qa.prototype.g = ir([0, K, qs, [0, K], js, Hs, Ks, Kr]);
var e2 = class extends d {
  constructor(e) {
    super(e);
  }
}, U1 = Ie(456383383, e2);
Y[456383383] = [0, K, Ga];
var t2 = class extends d {
  constructor(e) {
    super(e);
  }
}, B1 = Ie(476348187, t2);
Y[476348187] = [0, K, M1];
var n2 = class extends d {
  constructor(e) {
    super(e);
  }
}, qi = class extends d {
  constructor(e) {
    super(e);
  }
}, r2 = [0, Me, -1], G1 = Ie(458105876, class extends d {
  constructor(e) {
    super(e);
  }
  g() {
    var e = this.u;
    const t = 0 | e[m], n = 2 & t;
    return e = (function(r, s, i) {
      var o = qi;
      const a = 2 & s;
      let c = !1;
      if (i == null) {
        if (a) return Li();
        i = [];
      } else if (i.constructor === Le) {
        if ((2 & i.L) == 0 || a) return i;
        i = i.X();
      } else Array.isArray(i) ? c = !!(2 & (0 | i[m])) : i = [];
      if (a) {
        if (!i.length) return Li();
        c || (c = !0, jt(i));
      } else c && (c = !1, i = Yo(i));
      return c || (64 & (0 | i[m]) ? i[m] &= -33 : 32 & s && jn(i, 32)), V(r, s, 2, o = new Le(i, o, $2, void 0)), o;
    })(e, t, et(e, t, 2)), !n && qi && (e.ra = !0), e;
  }
});
Y[458105876] = [0, r2, h1, [!0, ct, [0, M, -1, se]]];
var $s = class extends d {
  constructor(e) {
    super(e);
  }
}, s2 = Ie(458105758, $s);
Y[458105758] = [0, K, M, r2];
var i2 = class extends d {
  constructor(e) {
    super(e);
  }
}, V1 = Ie(443442058, i2);
Y[443442058] = [0, K, M, W, X, se, -1, D, X], Y[514774813] = Ks;
var o2 = class extends d {
  constructor(e) {
    super(e);
  }
}, j1 = Ie(516587230, o2);
function $r(e, t) {
  return t = t ? t.clone() : new Vs(), e.displayNamesLocale !== void 0 ? R(t, 1, Wt(e.displayNamesLocale)) : e.displayNamesLocale === void 0 && R(t, 1), e.maxResults !== void 0 ? je(t, 2, e.maxResults) : "maxResults" in e && R(t, 2), e.scoreThreshold !== void 0 ? p(t, 3, e.scoreThreshold) : "scoreThreshold" in e && R(t, 3), e.categoryAllowlist !== void 0 ? Nn(t, 4, e.categoryAllowlist) : "categoryAllowlist" in e && R(t, 4), e.categoryDenylist !== void 0 ? Nn(t, 5, e.categoryDenylist) : "categoryDenylist" in e && R(t, 5), t;
}
function Xs(e, t = -1, n = "") {
  return { categories: e.map(((r) => ({ index: Se(r, 1) ?? 0 ?? -1, score: q(r, 2) ?? 0, categoryName: xe(r, 3) ?? "" ?? "", displayName: xe(r, 4) ?? "" ?? "" }))), headIndex: t, headName: n };
}
function a2(e) {
  var o, a;
  var t = yt(e, 3, ht, mt()), n = yt(e, 2, Ht, mt()), r = yt(e, 1, Ct, mt()), s = yt(e, 9, Ct, mt());
  const i = { categories: [], keypoints: [] };
  for (let c = 0; c < t.length; c++) i.categories.push({ score: t[c], index: n[c] ?? -1, categoryName: r[c] ?? "", displayName: s[c] ?? "" });
  if ((t = (o = T(e, Lr, 4)) == null ? void 0 : o.h()) && (i.boundingBox = { originX: Se(t, 1) ?? 0, originY: Se(t, 2) ?? 0, width: Se(t, 3) ?? 0, height: Se(t, 4) ?? 0, angle: 0 }), (a = T(e, Lr, 4)) == null ? void 0 : a.g().length) for (const c of T(e, Lr, 4).g()) i.keypoints.push({ x: kn(c, 1) ?? 0, y: kn(c, 2) ?? 0, score: kn(c, 4) ?? 0, label: xe(c, 3) ?? "" });
  return i;
}
function cr(e) {
  const t = [];
  for (const n of Ze(e, Da, 1)) t.push({ x: q(n, 1) ?? 0, y: q(n, 2) ?? 0, z: q(n, 3) ?? 0, visibility: q(n, 4) ?? 0 });
  return t;
}
function rn(e) {
  const t = [];
  for (const n of Ze(e, Na, 1)) t.push({ x: q(n, 1) ?? 0, y: q(n, 2) ?? 0, z: q(n, 3) ?? 0, visibility: q(n, 4) ?? 0 });
  return t;
}
function Ki(e) {
  return Array.from(e, ((t) => t > 127 ? t - 256 : t));
}
function $i(e, t) {
  if (e.length !== t.length) throw Error(`Cannot compute cosine similarity between embeddings of different sizes (${e.length} vs. ${t.length}).`);
  let n = 0, r = 0, s = 0;
  for (let i = 0; i < e.length; i++) n += e[i] * t[i], r += e[i] * e[i], s += t[i] * t[i];
  if (r <= 0 || s <= 0) throw Error("Cannot compute cosine similarity on embedding with 0 norm.");
  return n / Math.sqrt(r * s);
}
let En;
Y[516587230] = [0, K, Ks, Kr, X], Y[518928384] = Kr;
const H1 = new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 10, 1, 8, 0, 65, 0, 253, 15, 253, 98, 11]);
async function c2() {
  if (En === void 0) try {
    await WebAssembly.instantiate(H1), En = !0;
  } catch {
    En = !1;
  }
  return En;
}
async function Zt(e, t = m1``) {
  const n = await c2() ? "wasm_internal" : "wasm_nosimd_internal";
  return { wasmLoaderPath: `${t}/${e}_${n}.js`, wasmBinaryPath: `${t}/${e}_${n}.wasm` };
}
var gt = class {
};
function u2() {
  var e = navigator;
  return typeof OffscreenCanvas < "u" && (!(function(t = navigator) {
    return (t = t.userAgent).includes("Safari") && !t.includes("Chrome");
  })(e) || !!((e = e.userAgent.match(/Version\/([\d]+).*Safari/)) && e.length >= 1 && Number(e[1]) >= 17));
}
async function Xi(e) {
  if (typeof importScripts != "function") {
    const t = document.createElement("script");
    return t.src = e.toString(), t.crossOrigin = "anonymous", new Promise(((n, r) => {
      t.addEventListener("load", (() => {
        n();
      }), !1), t.addEventListener("error", ((s) => {
        r(s);
      }), !1), document.body.appendChild(t);
    }));
  }
  importScripts(e.toString());
}
function h2(e) {
  return e.videoWidth !== void 0 ? [e.videoWidth, e.videoHeight] : e.naturalWidth !== void 0 ? [e.naturalWidth, e.naturalHeight] : e.displayWidth !== void 0 ? [e.displayWidth, e.displayHeight] : [e.width, e.height];
}
function g(e, t, n) {
  e.m || console.error("No wasm multistream support detected: ensure dependency inclusion of :gl_graph_runner_internal_multi_input target"), n(t = e.i.stringToNewUTF8(t)), e.i._free(t);
}
function Yi(e, t, n) {
  if (!e.i.canvas) throw Error("No OpenGL canvas configured.");
  if (n ? e.i._bindTextureToStream(n) : e.i._bindTextureToCanvas(), !(n = e.i.canvas.getContext("webgl2") || e.i.canvas.getContext("webgl"))) throw Error("Failed to obtain WebGL context from the provided canvas. `getContext()` should only be invoked with `webgl` or `webgl2`.");
  e.i.gpuOriginForWebTexturesIsBottomLeft && n.pixelStorei(n.UNPACK_FLIP_Y_WEBGL, !0), n.texImage2D(n.TEXTURE_2D, 0, n.RGBA, n.RGBA, n.UNSIGNED_BYTE, t), e.i.gpuOriginForWebTexturesIsBottomLeft && n.pixelStorei(n.UNPACK_FLIP_Y_WEBGL, !1);
  const [r, s] = h2(t);
  return !e.l || r === e.i.canvas.width && s === e.i.canvas.height || (e.i.canvas.width = r, e.i.canvas.height = s), [r, s];
}
function Ji(e, t, n) {
  e.m || console.error("No wasm multistream support detected: ensure dependency inclusion of :gl_graph_runner_internal_multi_input target");
  const r = new Uint32Array(t.length);
  for (let s = 0; s < t.length; s++) r[s] = e.i.stringToNewUTF8(t[s]);
  t = e.i._malloc(4 * r.length), e.i.HEAPU32.set(r, t >> 2), n(t);
  for (const s of r) e.i._free(s);
  e.i._free(t);
}
function De(e, t, n) {
  e.i.simpleListeners = e.i.simpleListeners || {}, e.i.simpleListeners[t] = n;
}
function nt(e, t, n) {
  let r = [];
  e.i.simpleListeners = e.i.simpleListeners || {}, e.i.simpleListeners[t] = (s, i, o) => {
    i ? (n(r, o), r = []) : r.push(s);
  };
}
gt.forVisionTasks = function(e) {
  return Zt("vision", e);
}, gt.forTextTasks = function(e) {
  return Zt("text", e);
}, gt.forGenAiExperimentalTasks = function(e) {
  return Zt("genai_experimental", e);
}, gt.forGenAiTasks = function(e) {
  return Zt("genai", e);
}, gt.forAudioTasks = function(e) {
  return Zt("audio", e);
}, gt.isSimdSupported = function() {
  return c2();
};
async function W1(e, t, n, r) {
  return e = await (async (s, i, o, a, c) => {
    if (i && await Xi(i), !self.ModuleFactory || o && (await Xi(o), !self.ModuleFactory)) throw Error("ModuleFactory not set.");
    return self.Module && c && ((i = self.Module).locateFile = c.locateFile, c.mainScriptUrlOrBlob && (i.mainScriptUrlOrBlob = c.mainScriptUrlOrBlob)), c = await self.ModuleFactory(self.Module || c), self.ModuleFactory = self.Module = void 0, new s(c, a);
  })(e, n.wasmLoaderPath, n.assetLoaderPath, t, { locateFile: (s) => s.endsWith(".wasm") ? n.wasmBinaryPath.toString() : n.assetBinaryPath && s.endsWith(".data") ? n.assetBinaryPath.toString() : s }), await e.o(r), e;
}
function xr(e, t) {
  const n = T(e.baseOptions, Un, 1) || new Un();
  typeof t == "string" ? (R(n, 2, Wt(t)), R(n, 1)) : t instanceof Uint8Array && (R(n, 1, cs(t, !1)), R(n, 2)), y(e.baseOptions, 0, 1, n);
}
function Zi(e) {
  try {
    const t = e.G.length;
    if (t === 1) throw Error(e.G[0].message);
    if (t > 1) throw Error("Encountered multiple errors: " + e.G.map(((n) => n.message)).join(", "));
  } finally {
    e.G = [];
  }
}
function f(e, t) {
  e.B = Math.max(e.B, t);
}
function ur(e, t) {
  e.A = new ae(), Ee(e.A, "PassThroughCalculator"), I(e.A, "free_memory"), k(e.A, "free_memory_unused_out"), C(t, "free_memory"), be(t, e.A);
}
function Ut(e, t) {
  I(e.A, t), k(e.A, t + "_unused_out");
}
function hr(e) {
  e.g.addBoolToStream(!0, "free_memory", e.B);
}
var Ln = class {
  constructor(e) {
    this.g = e, this.G = [], this.B = 0, this.g.setAutoRenderToScreen(!1);
  }
  l(e, t = !0) {
    var n, r, s, i, o, a;
    if (t) {
      const c = e.baseOptions || {};
      if ((n = e.baseOptions) != null && n.modelAssetBuffer && ((r = e.baseOptions) != null && r.modelAssetPath)) throw Error("Cannot set both baseOptions.modelAssetPath and baseOptions.modelAssetBuffer");
      if (!((s = T(this.baseOptions, Un, 1)) != null && s.g() || (i = T(this.baseOptions, Un, 1)) != null && i.h() || (o = e.baseOptions) != null && o.modelAssetBuffer || (a = e.baseOptions) != null && a.modelAssetPath)) throw Error("Either baseOptions.modelAssetPath or baseOptions.modelAssetBuffer must be set");
      if ((function(u, h) {
        let l = T(u.baseOptions, Wi, 3);
        if (!l) {
          var b = l = new Wi(), x = new Ui();
          tn(b, 4, Sn, x);
        }
        "delegate" in h && (h.delegate === "GPU" ? (h = l, b = new y1(), tn(h, 2, Sn, b)) : (h = l, b = new Ui(), tn(h, 4, Sn, b))), y(u.baseOptions, 0, 3, l);
      })(this, c), c.modelAssetPath) return fetch(c.modelAssetPath.toString()).then(((u) => {
        if (u.ok) return u.arrayBuffer();
        throw Error(`Failed to fetch model: ${c.modelAssetPath} (${u.status})`);
      })).then(((u) => {
        try {
          this.g.i.FS_unlink("/model.dat");
        } catch {
        }
        this.g.i.FS_createDataFile("/", "model.dat", new Uint8Array(u), !0, !1, !1), xr(this, "/model.dat"), this.m(), this.I();
      }));
      if (c.modelAssetBuffer instanceof Uint8Array) xr(this, c.modelAssetBuffer);
      else if (c.modelAssetBuffer) return (async function(u) {
        const h = [];
        for (var l = 0; ; ) {
          const { done: b, value: x } = await u.read();
          if (b) break;
          h.push(x), l += x.length;
        }
        if (h.length === 0) return new Uint8Array(0);
        if (h.length === 1) return h[0];
        u = new Uint8Array(l), l = 0;
        for (const b of h) u.set(b, l), l += b.length;
        return u;
      })(c.modelAssetBuffer).then(((u) => {
        xr(this, u), this.m(), this.I();
      }));
    }
    return this.m(), this.I(), Promise.resolve();
  }
  I() {
  }
  da() {
    let e;
    if (this.g.da(((t) => {
      e = _1(t);
    })), !e) throw Error("Failed to retrieve CalculatorGraphConfig");
    return e;
  }
  setGraph(e, t) {
    this.g.attachErrorListener(((n, r) => {
      this.G.push(Error(r));
    })), this.g.La(), this.g.setGraph(e, t), this.A = void 0, Zi(this);
  }
  finishProcessing() {
    this.g.finishProcessing(), Zi(this);
  }
  close() {
    this.A = void 0, this.g.closeGraph();
  }
};
function Je(e, t) {
  if (!e) throw Error(`Unable to obtain required WebGL resource: ${t}`);
  return e;
}
Ln.prototype.close = Ln.prototype.close, (function(e, t) {
  e = e.split(".");
  var n, r = wt;
  for ((e[0] in r) || r.execScript === void 0 || r.execScript("var " + e[0]); e.length && (n = e.shift()); ) e.length || t === void 0 ? r = r[n] && r[n] !== Object.prototype[n] ? r[n] : r[n] = {} : r[n] = t;
})("TaskRunner", Ln);
class z1 {
  constructor(t, n, r, s) {
    this.g = t, this.h = n, this.m = r, this.l = s;
  }
  bind() {
    this.g.bindVertexArray(this.h);
  }
  close() {
    this.g.deleteVertexArray(this.h), this.g.deleteBuffer(this.m), this.g.deleteBuffer(this.l);
  }
}
function Qi(e, t, n) {
  const r = e.g;
  if (n = Je(r.createShader(n), "Failed to create WebGL shader"), r.shaderSource(n, t), r.compileShader(n), !r.getShaderParameter(n, r.COMPILE_STATUS)) throw Error(`Could not compile WebGL shader: ${r.getShaderInfoLog(n)}`);
  return r.attachShader(e.h, n), n;
}
function eo(e, t) {
  const n = e.g, r = Je(n.createVertexArray(), "Failed to create vertex array");
  n.bindVertexArray(r);
  const s = Je(n.createBuffer(), "Failed to create buffer");
  n.bindBuffer(n.ARRAY_BUFFER, s), n.enableVertexAttribArray(e.O), n.vertexAttribPointer(e.O, 2, n.FLOAT, !1, 0, 0), n.bufferData(n.ARRAY_BUFFER, new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]), n.STATIC_DRAW);
  const i = Je(n.createBuffer(), "Failed to create buffer");
  return n.bindBuffer(n.ARRAY_BUFFER, i), n.enableVertexAttribArray(e.I), n.vertexAttribPointer(e.I, 2, n.FLOAT, !1, 0, 0), n.bufferData(n.ARRAY_BUFFER, new Float32Array(t ? [0, 1, 0, 0, 1, 0, 1, 1] : [0, 0, 0, 1, 1, 1, 1, 0]), n.STATIC_DRAW), n.bindBuffer(n.ARRAY_BUFFER, null), n.bindVertexArray(null), new z1(n, r, s, i);
}
function Ys(e, t) {
  if (e.g) {
    if (t !== e.g) throw Error("Cannot change GL context once initialized");
  } else e.g = t;
}
function Js(e, t, n, r) {
  return Ys(e, t), e.h || (e.m(), e.C()), n ? (e.s || (e.s = eo(e, !0)), n = e.s) : (e.v || (e.v = eo(e, !1)), n = e.v), t.useProgram(e.h), n.bind(), e.l(), e = r(), n.g.bindVertexArray(null), e;
}
function lr(e, t, n) {
  return Ys(e, t), e = Je(t.createTexture(), "Failed to create texture"), t.bindTexture(t.TEXTURE_2D, e), t.texParameteri(t.TEXTURE_2D, t.TEXTURE_WRAP_S, t.CLAMP_TO_EDGE), t.texParameteri(t.TEXTURE_2D, t.TEXTURE_WRAP_T, t.CLAMP_TO_EDGE), t.texParameteri(t.TEXTURE_2D, t.TEXTURE_MIN_FILTER, n ?? t.LINEAR), t.texParameteri(t.TEXTURE_2D, t.TEXTURE_MAG_FILTER, n ?? t.LINEAR), t.bindTexture(t.TEXTURE_2D, null), e;
}
function fr(e, t, n) {
  Ys(e, t), e.A || (e.A = Je(t.createFramebuffer(), "Failed to create framebuffe.")), t.bindFramebuffer(t.FRAMEBUFFER, e.A), t.framebufferTexture2D(t.FRAMEBUFFER, t.COLOR_ATTACHMENT0, t.TEXTURE_2D, n, 0);
}
function Zs(e) {
  var t;
  (t = e.g) == null || t.bindFramebuffer(e.g.FRAMEBUFFER, null);
}
var Qs = class {
  G() {
    return `
  precision mediump float;
  varying vec2 vTex;
  uniform sampler2D inputTexture;
  void main() {
    gl_FragColor = texture2D(inputTexture, vTex);
  }
 `;
  }
  m() {
    const e = this.g;
    if (this.h = Je(e.createProgram(), "Failed to create WebGL program"), this.aa = Qi(this, `
  attribute vec2 aVertex;
  attribute vec2 aTex;
  varying vec2 vTex;
  void main(void) {
    gl_Position = vec4(aVertex, 0.0, 1.0);
    vTex = aTex;
  }`, e.VERTEX_SHADER), this.Z = Qi(this, this.G(), e.FRAGMENT_SHADER), e.linkProgram(this.h), !e.getProgramParameter(this.h, e.LINK_STATUS)) throw Error(`Error during program linking: ${e.getProgramInfoLog(this.h)}`);
    this.O = e.getAttribLocation(this.h, "aVertex"), this.I = e.getAttribLocation(this.h, "aTex");
  }
  C() {
  }
  l() {
  }
  close() {
    if (this.h) {
      const e = this.g;
      e.deleteProgram(this.h), e.deleteShader(this.aa), e.deleteShader(this.Z);
    }
    this.A && this.g.deleteFramebuffer(this.A), this.v && this.v.close(), this.s && this.s.close();
  }
};
function qe(e, t) {
  switch (t) {
    case 0:
      return e.g.find(((n) => n instanceof Uint8Array));
    case 1:
      return e.g.find(((n) => n instanceof Float32Array));
    case 2:
      return e.g.find(((n) => typeof WebGLTexture < "u" && n instanceof WebGLTexture));
    default:
      throw Error(`Type is not supported: ${t}`);
  }
}
function Xr(e) {
  var t = qe(e, 1);
  if (!t) {
    if (t = qe(e, 0)) t = new Float32Array(t).map(((r) => r / 255));
    else {
      t = new Float32Array(e.width * e.height);
      const r = Bt(e);
      var n = ei(e);
      if (fr(n, r, l2(e)), "iPad Simulator;iPhone Simulator;iPod Simulator;iPad;iPhone;iPod".split(";").includes(navigator.platform) || navigator.userAgent.includes("Mac") && "document" in self && "ontouchend" in self.document) {
        n = new Float32Array(e.width * e.height * 4), r.readPixels(0, 0, e.width, e.height, r.RGBA, r.FLOAT, n);
        for (let s = 0, i = 0; s < t.length; ++s, i += 4) t[s] = n[i];
      } else r.readPixels(0, 0, e.width, e.height, r.RED, r.FLOAT, t);
    }
    e.g.push(t);
  }
  return t;
}
function l2(e) {
  let t = qe(e, 2);
  if (!t) {
    const n = Bt(e);
    t = d2(e);
    const r = Xr(e), s = f2(e);
    n.texImage2D(n.TEXTURE_2D, 0, s, e.width, e.height, 0, n.RED, n.FLOAT, r), Yr(e);
  }
  return t;
}
function Bt(e) {
  if (!e.canvas) throw Error("Conversion to different image formats require that a canvas is passed when initializing the image.");
  return e.h || (e.h = Je(e.canvas.getContext("webgl2"), "You cannot use a canvas that is already bound to a different type of rendering context.")), e.h;
}
function f2(e) {
  if (e = Bt(e), !bn) if (e.getExtension("EXT_color_buffer_float") && e.getExtension("OES_texture_float_linear") && e.getExtension("EXT_float_blend")) bn = e.R32F;
  else {
    if (!e.getExtension("EXT_color_buffer_half_float")) throw Error("GPU does not fully support 4-channel float32 or float16 formats");
    bn = e.R16F;
  }
  return bn;
}
function ei(e) {
  return e.l || (e.l = new Qs()), e.l;
}
function d2(e) {
  const t = Bt(e);
  t.viewport(0, 0, e.width, e.height), t.activeTexture(t.TEXTURE0);
  let n = qe(e, 2);
  return n || (n = lr(ei(e), t, e.m ? t.LINEAR : t.NEAREST), e.g.push(n), e.j = !0), t.bindTexture(t.TEXTURE_2D, n), n;
}
function Yr(e) {
  e.h.bindTexture(e.h.TEXTURE_2D, null);
}
var bn, ee = class {
  constructor(e, t, n, r, s, i, o) {
    this.g = e, this.m = t, this.j = n, this.canvas = r, this.l = s, this.width = i, this.height = o, this.j && --to === 0 && console.error("You seem to be creating MPMask instances without invoking .close(). This leaks resources.");
  }
  Fa() {
    return !!qe(this, 0);
  }
  ja() {
    return !!qe(this, 1);
  }
  P() {
    return !!qe(this, 2);
  }
  ia() {
    return (t = qe(e = this, 0)) || (t = Xr(e), t = new Uint8Array(t.map(((n) => 255 * n))), e.g.push(t)), t;
    var e, t;
  }
  ha() {
    return Xr(this);
  }
  M() {
    return l2(this);
  }
  clone() {
    const e = [];
    for (const t of this.g) {
      let n;
      if (t instanceof Uint8Array) n = new Uint8Array(t);
      else if (t instanceof Float32Array) n = new Float32Array(t);
      else {
        if (!(t instanceof WebGLTexture)) throw Error(`Type is not supported: ${t}`);
        {
          const r = Bt(this), s = ei(this);
          r.activeTexture(r.TEXTURE1), n = lr(s, r, this.m ? r.LINEAR : r.NEAREST), r.bindTexture(r.TEXTURE_2D, n);
          const i = f2(this);
          r.texImage2D(r.TEXTURE_2D, 0, i, this.width, this.height, 0, r.RED, r.FLOAT, null), r.bindTexture(r.TEXTURE_2D, null), fr(s, r, n), Js(s, r, !1, (() => {
            d2(this), r.clearColor(0, 0, 0, 0), r.clear(r.COLOR_BUFFER_BIT), r.drawArrays(r.TRIANGLE_FAN, 0, 4), Yr(this);
          })), Zs(s), Yr(this);
        }
      }
      e.push(n);
    }
    return new ee(e, this.m, this.P(), this.canvas, this.l, this.width, this.height);
  }
  close() {
    this.j && Bt(this).deleteTexture(qe(this, 2)), to = -1;
  }
};
ee.prototype.close = ee.prototype.close, ee.prototype.clone = ee.prototype.clone, ee.prototype.getAsWebGLTexture = ee.prototype.M, ee.prototype.getAsFloat32Array = ee.prototype.ha, ee.prototype.getAsUint8Array = ee.prototype.ia, ee.prototype.hasWebGLTexture = ee.prototype.P, ee.prototype.hasFloat32Array = ee.prototype.ja, ee.prototype.hasUint8Array = ee.prototype.Fa;
var to = 250;
function Ve(e, t) {
  switch (t) {
    case 0:
      return e.g.find(((n) => n instanceof ImageData));
    case 1:
      return e.g.find(((n) => typeof ImageBitmap < "u" && n instanceof ImageBitmap));
    case 2:
      return e.g.find(((n) => typeof WebGLTexture < "u" && n instanceof WebGLTexture));
    default:
      throw Error(`Type is not supported: ${t}`);
  }
}
function p2(e) {
  var t = Ve(e, 0);
  if (!t) {
    t = Gt(e);
    const n = dr(e), r = new Uint8Array(e.width * e.height * 4);
    fr(n, t, xn(e)), t.readPixels(0, 0, e.width, e.height, t.RGBA, t.UNSIGNED_BYTE, r), Zs(n), t = new ImageData(new Uint8ClampedArray(r.buffer), e.width, e.height), e.g.push(t);
  }
  return t;
}
function xn(e) {
  let t = Ve(e, 2);
  if (!t) {
    const n = Gt(e);
    t = Mn(e);
    const r = Ve(e, 1) || p2(e);
    n.texImage2D(n.TEXTURE_2D, 0, n.RGBA, n.RGBA, n.UNSIGNED_BYTE, r), en(e);
  }
  return t;
}
function Gt(e) {
  if (!e.canvas) throw Error("Conversion to different image formats require that a canvas is passed when initializing the image.");
  return e.h || (e.h = Je(e.canvas.getContext("webgl2"), "You cannot use a canvas that is already bound to a different type of rendering context.")), e.h;
}
function dr(e) {
  return e.l || (e.l = new Qs()), e.l;
}
function Mn(e) {
  const t = Gt(e);
  t.viewport(0, 0, e.width, e.height), t.activeTexture(t.TEXTURE0);
  let n = Ve(e, 2);
  return n || (n = lr(dr(e), t), e.g.push(n), e.m = !0), t.bindTexture(t.TEXTURE_2D, n), n;
}
function en(e) {
  e.h.bindTexture(e.h.TEXTURE_2D, null);
}
function no(e) {
  const t = Gt(e);
  return Js(dr(e), t, !0, (() => (function(n, r) {
    const s = n.canvas;
    if (s.width === n.width && s.height === n.height) return r();
    const i = s.width, o = s.height;
    return s.width = n.width, s.height = n.height, n = r(), s.width = i, s.height = o, n;
  })(e, (() => {
    if (t.bindFramebuffer(t.FRAMEBUFFER, null), t.clearColor(0, 0, 0, 0), t.clear(t.COLOR_BUFFER_BIT), t.drawArrays(t.TRIANGLE_FAN, 0, 4), !(e.canvas instanceof OffscreenCanvas)) throw Error("Conversion to ImageBitmap requires that the MediaPipe Tasks is initialized with an OffscreenCanvas");
    return e.canvas.transferToImageBitmap();
  }))));
}
var te = class {
  constructor(e, t, n, r, s, i, o) {
    this.g = e, this.j = t, this.m = n, this.canvas = r, this.l = s, this.width = i, this.height = o, (this.j || this.m) && --ro === 0 && console.error("You seem to be creating MPImage instances without invoking .close(). This leaks resources.");
  }
  Ea() {
    return !!Ve(this, 0);
  }
  ka() {
    return !!Ve(this, 1);
  }
  P() {
    return !!Ve(this, 2);
  }
  Ca() {
    return p2(this);
  }
  Ba() {
    var e = Ve(this, 1);
    return e || (xn(this), Mn(this), e = no(this), en(this), this.g.push(e), this.j = !0), e;
  }
  M() {
    return xn(this);
  }
  clone() {
    const e = [];
    for (const t of this.g) {
      let n;
      if (t instanceof ImageData) n = new ImageData(t.data, this.width, this.height);
      else if (t instanceof WebGLTexture) {
        const r = Gt(this), s = dr(this);
        r.activeTexture(r.TEXTURE1), n = lr(s, r), r.bindTexture(r.TEXTURE_2D, n), r.texImage2D(r.TEXTURE_2D, 0, r.RGBA, this.width, this.height, 0, r.RGBA, r.UNSIGNED_BYTE, null), r.bindTexture(r.TEXTURE_2D, null), fr(s, r, n), Js(s, r, !1, (() => {
          Mn(this), r.clearColor(0, 0, 0, 0), r.clear(r.COLOR_BUFFER_BIT), r.drawArrays(r.TRIANGLE_FAN, 0, 4), en(this);
        })), Zs(s), en(this);
      } else {
        if (!(t instanceof ImageBitmap)) throw Error(`Type is not supported: ${t}`);
        xn(this), Mn(this), n = no(this), en(this);
      }
      e.push(n);
    }
    return new te(e, this.ka(), this.P(), this.canvas, this.l, this.width, this.height);
  }
  close() {
    this.j && Ve(this, 1).close(), this.m && Gt(this).deleteTexture(Ve(this, 2)), ro = -1;
  }
};
te.prototype.close = te.prototype.close, te.prototype.clone = te.prototype.clone, te.prototype.getAsWebGLTexture = te.prototype.M, te.prototype.getAsImageBitmap = te.prototype.Ba, te.prototype.getAsImageData = te.prototype.Ca, te.prototype.hasWebGLTexture = te.prototype.P, te.prototype.hasImageBitmap = te.prototype.ka, te.prototype.hasImageData = te.prototype.Ea;
var ro = 250;
function Ce(...e) {
  return e.map((([t, n]) => ({ start: t, end: n })));
}
const q1 = /* @__PURE__ */ (function(e) {
  return class extends e {
    La() {
      this.i._registerModelResourcesGraphService();
    }
  };
})((so = class {
  constructor(e, t) {
    this.l = !0, this.i = e, this.g = null, this.h = 0, this.m = typeof this.i._addIntToInputStream == "function", t !== void 0 ? this.i.canvas = t : u2() ? this.i.canvas = new OffscreenCanvas(1, 1) : (console.warn("OffscreenCanvas not supported and GraphRunner constructor glCanvas parameter is undefined. Creating backup canvas."), this.i.canvas = document.createElement("canvas"));
  }
  async initializeGraph(e) {
    const t = await (await fetch(e)).arrayBuffer();
    e = !(e.endsWith(".pbtxt") || e.endsWith(".textproto")), this.setGraph(new Uint8Array(t), e);
  }
  setGraphFromString(e) {
    this.setGraph(new TextEncoder().encode(e), !1);
  }
  setGraph(e, t) {
    const n = e.length, r = this.i._malloc(n);
    this.i.HEAPU8.set(e, r), t ? this.i._changeBinaryGraph(n, r) : this.i._changeTextGraph(n, r), this.i._free(r);
  }
  configureAudio(e, t, n, r, s) {
    this.i._configureAudio || console.warn('Attempting to use configureAudio without support for input audio. Is build dep ":gl_graph_runner_audio" missing?'), g(this, r || "input_audio", ((i) => {
      g(this, s = s || "audio_header", ((o) => {
        this.i._configureAudio(i, o, e, t ?? 0, n);
      }));
    }));
  }
  setAutoResizeCanvas(e) {
    this.l = e;
  }
  setAutoRenderToScreen(e) {
    this.i._setAutoRenderToScreen(e);
  }
  setGpuBufferVerticalFlip(e) {
    this.i.gpuOriginForWebTexturesIsBottomLeft = e;
  }
  da(e) {
    De(this, "__graph_config__", ((t) => {
      e(t);
    })), g(this, "__graph_config__", ((t) => {
      this.i._getGraphConfig(t, void 0);
    })), delete this.i.simpleListeners.__graph_config__;
  }
  attachErrorListener(e) {
    this.i.errorListener = e;
  }
  attachEmptyPacketListener(e, t) {
    this.i.emptyPacketListeners = this.i.emptyPacketListeners || {}, this.i.emptyPacketListeners[e] = t;
  }
  addAudioToStream(e, t, n) {
    this.addAudioToStreamWithShape(e, 0, 0, t, n);
  }
  addAudioToStreamWithShape(e, t, n, r, s) {
    const i = 4 * e.length;
    this.h !== i && (this.g && this.i._free(this.g), this.g = this.i._malloc(i), this.h = i), this.i.HEAPF32.set(e, this.g / 4), g(this, r, ((o) => {
      this.i._addAudioToInputStream(this.g, t, n, o, s);
    }));
  }
  addGpuBufferToStream(e, t, n) {
    g(this, t, ((r) => {
      const [s, i] = Yi(this, e, r);
      this.i._addBoundTextureToStream(r, s, i, n);
    }));
  }
  addBoolToStream(e, t, n) {
    g(this, t, ((r) => {
      this.i._addBoolToInputStream(e, r, n);
    }));
  }
  addDoubleToStream(e, t, n) {
    g(this, t, ((r) => {
      this.i._addDoubleToInputStream(e, r, n);
    }));
  }
  addFloatToStream(e, t, n) {
    g(this, t, ((r) => {
      this.i._addFloatToInputStream(e, r, n);
    }));
  }
  addIntToStream(e, t, n) {
    g(this, t, ((r) => {
      this.i._addIntToInputStream(e, r, n);
    }));
  }
  addUintToStream(e, t, n) {
    g(this, t, ((r) => {
      this.i._addUintToInputStream(e, r, n);
    }));
  }
  addStringToStream(e, t, n) {
    g(this, t, ((r) => {
      g(this, e, ((s) => {
        this.i._addStringToInputStream(s, r, n);
      }));
    }));
  }
  addStringRecordToStream(e, t, n) {
    g(this, t, ((r) => {
      Ji(this, Object.keys(e), ((s) => {
        Ji(this, Object.values(e), ((i) => {
          this.i._addFlatHashMapToInputStream(s, i, Object.keys(e).length, r, n);
        }));
      }));
    }));
  }
  addProtoToStream(e, t, n, r) {
    g(this, n, ((s) => {
      g(this, t, ((i) => {
        const o = this.i._malloc(e.length);
        this.i.HEAPU8.set(e, o), this.i._addProtoToInputStream(o, e.length, i, s, r), this.i._free(o);
      }));
    }));
  }
  addEmptyPacketToStream(e, t) {
    g(this, e, ((n) => {
      this.i._addEmptyPacketToInputStream(n, t);
    }));
  }
  addBoolVectorToStream(e, t, n) {
    g(this, t, ((r) => {
      const s = this.i._allocateBoolVector(e.length);
      if (!s) throw Error("Unable to allocate new bool vector on heap.");
      for (const i of e) this.i._addBoolVectorEntry(s, i);
      this.i._addBoolVectorToInputStream(s, r, n);
    }));
  }
  addDoubleVectorToStream(e, t, n) {
    g(this, t, ((r) => {
      const s = this.i._allocateDoubleVector(e.length);
      if (!s) throw Error("Unable to allocate new double vector on heap.");
      for (const i of e) this.i._addDoubleVectorEntry(s, i);
      this.i._addDoubleVectorToInputStream(s, r, n);
    }));
  }
  addFloatVectorToStream(e, t, n) {
    g(this, t, ((r) => {
      const s = this.i._allocateFloatVector(e.length);
      if (!s) throw Error("Unable to allocate new float vector on heap.");
      for (const i of e) this.i._addFloatVectorEntry(s, i);
      this.i._addFloatVectorToInputStream(s, r, n);
    }));
  }
  addIntVectorToStream(e, t, n) {
    g(this, t, ((r) => {
      const s = this.i._allocateIntVector(e.length);
      if (!s) throw Error("Unable to allocate new int vector on heap.");
      for (const i of e) this.i._addIntVectorEntry(s, i);
      this.i._addIntVectorToInputStream(s, r, n);
    }));
  }
  addUintVectorToStream(e, t, n) {
    g(this, t, ((r) => {
      const s = this.i._allocateUintVector(e.length);
      if (!s) throw Error("Unable to allocate new unsigned int vector on heap.");
      for (const i of e) this.i._addUintVectorEntry(s, i);
      this.i._addUintVectorToInputStream(s, r, n);
    }));
  }
  addStringVectorToStream(e, t, n) {
    g(this, t, ((r) => {
      const s = this.i._allocateStringVector(e.length);
      if (!s) throw Error("Unable to allocate new string vector on heap.");
      for (const i of e) g(this, i, ((o) => {
        this.i._addStringVectorEntry(s, o);
      }));
      this.i._addStringVectorToInputStream(s, r, n);
    }));
  }
  addBoolToInputSidePacket(e, t) {
    g(this, t, ((n) => {
      this.i._addBoolToInputSidePacket(e, n);
    }));
  }
  addDoubleToInputSidePacket(e, t) {
    g(this, t, ((n) => {
      this.i._addDoubleToInputSidePacket(e, n);
    }));
  }
  addFloatToInputSidePacket(e, t) {
    g(this, t, ((n) => {
      this.i._addFloatToInputSidePacket(e, n);
    }));
  }
  addIntToInputSidePacket(e, t) {
    g(this, t, ((n) => {
      this.i._addIntToInputSidePacket(e, n);
    }));
  }
  addUintToInputSidePacket(e, t) {
    g(this, t, ((n) => {
      this.i._addUintToInputSidePacket(e, n);
    }));
  }
  addStringToInputSidePacket(e, t) {
    g(this, t, ((n) => {
      g(this, e, ((r) => {
        this.i._addStringToInputSidePacket(r, n);
      }));
    }));
  }
  addProtoToInputSidePacket(e, t, n) {
    g(this, n, ((r) => {
      g(this, t, ((s) => {
        const i = this.i._malloc(e.length);
        this.i.HEAPU8.set(e, i), this.i._addProtoToInputSidePacket(i, e.length, s, r), this.i._free(i);
      }));
    }));
  }
  addBoolVectorToInputSidePacket(e, t) {
    g(this, t, ((n) => {
      const r = this.i._allocateBoolVector(e.length);
      if (!r) throw Error("Unable to allocate new bool vector on heap.");
      for (const s of e) this.i._addBoolVectorEntry(r, s);
      this.i._addBoolVectorToInputSidePacket(r, n);
    }));
  }
  addDoubleVectorToInputSidePacket(e, t) {
    g(this, t, ((n) => {
      const r = this.i._allocateDoubleVector(e.length);
      if (!r) throw Error("Unable to allocate new double vector on heap.");
      for (const s of e) this.i._addDoubleVectorEntry(r, s);
      this.i._addDoubleVectorToInputSidePacket(r, n);
    }));
  }
  addFloatVectorToInputSidePacket(e, t) {
    g(this, t, ((n) => {
      const r = this.i._allocateFloatVector(e.length);
      if (!r) throw Error("Unable to allocate new float vector on heap.");
      for (const s of e) this.i._addFloatVectorEntry(r, s);
      this.i._addFloatVectorToInputSidePacket(r, n);
    }));
  }
  addIntVectorToInputSidePacket(e, t) {
    g(this, t, ((n) => {
      const r = this.i._allocateIntVector(e.length);
      if (!r) throw Error("Unable to allocate new int vector on heap.");
      for (const s of e) this.i._addIntVectorEntry(r, s);
      this.i._addIntVectorToInputSidePacket(r, n);
    }));
  }
  addUintVectorToInputSidePacket(e, t) {
    g(this, t, ((n) => {
      const r = this.i._allocateUintVector(e.length);
      if (!r) throw Error("Unable to allocate new unsigned int vector on heap.");
      for (const s of e) this.i._addUintVectorEntry(r, s);
      this.i._addUintVectorToInputSidePacket(r, n);
    }));
  }
  addStringVectorToInputSidePacket(e, t) {
    g(this, t, ((n) => {
      const r = this.i._allocateStringVector(e.length);
      if (!r) throw Error("Unable to allocate new string vector on heap.");
      for (const s of e) g(this, s, ((i) => {
        this.i._addStringVectorEntry(r, i);
      }));
      this.i._addStringVectorToInputSidePacket(r, n);
    }));
  }
  attachBoolListener(e, t) {
    De(this, e, t), g(this, e, ((n) => {
      this.i._attachBoolListener(n);
    }));
  }
  attachBoolVectorListener(e, t) {
    nt(this, e, t), g(this, e, ((n) => {
      this.i._attachBoolVectorListener(n);
    }));
  }
  attachIntListener(e, t) {
    De(this, e, t), g(this, e, ((n) => {
      this.i._attachIntListener(n);
    }));
  }
  attachIntVectorListener(e, t) {
    nt(this, e, t), g(this, e, ((n) => {
      this.i._attachIntVectorListener(n);
    }));
  }
  attachUintListener(e, t) {
    De(this, e, t), g(this, e, ((n) => {
      this.i._attachUintListener(n);
    }));
  }
  attachUintVectorListener(e, t) {
    nt(this, e, t), g(this, e, ((n) => {
      this.i._attachUintVectorListener(n);
    }));
  }
  attachDoubleListener(e, t) {
    De(this, e, t), g(this, e, ((n) => {
      this.i._attachDoubleListener(n);
    }));
  }
  attachDoubleVectorListener(e, t) {
    nt(this, e, t), g(this, e, ((n) => {
      this.i._attachDoubleVectorListener(n);
    }));
  }
  attachFloatListener(e, t) {
    De(this, e, t), g(this, e, ((n) => {
      this.i._attachFloatListener(n);
    }));
  }
  attachFloatVectorListener(e, t) {
    nt(this, e, t), g(this, e, ((n) => {
      this.i._attachFloatVectorListener(n);
    }));
  }
  attachStringListener(e, t) {
    De(this, e, t), g(this, e, ((n) => {
      this.i._attachStringListener(n);
    }));
  }
  attachStringVectorListener(e, t) {
    nt(this, e, t), g(this, e, ((n) => {
      this.i._attachStringVectorListener(n);
    }));
  }
  attachProtoListener(e, t, n) {
    De(this, e, t), g(this, e, ((r) => {
      this.i._attachProtoListener(r, n || !1);
    }));
  }
  attachProtoVectorListener(e, t, n) {
    nt(this, e, t), g(this, e, ((r) => {
      this.i._attachProtoVectorListener(r, n || !1);
    }));
  }
  attachAudioListener(e, t, n) {
    this.i._attachAudioListener || console.warn('Attempting to use attachAudioListener without support for output audio. Is build dep ":gl_graph_runner_audio_out" missing?'), De(this, e, ((r, s) => {
      r = new Float32Array(r.buffer, r.byteOffset, r.length / 4), t(r, s);
    })), g(this, e, ((r) => {
      this.i._attachAudioListener(r, n || !1);
    }));
  }
  finishProcessing() {
    this.i._waitUntilIdle();
  }
  closeGraph() {
    this.i._closeGraph(), this.i.simpleListeners = void 0, this.i.emptyPacketListeners = void 0;
  }
}, class extends so {
  get ea() {
    return this.i;
  }
  qa(e, t, n) {
    g(this, t, ((r) => {
      const [s, i] = Yi(this, e, r);
      this.ea._addBoundTextureAsImageToStream(r, s, i, n);
    }));
  }
  U(e, t) {
    De(this, e, t), g(this, e, ((n) => {
      this.ea._attachImageListener(n);
    }));
  }
  ca(e, t) {
    nt(this, e, t), g(this, e, ((n) => {
      this.ea._attachImageVectorListener(n);
    }));
  }
}));
var so, Fe = class extends q1 {
};
async function A(e, t, n) {
  return (async function(r, s, i, o) {
    return W1(r, s, i, o);
  })(e, n.canvas ?? (u2() ? void 0 : document.createElement("canvas")), t, n);
}
function g2(e, t, n, r) {
  if (e.T) {
    const i = new Ua();
    if (n != null && n.regionOfInterest) {
      if (!e.pa) throw Error("This task doesn't support region-of-interest.");
      var s = n.regionOfInterest;
      if (s.left >= s.right || s.top >= s.bottom) throw Error("Expected RectF with left < right and top < bottom.");
      if (s.left < 0 || s.top < 0 || s.right > 1 || s.bottom > 1) throw Error("Expected RectF values to be in [0,1].");
      p(i, 1, (s.left + s.right) / 2), p(i, 2, (s.top + s.bottom) / 2), p(i, 4, s.right - s.left), p(i, 3, s.bottom - s.top);
    } else p(i, 1, 0.5), p(i, 2, 0.5), p(i, 4, 1), p(i, 3, 1);
    if (n != null && n.rotationDegrees) {
      if ((n == null ? void 0 : n.rotationDegrees) % 90 != 0) throw Error("Expected rotation to be a multiple of 90°.");
      if (p(i, 5, -Math.PI * n.rotationDegrees / 180), (n == null ? void 0 : n.rotationDegrees) % 180 != 0) {
        const [o, a] = h2(t);
        n = q(i, 3) * a / o, s = q(i, 4) * o / a, p(i, 4, n), p(i, 3, s);
      }
    }
    e.g.addProtoToStream(i.g(), "mediapipe.NormalizedRect", e.T, r);
  }
  e.g.qa(t, e.aa, r ?? performance.now()), e.finishProcessing();
}
function Oe(e, t, n) {
  var r;
  if ((r = e.baseOptions) != null && r.g()) throw Error("Task is not initialized with image mode. 'runningMode' must be set to 'IMAGE'.");
  g2(e, t, n, e.B + 1);
}
function He(e, t, n, r) {
  var s;
  if (!((s = e.baseOptions) != null && s.g())) throw Error("Task is not initialized with video mode. 'runningMode' must be set to 'VIDEO'.");
  g2(e, t, n, r);
}
function Vt(e, t, n, r) {
  var s = t.data;
  const i = t.width, o = i * (t = t.height);
  if ((s instanceof Uint8Array || s instanceof Float32Array) && s.length !== o) throw Error("Unsupported channel count: " + s.length / o);
  return e = new ee([s], n, !1, e.g.i.canvas, e.O, i, t), r ? e.clone() : e;
}
var fe = class extends Ln {
  constructor(e, t, n, r) {
    super(e), this.g = e, this.aa = t, this.T = n, this.pa = r, this.O = new Qs();
  }
  l(e, t = !0) {
    if ("runningMode" in e && an(this.baseOptions, 2, !!e.runningMode && e.runningMode !== "IMAGE"), e.canvas !== void 0 && this.g.i.canvas !== e.canvas) throw Error("You must create a new task to reset the canvas.");
    return super.l(e, t);
  }
  close() {
    this.O.close(), super.close();
  }
};
fe.prototype.close = fe.prototype.close;
var _e = class extends fe {
  constructor(e, t) {
    super(new Fe(e, t), "image_in", "norm_rect_in", !1), this.j = { detections: [] }, y(e = this.h = new ar(), 0, 1, t = new U()), p(this.h, 2, 0.5), p(this.h, 3, 0.3);
  }
  get baseOptions() {
    return T(this.h, U, 1);
  }
  set baseOptions(e) {
    y(this.h, 0, 1, e);
  }
  o(e) {
    return "minDetectionConfidence" in e && p(this.h, 2, e.minDetectionConfidence ?? 0.5), "minSuppressionThreshold" in e && p(this.h, 3, e.minSuppressionThreshold ?? 0.3), this.l(e);
  }
  D(e, t) {
    return this.j = { detections: [] }, Oe(this, e, t), this.j;
  }
  F(e, t, n) {
    return this.j = { detections: [] }, He(this, e, n, t), this.j;
  }
  m() {
    var e = new de();
    C(e, "image_in"), C(e, "norm_rect_in"), L(e, "detections");
    const t = new we();
    Pe(t, F1, this.h);
    const n = new ae();
    Ee(n, "mediapipe.tasks.vision.face_detector.FaceDetectorGraph"), I(n, "IMAGE:image_in"), I(n, "NORM_RECT:norm_rect_in"), k(n, "DETECTIONS:detections"), n.o(t), be(e, n), this.g.attachProtoVectorListener("detections", ((r, s) => {
      for (const i of r) r = Ca(i), this.j.detections.push(a2(r));
      f(this, s);
    })), this.g.attachEmptyPacketListener("detections", ((r) => {
      f(this, r);
    })), e = e.g(), this.setGraph(new Uint8Array(e), !0);
  }
};
_e.prototype.detectForVideo = _e.prototype.F, _e.prototype.detect = _e.prototype.D, _e.prototype.setOptions = _e.prototype.o, _e.createFromModelPath = async function(e, t) {
  return A(_e, e, { baseOptions: { modelAssetPath: t } });
}, _e.createFromModelBuffer = function(e, t) {
  return A(_e, e, { baseOptions: { modelAssetBuffer: t } });
}, _e.createFromOptions = function(e, t) {
  return A(_e, e, t);
};
var ti = Ce([61, 146], [146, 91], [91, 181], [181, 84], [84, 17], [17, 314], [314, 405], [405, 321], [321, 375], [375, 291], [61, 185], [185, 40], [40, 39], [39, 37], [37, 0], [0, 267], [267, 269], [269, 270], [270, 409], [409, 291], [78, 95], [95, 88], [88, 178], [178, 87], [87, 14], [14, 317], [317, 402], [402, 318], [318, 324], [324, 308], [78, 191], [191, 80], [80, 81], [81, 82], [82, 13], [13, 312], [312, 311], [311, 310], [310, 415], [415, 308]), ni = Ce([263, 249], [249, 390], [390, 373], [373, 374], [374, 380], [380, 381], [381, 382], [382, 362], [263, 466], [466, 388], [388, 387], [387, 386], [386, 385], [385, 384], [384, 398], [398, 362]), ri = Ce([276, 283], [283, 282], [282, 295], [295, 285], [300, 293], [293, 334], [334, 296], [296, 336]), m2 = Ce([474, 475], [475, 476], [476, 477], [477, 474]), si = Ce([33, 7], [7, 163], [163, 144], [144, 145], [145, 153], [153, 154], [154, 155], [155, 133], [33, 246], [246, 161], [161, 160], [160, 159], [159, 158], [158, 157], [157, 173], [173, 133]), ii = Ce([46, 53], [53, 52], [52, 65], [65, 55], [70, 63], [63, 105], [105, 66], [66, 107]), y2 = Ce([469, 470], [470, 471], [471, 472], [472, 469]), oi = Ce([10, 338], [338, 297], [297, 332], [332, 284], [284, 251], [251, 389], [389, 356], [356, 454], [454, 323], [323, 361], [361, 288], [288, 397], [397, 365], [365, 379], [379, 378], [378, 400], [400, 377], [377, 152], [152, 148], [148, 176], [176, 149], [149, 150], [150, 136], [136, 172], [172, 58], [58, 132], [132, 93], [93, 234], [234, 127], [127, 162], [162, 21], [21, 54], [54, 103], [103, 67], [67, 109], [109, 10]), _2 = [...ti, ...ni, ...ri, ...si, ...ii, ...oi], w2 = Ce([127, 34], [34, 139], [139, 127], [11, 0], [0, 37], [37, 11], [232, 231], [231, 120], [120, 232], [72, 37], [37, 39], [39, 72], [128, 121], [121, 47], [47, 128], [232, 121], [121, 128], [128, 232], [104, 69], [69, 67], [67, 104], [175, 171], [171, 148], [148, 175], [118, 50], [50, 101], [101, 118], [73, 39], [39, 40], [40, 73], [9, 151], [151, 108], [108, 9], [48, 115], [115, 131], [131, 48], [194, 204], [204, 211], [211, 194], [74, 40], [40, 185], [185, 74], [80, 42], [42, 183], [183, 80], [40, 92], [92, 186], [186, 40], [230, 229], [229, 118], [118, 230], [202, 212], [212, 214], [214, 202], [83, 18], [18, 17], [17, 83], [76, 61], [61, 146], [146, 76], [160, 29], [29, 30], [30, 160], [56, 157], [157, 173], [173, 56], [106, 204], [204, 194], [194, 106], [135, 214], [214, 192], [192, 135], [203, 165], [165, 98], [98, 203], [21, 71], [71, 68], [68, 21], [51, 45], [45, 4], [4, 51], [144, 24], [24, 23], [23, 144], [77, 146], [146, 91], [91, 77], [205, 50], [50, 187], [187, 205], [201, 200], [200, 18], [18, 201], [91, 106], [106, 182], [182, 91], [90, 91], [91, 181], [181, 90], [85, 84], [84, 17], [17, 85], [206, 203], [203, 36], [36, 206], [148, 171], [171, 140], [140, 148], [92, 40], [40, 39], [39, 92], [193, 189], [189, 244], [244, 193], [159, 158], [158, 28], [28, 159], [247, 246], [246, 161], [161, 247], [236, 3], [3, 196], [196, 236], [54, 68], [68, 104], [104, 54], [193, 168], [168, 8], [8, 193], [117, 228], [228, 31], [31, 117], [189, 193], [193, 55], [55, 189], [98, 97], [97, 99], [99, 98], [126, 47], [47, 100], [100, 126], [166, 79], [79, 218], [218, 166], [155, 154], [154, 26], [26, 155], [209, 49], [49, 131], [131, 209], [135, 136], [136, 150], [150, 135], [47, 126], [126, 217], [217, 47], [223, 52], [52, 53], [53, 223], [45, 51], [51, 134], [134, 45], [211, 170], [170, 140], [140, 211], [67, 69], [69, 108], [108, 67], [43, 106], [106, 91], [91, 43], [230, 119], [119, 120], [120, 230], [226, 130], [130, 247], [247, 226], [63, 53], [53, 52], [52, 63], [238, 20], [20, 242], [242, 238], [46, 70], [70, 156], [156, 46], [78, 62], [62, 96], [96, 78], [46, 53], [53, 63], [63, 46], [143, 34], [34, 227], [227, 143], [123, 117], [117, 111], [111, 123], [44, 125], [125, 19], [19, 44], [236, 134], [134, 51], [51, 236], [216, 206], [206, 205], [205, 216], [154, 153], [153, 22], [22, 154], [39, 37], [37, 167], [167, 39], [200, 201], [201, 208], [208, 200], [36, 142], [142, 100], [100, 36], [57, 212], [212, 202], [202, 57], [20, 60], [60, 99], [99, 20], [28, 158], [158, 157], [157, 28], [35, 226], [226, 113], [113, 35], [160, 159], [159, 27], [27, 160], [204, 202], [202, 210], [210, 204], [113, 225], [225, 46], [46, 113], [43, 202], [202, 204], [204, 43], [62, 76], [76, 77], [77, 62], [137, 123], [123, 116], [116, 137], [41, 38], [38, 72], [72, 41], [203, 129], [129, 142], [142, 203], [64, 98], [98, 240], [240, 64], [49, 102], [102, 64], [64, 49], [41, 73], [73, 74], [74, 41], [212, 216], [216, 207], [207, 212], [42, 74], [74, 184], [184, 42], [169, 170], [170, 211], [211, 169], [170, 149], [149, 176], [176, 170], [105, 66], [66, 69], [69, 105], [122, 6], [6, 168], [168, 122], [123, 147], [147, 187], [187, 123], [96, 77], [77, 90], [90, 96], [65, 55], [55, 107], [107, 65], [89, 90], [90, 180], [180, 89], [101, 100], [100, 120], [120, 101], [63, 105], [105, 104], [104, 63], [93, 137], [137, 227], [227, 93], [15, 86], [86, 85], [85, 15], [129, 102], [102, 49], [49, 129], [14, 87], [87, 86], [86, 14], [55, 8], [8, 9], [9, 55], [100, 47], [47, 121], [121, 100], [145, 23], [23, 22], [22, 145], [88, 89], [89, 179], [179, 88], [6, 122], [122, 196], [196, 6], [88, 95], [95, 96], [96, 88], [138, 172], [172, 136], [136, 138], [215, 58], [58, 172], [172, 215], [115, 48], [48, 219], [219, 115], [42, 80], [80, 81], [81, 42], [195, 3], [3, 51], [51, 195], [43, 146], [146, 61], [61, 43], [171, 175], [175, 199], [199, 171], [81, 82], [82, 38], [38, 81], [53, 46], [46, 225], [225, 53], [144, 163], [163, 110], [110, 144], [52, 65], [65, 66], [66, 52], [229, 228], [228, 117], [117, 229], [34, 127], [127, 234], [234, 34], [107, 108], [108, 69], [69, 107], [109, 108], [108, 151], [151, 109], [48, 64], [64, 235], [235, 48], [62, 78], [78, 191], [191, 62], [129, 209], [209, 126], [126, 129], [111, 35], [35, 143], [143, 111], [117, 123], [123, 50], [50, 117], [222, 65], [65, 52], [52, 222], [19, 125], [125, 141], [141, 19], [221, 55], [55, 65], [65, 221], [3, 195], [195, 197], [197, 3], [25, 7], [7, 33], [33, 25], [220, 237], [237, 44], [44, 220], [70, 71], [71, 139], [139, 70], [122, 193], [193, 245], [245, 122], [247, 130], [130, 33], [33, 247], [71, 21], [21, 162], [162, 71], [170, 169], [169, 150], [150, 170], [188, 174], [174, 196], [196, 188], [216, 186], [186, 92], [92, 216], [2, 97], [97, 167], [167, 2], [141, 125], [125, 241], [241, 141], [164, 167], [167, 37], [37, 164], [72, 38], [38, 12], [12, 72], [38, 82], [82, 13], [13, 38], [63, 68], [68, 71], [71, 63], [226, 35], [35, 111], [111, 226], [101, 50], [50, 205], [205, 101], [206, 92], [92, 165], [165, 206], [209, 198], [198, 217], [217, 209], [165, 167], [167, 97], [97, 165], [220, 115], [115, 218], [218, 220], [133, 112], [112, 243], [243, 133], [239, 238], [238, 241], [241, 239], [214, 135], [135, 169], [169, 214], [190, 173], [173, 133], [133, 190], [171, 208], [208, 32], [32, 171], [125, 44], [44, 237], [237, 125], [86, 87], [87, 178], [178, 86], [85, 86], [86, 179], [179, 85], [84, 85], [85, 180], [180, 84], [83, 84], [84, 181], [181, 83], [201, 83], [83, 182], [182, 201], [137, 93], [93, 132], [132, 137], [76, 62], [62, 183], [183, 76], [61, 76], [76, 184], [184, 61], [57, 61], [61, 185], [185, 57], [212, 57], [57, 186], [186, 212], [214, 207], [207, 187], [187, 214], [34, 143], [143, 156], [156, 34], [79, 239], [239, 237], [237, 79], [123, 137], [137, 177], [177, 123], [44, 1], [1, 4], [4, 44], [201, 194], [194, 32], [32, 201], [64, 102], [102, 129], [129, 64], [213, 215], [215, 138], [138, 213], [59, 166], [166, 219], [219, 59], [242, 99], [99, 97], [97, 242], [2, 94], [94, 141], [141, 2], [75, 59], [59, 235], [235, 75], [24, 110], [110, 228], [228, 24], [25, 130], [130, 226], [226, 25], [23, 24], [24, 229], [229, 23], [22, 23], [23, 230], [230, 22], [26, 22], [22, 231], [231, 26], [112, 26], [26, 232], [232, 112], [189, 190], [190, 243], [243, 189], [221, 56], [56, 190], [190, 221], [28, 56], [56, 221], [221, 28], [27, 28], [28, 222], [222, 27], [29, 27], [27, 223], [223, 29], [30, 29], [29, 224], [224, 30], [247, 30], [30, 225], [225, 247], [238, 79], [79, 20], [20, 238], [166, 59], [59, 75], [75, 166], [60, 75], [75, 240], [240, 60], [147, 177], [177, 215], [215, 147], [20, 79], [79, 166], [166, 20], [187, 147], [147, 213], [213, 187], [112, 233], [233, 244], [244, 112], [233, 128], [128, 245], [245, 233], [128, 114], [114, 188], [188, 128], [114, 217], [217, 174], [174, 114], [131, 115], [115, 220], [220, 131], [217, 198], [198, 236], [236, 217], [198, 131], [131, 134], [134, 198], [177, 132], [132, 58], [58, 177], [143, 35], [35, 124], [124, 143], [110, 163], [163, 7], [7, 110], [228, 110], [110, 25], [25, 228], [356, 389], [389, 368], [368, 356], [11, 302], [302, 267], [267, 11], [452, 350], [350, 349], [349, 452], [302, 303], [303, 269], [269, 302], [357, 343], [343, 277], [277, 357], [452, 453], [453, 357], [357, 452], [333, 332], [332, 297], [297, 333], [175, 152], [152, 377], [377, 175], [347, 348], [348, 330], [330, 347], [303, 304], [304, 270], [270, 303], [9, 336], [336, 337], [337, 9], [278, 279], [279, 360], [360, 278], [418, 262], [262, 431], [431, 418], [304, 408], [408, 409], [409, 304], [310, 415], [415, 407], [407, 310], [270, 409], [409, 410], [410, 270], [450, 348], [348, 347], [347, 450], [422, 430], [430, 434], [434, 422], [313, 314], [314, 17], [17, 313], [306, 307], [307, 375], [375, 306], [387, 388], [388, 260], [260, 387], [286, 414], [414, 398], [398, 286], [335, 406], [406, 418], [418, 335], [364, 367], [367, 416], [416, 364], [423, 358], [358, 327], [327, 423], [251, 284], [284, 298], [298, 251], [281, 5], [5, 4], [4, 281], [373, 374], [374, 253], [253, 373], [307, 320], [320, 321], [321, 307], [425, 427], [427, 411], [411, 425], [421, 313], [313, 18], [18, 421], [321, 405], [405, 406], [406, 321], [320, 404], [404, 405], [405, 320], [315, 16], [16, 17], [17, 315], [426, 425], [425, 266], [266, 426], [377, 400], [400, 369], [369, 377], [322, 391], [391, 269], [269, 322], [417, 465], [465, 464], [464, 417], [386, 257], [257, 258], [258, 386], [466, 260], [260, 388], [388, 466], [456, 399], [399, 419], [419, 456], [284, 332], [332, 333], [333, 284], [417, 285], [285, 8], [8, 417], [346, 340], [340, 261], [261, 346], [413, 441], [441, 285], [285, 413], [327, 460], [460, 328], [328, 327], [355, 371], [371, 329], [329, 355], [392, 439], [439, 438], [438, 392], [382, 341], [341, 256], [256, 382], [429, 420], [420, 360], [360, 429], [364, 394], [394, 379], [379, 364], [277, 343], [343, 437], [437, 277], [443, 444], [444, 283], [283, 443], [275, 440], [440, 363], [363, 275], [431, 262], [262, 369], [369, 431], [297, 338], [338, 337], [337, 297], [273, 375], [375, 321], [321, 273], [450, 451], [451, 349], [349, 450], [446, 342], [342, 467], [467, 446], [293, 334], [334, 282], [282, 293], [458, 461], [461, 462], [462, 458], [276, 353], [353, 383], [383, 276], [308, 324], [324, 325], [325, 308], [276, 300], [300, 293], [293, 276], [372, 345], [345, 447], [447, 372], [352, 345], [345, 340], [340, 352], [274, 1], [1, 19], [19, 274], [456, 248], [248, 281], [281, 456], [436, 427], [427, 425], [425, 436], [381, 256], [256, 252], [252, 381], [269, 391], [391, 393], [393, 269], [200, 199], [199, 428], [428, 200], [266, 330], [330, 329], [329, 266], [287, 273], [273, 422], [422, 287], [250, 462], [462, 328], [328, 250], [258, 286], [286, 384], [384, 258], [265, 353], [353, 342], [342, 265], [387, 259], [259, 257], [257, 387], [424, 431], [431, 430], [430, 424], [342, 353], [353, 276], [276, 342], [273, 335], [335, 424], [424, 273], [292, 325], [325, 307], [307, 292], [366, 447], [447, 345], [345, 366], [271, 303], [303, 302], [302, 271], [423, 266], [266, 371], [371, 423], [294, 455], [455, 460], [460, 294], [279, 278], [278, 294], [294, 279], [271, 272], [272, 304], [304, 271], [432, 434], [434, 427], [427, 432], [272, 407], [407, 408], [408, 272], [394, 430], [430, 431], [431, 394], [395, 369], [369, 400], [400, 395], [334, 333], [333, 299], [299, 334], [351, 417], [417, 168], [168, 351], [352, 280], [280, 411], [411, 352], [325, 319], [319, 320], [320, 325], [295, 296], [296, 336], [336, 295], [319, 403], [403, 404], [404, 319], [330, 348], [348, 349], [349, 330], [293, 298], [298, 333], [333, 293], [323, 454], [454, 447], [447, 323], [15, 16], [16, 315], [315, 15], [358, 429], [429, 279], [279, 358], [14, 15], [15, 316], [316, 14], [285, 336], [336, 9], [9, 285], [329, 349], [349, 350], [350, 329], [374, 380], [380, 252], [252, 374], [318, 402], [402, 403], [403, 318], [6, 197], [197, 419], [419, 6], [318, 319], [319, 325], [325, 318], [367, 364], [364, 365], [365, 367], [435, 367], [367, 397], [397, 435], [344, 438], [438, 439], [439, 344], [272, 271], [271, 311], [311, 272], [195, 5], [5, 281], [281, 195], [273, 287], [287, 291], [291, 273], [396, 428], [428, 199], [199, 396], [311, 271], [271, 268], [268, 311], [283, 444], [444, 445], [445, 283], [373, 254], [254, 339], [339, 373], [282, 334], [334, 296], [296, 282], [449, 347], [347, 346], [346, 449], [264, 447], [447, 454], [454, 264], [336, 296], [296, 299], [299, 336], [338, 10], [10, 151], [151, 338], [278, 439], [439, 455], [455, 278], [292, 407], [407, 415], [415, 292], [358, 371], [371, 355], [355, 358], [340, 345], [345, 372], [372, 340], [346, 347], [347, 280], [280, 346], [442, 443], [443, 282], [282, 442], [19, 94], [94, 370], [370, 19], [441, 442], [442, 295], [295, 441], [248, 419], [419, 197], [197, 248], [263, 255], [255, 359], [359, 263], [440, 275], [275, 274], [274, 440], [300, 383], [383, 368], [368, 300], [351, 412], [412, 465], [465, 351], [263, 467], [467, 466], [466, 263], [301, 368], [368, 389], [389, 301], [395, 378], [378, 379], [379, 395], [412, 351], [351, 419], [419, 412], [436, 426], [426, 322], [322, 436], [2, 164], [164, 393], [393, 2], [370, 462], [462, 461], [461, 370], [164, 0], [0, 267], [267, 164], [302, 11], [11, 12], [12, 302], [268, 12], [12, 13], [13, 268], [293, 300], [300, 301], [301, 293], [446, 261], [261, 340], [340, 446], [330, 266], [266, 425], [425, 330], [426, 423], [423, 391], [391, 426], [429, 355], [355, 437], [437, 429], [391, 327], [327, 326], [326, 391], [440, 457], [457, 438], [438, 440], [341, 382], [382, 362], [362, 341], [459, 457], [457, 461], [461, 459], [434, 430], [430, 394], [394, 434], [414, 463], [463, 362], [362, 414], [396, 369], [369, 262], [262, 396], [354, 461], [461, 457], [457, 354], [316, 403], [403, 402], [402, 316], [315, 404], [404, 403], [403, 315], [314, 405], [405, 404], [404, 314], [313, 406], [406, 405], [405, 313], [421, 418], [418, 406], [406, 421], [366, 401], [401, 361], [361, 366], [306, 408], [408, 407], [407, 306], [291, 409], [409, 408], [408, 291], [287, 410], [410, 409], [409, 287], [432, 436], [436, 410], [410, 432], [434, 416], [416, 411], [411, 434], [264, 368], [368, 383], [383, 264], [309, 438], [438, 457], [457, 309], [352, 376], [376, 401], [401, 352], [274, 275], [275, 4], [4, 274], [421, 428], [428, 262], [262, 421], [294, 327], [327, 358], [358, 294], [433, 416], [416, 367], [367, 433], [289, 455], [455, 439], [439, 289], [462, 370], [370, 326], [326, 462], [2, 326], [326, 370], [370, 2], [305, 460], [460, 455], [455, 305], [254, 449], [449, 448], [448, 254], [255, 261], [261, 446], [446, 255], [253, 450], [450, 449], [449, 253], [252, 451], [451, 450], [450, 252], [256, 452], [452, 451], [451, 256], [341, 453], [453, 452], [452, 341], [413, 464], [464, 463], [463, 413], [441, 413], [413, 414], [414, 441], [258, 442], [442, 441], [441, 258], [257, 443], [443, 442], [442, 257], [259, 444], [444, 443], [443, 259], [260, 445], [445, 444], [444, 260], [467, 342], [342, 445], [445, 467], [459, 458], [458, 250], [250, 459], [289, 392], [392, 290], [290, 289], [290, 328], [328, 460], [460, 290], [376, 433], [433, 435], [435, 376], [250, 290], [290, 392], [392, 250], [411, 416], [416, 433], [433, 411], [341, 463], [463, 464], [464, 341], [453, 464], [464, 465], [465, 453], [357, 465], [465, 412], [412, 357], [343, 412], [412, 399], [399, 343], [360, 363], [363, 440], [440, 360], [437, 399], [399, 456], [456, 437], [420, 456], [456, 363], [363, 420], [401, 435], [435, 288], [288, 401], [372, 383], [383, 353], [353, 372], [339, 255], [255, 249], [249, 339], [448, 261], [261, 255], [255, 448], [133, 243], [243, 190], [190, 133], [133, 155], [155, 112], [112, 133], [33, 246], [246, 247], [247, 33], [33, 130], [130, 25], [25, 33], [398, 384], [384, 286], [286, 398], [362, 398], [398, 414], [414, 362], [362, 463], [463, 341], [341, 362], [263, 359], [359, 467], [467, 263], [263, 249], [249, 255], [255, 263], [466, 467], [467, 260], [260, 466], [75, 60], [60, 166], [166, 75], [238, 239], [239, 79], [79, 238], [162, 127], [127, 139], [139, 162], [72, 11], [11, 37], [37, 72], [121, 232], [232, 120], [120, 121], [73, 72], [72, 39], [39, 73], [114, 128], [128, 47], [47, 114], [233, 232], [232, 128], [128, 233], [103, 104], [104, 67], [67, 103], [152, 175], [175, 148], [148, 152], [119, 118], [118, 101], [101, 119], [74, 73], [73, 40], [40, 74], [107, 9], [9, 108], [108, 107], [49, 48], [48, 131], [131, 49], [32, 194], [194, 211], [211, 32], [184, 74], [74, 185], [185, 184], [191, 80], [80, 183], [183, 191], [185, 40], [40, 186], [186, 185], [119, 230], [230, 118], [118, 119], [210, 202], [202, 214], [214, 210], [84, 83], [83, 17], [17, 84], [77, 76], [76, 146], [146, 77], [161, 160], [160, 30], [30, 161], [190, 56], [56, 173], [173, 190], [182, 106], [106, 194], [194, 182], [138, 135], [135, 192], [192, 138], [129, 203], [203, 98], [98, 129], [54, 21], [21, 68], [68, 54], [5, 51], [51, 4], [4, 5], [145, 144], [144, 23], [23, 145], [90, 77], [77, 91], [91, 90], [207, 205], [205, 187], [187, 207], [83, 201], [201, 18], [18, 83], [181, 91], [91, 182], [182, 181], [180, 90], [90, 181], [181, 180], [16, 85], [85, 17], [17, 16], [205, 206], [206, 36], [36, 205], [176, 148], [148, 140], [140, 176], [165, 92], [92, 39], [39, 165], [245, 193], [193, 244], [244, 245], [27, 159], [159, 28], [28, 27], [30, 247], [247, 161], [161, 30], [174, 236], [236, 196], [196, 174], [103, 54], [54, 104], [104, 103], [55, 193], [193, 8], [8, 55], [111, 117], [117, 31], [31, 111], [221, 189], [189, 55], [55, 221], [240, 98], [98, 99], [99, 240], [142, 126], [126, 100], [100, 142], [219, 166], [166, 218], [218, 219], [112, 155], [155, 26], [26, 112], [198, 209], [209, 131], [131, 198], [169, 135], [135, 150], [150, 169], [114, 47], [47, 217], [217, 114], [224, 223], [223, 53], [53, 224], [220, 45], [45, 134], [134, 220], [32, 211], [211, 140], [140, 32], [109, 67], [67, 108], [108, 109], [146, 43], [43, 91], [91, 146], [231, 230], [230, 120], [120, 231], [113, 226], [226, 247], [247, 113], [105, 63], [63, 52], [52, 105], [241, 238], [238, 242], [242, 241], [124, 46], [46, 156], [156, 124], [95, 78], [78, 96], [96, 95], [70, 46], [46, 63], [63, 70], [116, 143], [143, 227], [227, 116], [116, 123], [123, 111], [111, 116], [1, 44], [44, 19], [19, 1], [3, 236], [236, 51], [51, 3], [207, 216], [216, 205], [205, 207], [26, 154], [154, 22], [22, 26], [165, 39], [39, 167], [167, 165], [199, 200], [200, 208], [208, 199], [101, 36], [36, 100], [100, 101], [43, 57], [57, 202], [202, 43], [242, 20], [20, 99], [99, 242], [56, 28], [28, 157], [157, 56], [124, 35], [35, 113], [113, 124], [29, 160], [160, 27], [27, 29], [211, 204], [204, 210], [210, 211], [124, 113], [113, 46], [46, 124], [106, 43], [43, 204], [204, 106], [96, 62], [62, 77], [77, 96], [227, 137], [137, 116], [116, 227], [73, 41], [41, 72], [72, 73], [36, 203], [203, 142], [142, 36], [235, 64], [64, 240], [240, 235], [48, 49], [49, 64], [64, 48], [42, 41], [41, 74], [74, 42], [214, 212], [212, 207], [207, 214], [183, 42], [42, 184], [184, 183], [210, 169], [169, 211], [211, 210], [140, 170], [170, 176], [176, 140], [104, 105], [105, 69], [69, 104], [193, 122], [122, 168], [168, 193], [50, 123], [123, 187], [187, 50], [89, 96], [96, 90], [90, 89], [66, 65], [65, 107], [107, 66], [179, 89], [89, 180], [180, 179], [119, 101], [101, 120], [120, 119], [68, 63], [63, 104], [104, 68], [234, 93], [93, 227], [227, 234], [16, 15], [15, 85], [85, 16], [209, 129], [129, 49], [49, 209], [15, 14], [14, 86], [86, 15], [107, 55], [55, 9], [9, 107], [120, 100], [100, 121], [121, 120], [153, 145], [145, 22], [22, 153], [178, 88], [88, 179], [179, 178], [197, 6], [6, 196], [196, 197], [89, 88], [88, 96], [96, 89], [135, 138], [138, 136], [136, 135], [138, 215], [215, 172], [172, 138], [218, 115], [115, 219], [219, 218], [41, 42], [42, 81], [81, 41], [5, 195], [195, 51], [51, 5], [57, 43], [43, 61], [61, 57], [208, 171], [171, 199], [199, 208], [41, 81], [81, 38], [38, 41], [224, 53], [53, 225], [225, 224], [24, 144], [144, 110], [110, 24], [105, 52], [52, 66], [66, 105], [118, 229], [229, 117], [117, 118], [227, 34], [34, 234], [234, 227], [66, 107], [107, 69], [69, 66], [10, 109], [109, 151], [151, 10], [219, 48], [48, 235], [235, 219], [183, 62], [62, 191], [191, 183], [142, 129], [129, 126], [126, 142], [116, 111], [111, 143], [143, 116], [118, 117], [117, 50], [50, 118], [223, 222], [222, 52], [52, 223], [94, 19], [19, 141], [141, 94], [222, 221], [221, 65], [65, 222], [196, 3], [3, 197], [197, 196], [45, 220], [220, 44], [44, 45], [156, 70], [70, 139], [139, 156], [188, 122], [122, 245], [245, 188], [139, 71], [71, 162], [162, 139], [149, 170], [170, 150], [150, 149], [122, 188], [188, 196], [196, 122], [206, 216], [216, 92], [92, 206], [164, 2], [2, 167], [167, 164], [242, 141], [141, 241], [241, 242], [0, 164], [164, 37], [37, 0], [11, 72], [72, 12], [12, 11], [12, 38], [38, 13], [13, 12], [70, 63], [63, 71], [71, 70], [31, 226], [226, 111], [111, 31], [36, 101], [101, 205], [205, 36], [203, 206], [206, 165], [165, 203], [126, 209], [209, 217], [217, 126], [98, 165], [165, 97], [97, 98], [237, 220], [220, 218], [218, 237], [237, 239], [239, 241], [241, 237], [210, 214], [214, 169], [169, 210], [140, 171], [171, 32], [32, 140], [241, 125], [125, 237], [237, 241], [179, 86], [86, 178], [178, 179], [180, 85], [85, 179], [179, 180], [181, 84], [84, 180], [180, 181], [182, 83], [83, 181], [181, 182], [194, 201], [201, 182], [182, 194], [177, 137], [137, 132], [132, 177], [184, 76], [76, 183], [183, 184], [185, 61], [61, 184], [184, 185], [186, 57], [57, 185], [185, 186], [216, 212], [212, 186], [186, 216], [192, 214], [214, 187], [187, 192], [139, 34], [34, 156], [156, 139], [218, 79], [79, 237], [237, 218], [147, 123], [123, 177], [177, 147], [45, 44], [44, 4], [4, 45], [208, 201], [201, 32], [32, 208], [98, 64], [64, 129], [129, 98], [192, 213], [213, 138], [138, 192], [235, 59], [59, 219], [219, 235], [141, 242], [242, 97], [97, 141], [97, 2], [2, 141], [141, 97], [240, 75], [75, 235], [235, 240], [229, 24], [24, 228], [228, 229], [31, 25], [25, 226], [226, 31], [230, 23], [23, 229], [229, 230], [231, 22], [22, 230], [230, 231], [232, 26], [26, 231], [231, 232], [233, 112], [112, 232], [232, 233], [244, 189], [189, 243], [243, 244], [189, 221], [221, 190], [190, 189], [222, 28], [28, 221], [221, 222], [223, 27], [27, 222], [222, 223], [224, 29], [29, 223], [223, 224], [225, 30], [30, 224], [224, 225], [113, 247], [247, 225], [225, 113], [99, 60], [60, 240], [240, 99], [213, 147], [147, 215], [215, 213], [60, 20], [20, 166], [166, 60], [192, 187], [187, 213], [213, 192], [243, 112], [112, 244], [244, 243], [244, 233], [233, 245], [245, 244], [245, 128], [128, 188], [188, 245], [188, 114], [114, 174], [174, 188], [134, 131], [131, 220], [220, 134], [174, 217], [217, 236], [236, 174], [236, 198], [198, 134], [134, 236], [215, 177], [177, 58], [58, 215], [156, 143], [143, 124], [124, 156], [25, 110], [110, 7], [7, 25], [31, 228], [228, 25], [25, 31], [264, 356], [356, 368], [368, 264], [0, 11], [11, 267], [267, 0], [451, 452], [452, 349], [349, 451], [267, 302], [302, 269], [269, 267], [350, 357], [357, 277], [277, 350], [350, 452], [452, 357], [357, 350], [299, 333], [333, 297], [297, 299], [396, 175], [175, 377], [377, 396], [280, 347], [347, 330], [330, 280], [269, 303], [303, 270], [270, 269], [151, 9], [9, 337], [337, 151], [344, 278], [278, 360], [360, 344], [424, 418], [418, 431], [431, 424], [270, 304], [304, 409], [409, 270], [272, 310], [310, 407], [407, 272], [322, 270], [270, 410], [410, 322], [449, 450], [450, 347], [347, 449], [432, 422], [422, 434], [434, 432], [18, 313], [313, 17], [17, 18], [291, 306], [306, 375], [375, 291], [259, 387], [387, 260], [260, 259], [424, 335], [335, 418], [418, 424], [434, 364], [364, 416], [416, 434], [391, 423], [423, 327], [327, 391], [301, 251], [251, 298], [298, 301], [275, 281], [281, 4], [4, 275], [254, 373], [373, 253], [253, 254], [375, 307], [307, 321], [321, 375], [280, 425], [425, 411], [411, 280], [200, 421], [421, 18], [18, 200], [335, 321], [321, 406], [406, 335], [321, 320], [320, 405], [405, 321], [314, 315], [315, 17], [17, 314], [423, 426], [426, 266], [266, 423], [396, 377], [377, 369], [369, 396], [270, 322], [322, 269], [269, 270], [413, 417], [417, 464], [464, 413], [385, 386], [386, 258], [258, 385], [248, 456], [456, 419], [419, 248], [298, 284], [284, 333], [333, 298], [168, 417], [417, 8], [8, 168], [448, 346], [346, 261], [261, 448], [417, 413], [413, 285], [285, 417], [326, 327], [327, 328], [328, 326], [277, 355], [355, 329], [329, 277], [309, 392], [392, 438], [438, 309], [381, 382], [382, 256], [256, 381], [279, 429], [429, 360], [360, 279], [365, 364], [364, 379], [379, 365], [355, 277], [277, 437], [437, 355], [282, 443], [443, 283], [283, 282], [281, 275], [275, 363], [363, 281], [395, 431], [431, 369], [369, 395], [299, 297], [297, 337], [337, 299], [335, 273], [273, 321], [321, 335], [348, 450], [450, 349], [349, 348], [359, 446], [446, 467], [467, 359], [283, 293], [293, 282], [282, 283], [250, 458], [458, 462], [462, 250], [300, 276], [276, 383], [383, 300], [292, 308], [308, 325], [325, 292], [283, 276], [276, 293], [293, 283], [264, 372], [372, 447], [447, 264], [346, 352], [352, 340], [340, 346], [354, 274], [274, 19], [19, 354], [363, 456], [456, 281], [281, 363], [426, 436], [436, 425], [425, 426], [380, 381], [381, 252], [252, 380], [267, 269], [269, 393], [393, 267], [421, 200], [200, 428], [428, 421], [371, 266], [266, 329], [329, 371], [432, 287], [287, 422], [422, 432], [290, 250], [250, 328], [328, 290], [385, 258], [258, 384], [384, 385], [446, 265], [265, 342], [342, 446], [386, 387], [387, 257], [257, 386], [422, 424], [424, 430], [430, 422], [445, 342], [342, 276], [276, 445], [422, 273], [273, 424], [424, 422], [306, 292], [292, 307], [307, 306], [352, 366], [366, 345], [345, 352], [268, 271], [271, 302], [302, 268], [358, 423], [423, 371], [371, 358], [327, 294], [294, 460], [460, 327], [331, 279], [279, 294], [294, 331], [303, 271], [271, 304], [304, 303], [436, 432], [432, 427], [427, 436], [304, 272], [272, 408], [408, 304], [395, 394], [394, 431], [431, 395], [378, 395], [395, 400], [400, 378], [296, 334], [334, 299], [299, 296], [6, 351], [351, 168], [168, 6], [376, 352], [352, 411], [411, 376], [307, 325], [325, 320], [320, 307], [285, 295], [295, 336], [336, 285], [320, 319], [319, 404], [404, 320], [329, 330], [330, 349], [349, 329], [334, 293], [293, 333], [333, 334], [366, 323], [323, 447], [447, 366], [316, 15], [15, 315], [315, 316], [331, 358], [358, 279], [279, 331], [317, 14], [14, 316], [316, 317], [8, 285], [285, 9], [9, 8], [277, 329], [329, 350], [350, 277], [253, 374], [374, 252], [252, 253], [319, 318], [318, 403], [403, 319], [351, 6], [6, 419], [419, 351], [324, 318], [318, 325], [325, 324], [397, 367], [367, 365], [365, 397], [288, 435], [435, 397], [397, 288], [278, 344], [344, 439], [439, 278], [310, 272], [272, 311], [311, 310], [248, 195], [195, 281], [281, 248], [375, 273], [273, 291], [291, 375], [175, 396], [396, 199], [199, 175], [312, 311], [311, 268], [268, 312], [276, 283], [283, 445], [445, 276], [390, 373], [373, 339], [339, 390], [295, 282], [282, 296], [296, 295], [448, 449], [449, 346], [346, 448], [356, 264], [264, 454], [454, 356], [337, 336], [336, 299], [299, 337], [337, 338], [338, 151], [151, 337], [294, 278], [278, 455], [455, 294], [308, 292], [292, 415], [415, 308], [429, 358], [358, 355], [355, 429], [265, 340], [340, 372], [372, 265], [352, 346], [346, 280], [280, 352], [295, 442], [442, 282], [282, 295], [354, 19], [19, 370], [370, 354], [285, 441], [441, 295], [295, 285], [195, 248], [248, 197], [197, 195], [457, 440], [440, 274], [274, 457], [301, 300], [300, 368], [368, 301], [417, 351], [351, 465], [465, 417], [251, 301], [301, 389], [389, 251], [394, 395], [395, 379], [379, 394], [399, 412], [412, 419], [419, 399], [410, 436], [436, 322], [322, 410], [326, 2], [2, 393], [393, 326], [354, 370], [370, 461], [461, 354], [393, 164], [164, 267], [267, 393], [268, 302], [302, 12], [12, 268], [312, 268], [268, 13], [13, 312], [298, 293], [293, 301], [301, 298], [265, 446], [446, 340], [340, 265], [280, 330], [330, 425], [425, 280], [322, 426], [426, 391], [391, 322], [420, 429], [429, 437], [437, 420], [393, 391], [391, 326], [326, 393], [344, 440], [440, 438], [438, 344], [458, 459], [459, 461], [461, 458], [364, 434], [434, 394], [394, 364], [428, 396], [396, 262], [262, 428], [274, 354], [354, 457], [457, 274], [317, 316], [316, 402], [402, 317], [316, 315], [315, 403], [403, 316], [315, 314], [314, 404], [404, 315], [314, 313], [313, 405], [405, 314], [313, 421], [421, 406], [406, 313], [323, 366], [366, 361], [361, 323], [292, 306], [306, 407], [407, 292], [306, 291], [291, 408], [408, 306], [291, 287], [287, 409], [409, 291], [287, 432], [432, 410], [410, 287], [427, 434], [434, 411], [411, 427], [372, 264], [264, 383], [383, 372], [459, 309], [309, 457], [457, 459], [366, 352], [352, 401], [401, 366], [1, 274], [274, 4], [4, 1], [418, 421], [421, 262], [262, 418], [331, 294], [294, 358], [358, 331], [435, 433], [433, 367], [367, 435], [392, 289], [289, 439], [439, 392], [328, 462], [462, 326], [326, 328], [94, 2], [2, 370], [370, 94], [289, 305], [305, 455], [455, 289], [339, 254], [254, 448], [448, 339], [359, 255], [255, 446], [446, 359], [254, 253], [253, 449], [449, 254], [253, 252], [252, 450], [450, 253], [252, 256], [256, 451], [451, 252], [256, 341], [341, 452], [452, 256], [414, 413], [413, 463], [463, 414], [286, 441], [441, 414], [414, 286], [286, 258], [258, 441], [441, 286], [258, 257], [257, 442], [442, 258], [257, 259], [259, 443], [443, 257], [259, 260], [260, 444], [444, 259], [260, 467], [467, 445], [445, 260], [309, 459], [459, 250], [250, 309], [305, 289], [289, 290], [290, 305], [305, 290], [290, 460], [460, 305], [401, 376], [376, 435], [435, 401], [309, 250], [250, 392], [392, 309], [376, 411], [411, 433], [433, 376], [453, 341], [341, 464], [464, 453], [357, 453], [453, 465], [465, 357], [343, 357], [357, 412], [412, 343], [437, 343], [343, 399], [399, 437], [344, 360], [360, 440], [440, 344], [420, 437], [437, 456], [456, 420], [360, 420], [420, 363], [363, 360], [361, 401], [401, 288], [288, 361], [265, 372], [372, 353], [353, 265], [390, 339], [339, 249], [249, 390], [339, 448], [448, 255], [255, 339]);
function io(e) {
  e.j = { faceLandmarks: [], faceBlendshapes: [], facialTransformationMatrixes: [] };
}
var j = class extends fe {
  constructor(e, t) {
    super(new Fe(e, t), "image_in", "norm_rect", !1), this.j = { faceLandmarks: [], faceBlendshapes: [], facialTransformationMatrixes: [] }, this.outputFacialTransformationMatrixes = this.outputFaceBlendshapes = !1, y(e = this.h = new Ha(), 0, 1, t = new U()), this.v = new ja(), y(this.h, 0, 3, this.v), this.s = new ar(), y(this.h, 0, 2, this.s), je(this.s, 4, 1), p(this.s, 2, 0.5), p(this.v, 2, 0.5), p(this.h, 4, 0.5);
  }
  get baseOptions() {
    return T(this.h, U, 1);
  }
  set baseOptions(e) {
    y(this.h, 0, 1, e);
  }
  o(e) {
    return "numFaces" in e && je(this.s, 4, e.numFaces ?? 1), "minFaceDetectionConfidence" in e && p(this.s, 2, e.minFaceDetectionConfidence ?? 0.5), "minTrackingConfidence" in e && p(this.h, 4, e.minTrackingConfidence ?? 0.5), "minFacePresenceConfidence" in e && p(this.v, 2, e.minFacePresenceConfidence ?? 0.5), "outputFaceBlendshapes" in e && (this.outputFaceBlendshapes = !!e.outputFaceBlendshapes), "outputFacialTransformationMatrixes" in e && (this.outputFacialTransformationMatrixes = !!e.outputFacialTransformationMatrixes), this.l(e);
  }
  D(e, t) {
    return io(this), Oe(this, e, t), this.j;
  }
  F(e, t, n) {
    return io(this), He(this, e, n, t), this.j;
  }
  m() {
    var e = new de();
    C(e, "image_in"), C(e, "norm_rect"), L(e, "face_landmarks");
    const t = new we();
    Pe(t, P1, this.h);
    const n = new ae();
    Ee(n, "mediapipe.tasks.vision.face_landmarker.FaceLandmarkerGraph"), I(n, "IMAGE:image_in"), I(n, "NORM_RECT:norm_rect"), k(n, "NORM_LANDMARKS:face_landmarks"), n.o(t), be(e, n), this.g.attachProtoVectorListener("face_landmarks", ((r, s) => {
      for (const i of r) r = dn(i), this.j.faceLandmarks.push(cr(r));
      f(this, s);
    })), this.g.attachEmptyPacketListener("face_landmarks", ((r) => {
      f(this, r);
    })), this.outputFaceBlendshapes && (L(e, "blendshapes"), k(n, "BLENDSHAPES:blendshapes"), this.g.attachProtoVectorListener("blendshapes", ((r, s) => {
      if (this.outputFaceBlendshapes) for (const i of r) r = or(i), this.j.faceBlendshapes.push(Xs(r.g() ?? []));
      f(this, s);
    })), this.g.attachEmptyPacketListener("blendshapes", ((r) => {
      f(this, r);
    }))), this.outputFacialTransformationMatrixes && (L(e, "face_geometry"), k(n, "FACE_GEOMETRY:face_geometry"), this.g.attachProtoVectorListener("face_geometry", ((r, s) => {
      if (this.outputFacialTransformationMatrixes) for (const i of r) (r = T(O1(i), b1, 2)) && this.j.facialTransformationMatrixes.push({ rows: Se(r, 1) ?? 0 ?? 0, columns: Se(r, 2) ?? 0 ?? 0, data: yt(r, 3, ht, mt()).slice() ?? [] });
      f(this, s);
    })), this.g.attachEmptyPacketListener("face_geometry", ((r) => {
      f(this, r);
    }))), e = e.g(), this.setGraph(new Uint8Array(e), !0);
  }
};
j.prototype.detectForVideo = j.prototype.F, j.prototype.detect = j.prototype.D, j.prototype.setOptions = j.prototype.o, j.createFromModelPath = function(e, t) {
  return A(j, e, { baseOptions: { modelAssetPath: t } });
}, j.createFromModelBuffer = function(e, t) {
  return A(j, e, { baseOptions: { modelAssetBuffer: t } });
}, j.createFromOptions = function(e, t) {
  return A(j, e, t);
}, j.FACE_LANDMARKS_LIPS = ti, j.FACE_LANDMARKS_LEFT_EYE = ni, j.FACE_LANDMARKS_LEFT_EYEBROW = ri, j.FACE_LANDMARKS_LEFT_IRIS = m2, j.FACE_LANDMARKS_RIGHT_EYE = si, j.FACE_LANDMARKS_RIGHT_EYEBROW = ii, j.FACE_LANDMARKS_RIGHT_IRIS = y2, j.FACE_LANDMARKS_FACE_OVAL = oi, j.FACE_LANDMARKS_CONTOURS = _2, j.FACE_LANDMARKS_TESSELATION = w2;
var Ue = class extends fe {
  constructor(e, t) {
    super(new Fe(e, t), "image_in", "norm_rect", !0), y(e = this.j = new za(), 0, 1, t = new U());
  }
  get baseOptions() {
    return T(this.j, U, 1);
  }
  set baseOptions(e) {
    y(this.j, 0, 1, e);
  }
  o(e) {
    return super.l(e);
  }
  Oa(e, t, n) {
    const r = typeof t != "function" ? t : {};
    if (this.h = typeof t == "function" ? t : n, Oe(this, e, r ?? {}), !this.h) return this.s;
  }
  m() {
    var e = new de();
    C(e, "image_in"), C(e, "norm_rect"), L(e, "stylized_image");
    const t = new we();
    Pe(t, R1, this.j);
    const n = new ae();
    Ee(n, "mediapipe.tasks.vision.face_stylizer.FaceStylizerGraph"), I(n, "IMAGE:image_in"), I(n, "NORM_RECT:norm_rect"), k(n, "STYLIZED_IMAGE:stylized_image"), n.o(t), be(e, n), this.g.U("stylized_image", ((r, s) => {
      var i = !this.h, o = r.data, a = r.width;
      const c = a * (r = r.height);
      if (o instanceof Uint8Array) if (o.length === 3 * c) {
        const u = new Uint8ClampedArray(4 * c);
        for (let h = 0; h < c; ++h) u[4 * h] = o[3 * h], u[4 * h + 1] = o[3 * h + 1], u[4 * h + 2] = o[3 * h + 2], u[4 * h + 3] = 255;
        o = new ImageData(u, a, r);
      } else {
        if (o.length !== 4 * c) throw Error("Unsupported channel count: " + o.length / c);
        o = new ImageData(new Uint8ClampedArray(o.buffer, o.byteOffset, o.length), a, r);
      }
      else if (!(o instanceof WebGLTexture)) throw Error(`Unsupported format: ${o.constructor.name}`);
      a = new te([o], !1, !1, this.g.i.canvas, this.O, a, r), this.s = i = i ? a.clone() : a, this.h && this.h(i), f(this, s);
    })), this.g.attachEmptyPacketListener("stylized_image", ((r) => {
      this.s = null, this.h && this.h(null), f(this, r);
    })), e = e.g(), this.setGraph(new Uint8Array(e), !0);
  }
};
Ue.prototype.stylize = Ue.prototype.Oa, Ue.prototype.setOptions = Ue.prototype.o, Ue.createFromModelPath = function(e, t) {
  return A(Ue, e, { baseOptions: { modelAssetPath: t } });
}, Ue.createFromModelBuffer = function(e, t) {
  return A(Ue, e, { baseOptions: { modelAssetBuffer: t } });
}, Ue.createFromOptions = function(e, t) {
  return A(Ue, e, t);
};
var ai = Ce([0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8], [5, 9], [9, 10], [10, 11], [11, 12], [9, 13], [13, 14], [14, 15], [15, 16], [13, 17], [0, 17], [17, 18], [18, 19], [19, 20]);
function oo(e) {
  e.gestures = [], e.landmarks = [], e.worldLandmarks = [], e.handedness = [];
}
function ao(e) {
  return e.gestures.length === 0 ? { gestures: [], landmarks: [], worldLandmarks: [], handedness: [], handednesses: [] } : { gestures: e.gestures, landmarks: e.landmarks, worldLandmarks: e.worldLandmarks, handedness: e.handedness, handednesses: e.handedness };
}
function co(e, t = !0) {
  const n = [];
  for (const s of e) {
    var r = or(s);
    e = [];
    for (const i of r.g()) r = t && Se(i, 1) != null ? Se(i, 1) ?? 0 : -1, e.push({ score: q(i, 2) ?? 0, index: r, categoryName: xe(i, 3) ?? "" ?? "", displayName: xe(i, 4) ?? "" ?? "" });
    n.push(e);
  }
  return n;
}
var pe = class extends fe {
  constructor(e, t) {
    super(new Fe(e, t), "image_in", "norm_rect", !1), this.gestures = [], this.landmarks = [], this.worldLandmarks = [], this.handedness = [], y(e = this.j = new $a(), 0, 1, t = new U()), this.s = new zs(), y(this.j, 0, 2, this.s), this.C = new Ws(), y(this.s, 0, 3, this.C), this.v = new Ka(), y(this.s, 0, 2, this.v), this.h = new I1(), y(this.j, 0, 3, this.h), p(this.v, 2, 0.5), p(this.s, 4, 0.5), p(this.C, 2, 0.5);
  }
  get baseOptions() {
    return T(this.j, U, 1);
  }
  set baseOptions(e) {
    y(this.j, 0, 1, e);
  }
  o(e) {
    var s, i, o, a;
    if (je(this.v, 3, e.numHands ?? 1), "minHandDetectionConfidence" in e && p(this.v, 2, e.minHandDetectionConfidence ?? 0.5), "minTrackingConfidence" in e && p(this.s, 4, e.minTrackingConfidence ?? 0.5), "minHandPresenceConfidence" in e && p(this.C, 2, e.minHandPresenceConfidence ?? 0.5), e.cannedGesturesClassifierOptions) {
      var t = new kt(), n = t, r = $r(e.cannedGesturesClassifierOptions, (s = T(this.h, kt, 3)) == null ? void 0 : s.h());
      y(n, 0, 2, r), y(this.h, 0, 3, t);
    } else e.cannedGesturesClassifierOptions === void 0 && ((i = T(this.h, kt, 3)) == null || i.g());
    return e.customGesturesClassifierOptions ? (y(n = t = new kt(), 0, 2, r = $r(e.customGesturesClassifierOptions, (o = T(this.h, kt, 4)) == null ? void 0 : o.h())), y(this.h, 0, 4, t)) : e.customGesturesClassifierOptions === void 0 && ((a = T(this.h, kt, 4)) == null || a.g()), this.l(e);
  }
  Ja(e, t) {
    return oo(this), Oe(this, e, t), ao(this);
  }
  Ka(e, t, n) {
    return oo(this), He(this, e, n, t), ao(this);
  }
  m() {
    var e = new de();
    C(e, "image_in"), C(e, "norm_rect"), L(e, "hand_gestures"), L(e, "hand_landmarks"), L(e, "world_hand_landmarks"), L(e, "handedness");
    const t = new we();
    Pe(t, C1, this.j);
    const n = new ae();
    Ee(n, "mediapipe.tasks.vision.gesture_recognizer.GestureRecognizerGraph"), I(n, "IMAGE:image_in"), I(n, "NORM_RECT:norm_rect"), k(n, "HAND_GESTURES:hand_gestures"), k(n, "LANDMARKS:hand_landmarks"), k(n, "WORLD_LANDMARKS:world_hand_landmarks"), k(n, "HANDEDNESS:handedness"), n.o(t), be(e, n), this.g.attachProtoVectorListener("hand_landmarks", ((r, s) => {
      for (const i of r) {
        r = dn(i);
        const o = [];
        for (const a of Ze(r, Da, 1)) o.push({ x: q(a, 1) ?? 0, y: q(a, 2) ?? 0, z: q(a, 3) ?? 0, visibility: q(a, 4) ?? 0 });
        this.landmarks.push(o);
      }
      f(this, s);
    })), this.g.attachEmptyPacketListener("hand_landmarks", ((r) => {
      f(this, r);
    })), this.g.attachProtoVectorListener("world_hand_landmarks", ((r, s) => {
      for (const i of r) {
        r = Ot(i);
        const o = [];
        for (const a of Ze(r, Na, 1)) o.push({ x: q(a, 1) ?? 0, y: q(a, 2) ?? 0, z: q(a, 3) ?? 0, visibility: q(a, 4) ?? 0 });
        this.worldLandmarks.push(o);
      }
      f(this, s);
    })), this.g.attachEmptyPacketListener("world_hand_landmarks", ((r) => {
      f(this, r);
    })), this.g.attachProtoVectorListener("hand_gestures", ((r, s) => {
      this.gestures.push(...co(r, !1)), f(this, s);
    })), this.g.attachEmptyPacketListener("hand_gestures", ((r) => {
      f(this, r);
    })), this.g.attachProtoVectorListener("handedness", ((r, s) => {
      this.handedness.push(...co(r)), f(this, s);
    })), this.g.attachEmptyPacketListener("handedness", ((r) => {
      f(this, r);
    })), e = e.g(), this.setGraph(new Uint8Array(e), !0);
  }
};
function uo(e) {
  return { landmarks: e.landmarks, worldLandmarks: e.worldLandmarks, handednesses: e.handedness, handedness: e.handedness };
}
pe.prototype.recognizeForVideo = pe.prototype.Ka, pe.prototype.recognize = pe.prototype.Ja, pe.prototype.setOptions = pe.prototype.o, pe.createFromModelPath = function(e, t) {
  return A(pe, e, { baseOptions: { modelAssetPath: t } });
}, pe.createFromModelBuffer = function(e, t) {
  return A(pe, e, { baseOptions: { modelAssetBuffer: t } });
}, pe.createFromOptions = function(e, t) {
  return A(pe, e, t);
}, pe.HAND_CONNECTIONS = ai;
var ge = class extends fe {
  constructor(e, t) {
    super(new Fe(e, t), "image_in", "norm_rect", !1), this.landmarks = [], this.worldLandmarks = [], this.handedness = [], y(e = this.h = new zs(), 0, 1, t = new U()), this.s = new Ws(), y(this.h, 0, 3, this.s), this.j = new Ka(), y(this.h, 0, 2, this.j), je(this.j, 3, 1), p(this.j, 2, 0.5), p(this.s, 2, 0.5), p(this.h, 4, 0.5);
  }
  get baseOptions() {
    return T(this.h, U, 1);
  }
  set baseOptions(e) {
    y(this.h, 0, 1, e);
  }
  o(e) {
    return "numHands" in e && je(this.j, 3, e.numHands ?? 1), "minHandDetectionConfidence" in e && p(this.j, 2, e.minHandDetectionConfidence ?? 0.5), "minTrackingConfidence" in e && p(this.h, 4, e.minTrackingConfidence ?? 0.5), "minHandPresenceConfidence" in e && p(this.s, 2, e.minHandPresenceConfidence ?? 0.5), this.l(e);
  }
  D(e, t) {
    return this.landmarks = [], this.worldLandmarks = [], this.handedness = [], Oe(this, e, t), uo(this);
  }
  F(e, t, n) {
    return this.landmarks = [], this.worldLandmarks = [], this.handedness = [], He(this, e, n, t), uo(this);
  }
  m() {
    var e = new de();
    C(e, "image_in"), C(e, "norm_rect"), L(e, "hand_landmarks"), L(e, "world_hand_landmarks"), L(e, "handedness");
    const t = new we();
    Pe(t, N1, this.h);
    const n = new ae();
    Ee(n, "mediapipe.tasks.vision.hand_landmarker.HandLandmarkerGraph"), I(n, "IMAGE:image_in"), I(n, "NORM_RECT:norm_rect"), k(n, "LANDMARKS:hand_landmarks"), k(n, "WORLD_LANDMARKS:world_hand_landmarks"), k(n, "HANDEDNESS:handedness"), n.o(t), be(e, n), this.g.attachProtoVectorListener("hand_landmarks", ((r, s) => {
      for (const i of r) r = dn(i), this.landmarks.push(cr(r));
      f(this, s);
    })), this.g.attachEmptyPacketListener("hand_landmarks", ((r) => {
      f(this, r);
    })), this.g.attachProtoVectorListener("world_hand_landmarks", ((r, s) => {
      for (const i of r) r = Ot(i), this.worldLandmarks.push(rn(r));
      f(this, s);
    })), this.g.attachEmptyPacketListener("world_hand_landmarks", ((r) => {
      f(this, r);
    })), this.g.attachProtoVectorListener("handedness", ((r, s) => {
      var i = this.handedness, o = i.push;
      const a = [];
      for (const c of r) {
        r = or(c);
        const u = [];
        for (const h of r.g()) u.push({ score: q(h, 2) ?? 0, index: Se(h, 1) ?? 0 ?? -1, categoryName: xe(h, 3) ?? "" ?? "", displayName: xe(h, 4) ?? "" ?? "" });
        a.push(u);
      }
      o.call(i, ...a), f(this, s);
    })), this.g.attachEmptyPacketListener("handedness", ((r) => {
      f(this, r);
    })), e = e.g(), this.setGraph(new Uint8Array(e), !0);
  }
};
ge.prototype.detectForVideo = ge.prototype.F, ge.prototype.detect = ge.prototype.D, ge.prototype.setOptions = ge.prototype.o, ge.createFromModelPath = function(e, t) {
  return A(ge, e, { baseOptions: { modelAssetPath: t } });
}, ge.createFromModelBuffer = function(e, t) {
  return A(ge, e, { baseOptions: { modelAssetBuffer: t } });
}, ge.createFromOptions = function(e, t) {
  return A(ge, e, t);
}, ge.HAND_CONNECTIONS = ai;
var v2 = Ce([0, 1], [1, 2], [2, 3], [3, 7], [0, 4], [4, 5], [5, 6], [6, 8], [9, 10], [11, 12], [11, 13], [13, 15], [15, 17], [15, 19], [15, 21], [17, 19], [12, 14], [14, 16], [16, 18], [16, 20], [16, 22], [18, 20], [11, 23], [12, 24], [23, 24], [23, 25], [24, 26], [25, 27], [26, 28], [27, 29], [28, 30], [29, 31], [30, 32], [27, 31], [28, 32]);
function ho(e) {
  e.h = { faceLandmarks: [], faceBlendshapes: [], poseLandmarks: [], poseWorldLandmarks: [], poseSegmentationMasks: [], leftHandLandmarks: [], leftHandWorldLandmarks: [], rightHandLandmarks: [], rightHandWorldLandmarks: [] };
}
function lo(e) {
  try {
    if (!e.C) return e.h;
    e.C(e.h);
  } finally {
    hr(e);
  }
}
function An(e, t) {
  e = dn(e), t.push(cr(e));
}
var N = class extends fe {
  constructor(e, t) {
    super(new Fe(e, t), "input_frames_image", null, !1), this.h = { faceLandmarks: [], faceBlendshapes: [], poseLandmarks: [], poseWorldLandmarks: [], poseSegmentationMasks: [], leftHandLandmarks: [], leftHandWorldLandmarks: [], rightHandLandmarks: [], rightHandWorldLandmarks: [] }, this.outputPoseSegmentationMasks = this.outputFaceBlendshapes = !1, y(e = this.j = new Qa(), 0, 1, t = new U()), this.J = new Ws(), y(this.j, 0, 2, this.J), this.Z = new D1(), y(this.j, 0, 3, this.Z), this.s = new ar(), y(this.j, 0, 4, this.s), this.H = new ja(), y(this.j, 0, 5, this.H), this.v = new Ja(), y(this.j, 0, 6, this.v), this.K = new Za(), y(this.j, 0, 7, this.K), p(this.s, 2, 0.5), p(this.s, 3, 0.3), p(this.H, 2, 0.5), p(this.v, 2, 0.5), p(this.v, 3, 0.3), p(this.K, 2, 0.5), p(this.J, 2, 0.5);
  }
  get baseOptions() {
    return T(this.j, U, 1);
  }
  set baseOptions(e) {
    y(this.j, 0, 1, e);
  }
  o(e) {
    return "minFaceDetectionConfidence" in e && p(this.s, 2, e.minFaceDetectionConfidence ?? 0.5), "minFaceSuppressionThreshold" in e && p(this.s, 3, e.minFaceSuppressionThreshold ?? 0.3), "minFacePresenceConfidence" in e && p(this.H, 2, e.minFacePresenceConfidence ?? 0.5), "outputFaceBlendshapes" in e && (this.outputFaceBlendshapes = !!e.outputFaceBlendshapes), "minPoseDetectionConfidence" in e && p(this.v, 2, e.minPoseDetectionConfidence ?? 0.5), "minPoseSuppressionThreshold" in e && p(this.v, 3, e.minPoseSuppressionThreshold ?? 0.3), "minPosePresenceConfidence" in e && p(this.K, 2, e.minPosePresenceConfidence ?? 0.5), "outputPoseSegmentationMasks" in e && (this.outputPoseSegmentationMasks = !!e.outputPoseSegmentationMasks), "minHandLandmarksConfidence" in e && p(this.J, 2, e.minHandLandmarksConfidence ?? 0.5), this.l(e);
  }
  D(e, t, n) {
    const r = typeof t != "function" ? t : {};
    return this.C = typeof t == "function" ? t : n, ho(this), Oe(this, e, r), lo(this);
  }
  F(e, t, n, r) {
    const s = typeof n != "function" ? n : {};
    return this.C = typeof n == "function" ? n : r, ho(this), He(this, e, s, t), lo(this);
  }
  m() {
    var e = new de();
    C(e, "input_frames_image"), L(e, "pose_landmarks"), L(e, "pose_world_landmarks"), L(e, "face_landmarks"), L(e, "left_hand_landmarks"), L(e, "left_hand_world_landmarks"), L(e, "right_hand_landmarks"), L(e, "right_hand_world_landmarks");
    const t = new we(), n = new Ii();
    jr(n, 1, Wt("type.googleapis.com/mediapipe.tasks.vision.holistic_landmarker.proto.HolisticLandmarkerGraphOptions"), ""), (function(s, i) {
      if (i != null) if (Array.isArray(i)) R(s, 2, Ko(i));
      else {
        if (!(typeof i == "string" || i instanceof Xe || un(i))) throw Error("invalid value in Any.value field: " + i + " expected a ByteString, a base64 encoded string, a Uint8Array or a jspb array");
        jr(s, 2, cs(i, !1), vt());
      }
    })(n, this.j.g());
    const r = new ae();
    Ee(r, "mediapipe.tasks.vision.holistic_landmarker.HolisticLandmarkerGraph"), Cn(r, 8, Ii, n), I(r, "IMAGE:input_frames_image"), k(r, "POSE_LANDMARKS:pose_landmarks"), k(r, "POSE_WORLD_LANDMARKS:pose_world_landmarks"), k(r, "FACE_LANDMARKS:face_landmarks"), k(r, "LEFT_HAND_LANDMARKS:left_hand_landmarks"), k(r, "LEFT_HAND_WORLD_LANDMARKS:left_hand_world_landmarks"), k(r, "RIGHT_HAND_LANDMARKS:right_hand_landmarks"), k(r, "RIGHT_HAND_WORLD_LANDMARKS:right_hand_world_landmarks"), r.o(t), be(e, r), ur(this, e), this.g.attachProtoListener("pose_landmarks", ((s, i) => {
      An(s, this.h.poseLandmarks), f(this, i);
    })), this.g.attachEmptyPacketListener("pose_landmarks", ((s) => {
      f(this, s);
    })), this.g.attachProtoListener("pose_world_landmarks", ((s, i) => {
      var o = this.h.poseWorldLandmarks;
      s = Ot(s), o.push(rn(s)), f(this, i);
    })), this.g.attachEmptyPacketListener("pose_world_landmarks", ((s) => {
      f(this, s);
    })), this.outputPoseSegmentationMasks && (k(r, "POSE_SEGMENTATION_MASK:pose_segmentation_mask"), Ut(this, "pose_segmentation_mask"), this.g.U("pose_segmentation_mask", ((s, i) => {
      this.h.poseSegmentationMasks = [Vt(this, s, !0, !this.C)], f(this, i);
    })), this.g.attachEmptyPacketListener("pose_segmentation_mask", ((s) => {
      this.h.poseSegmentationMasks = [], f(this, s);
    }))), this.g.attachProtoListener("face_landmarks", ((s, i) => {
      An(s, this.h.faceLandmarks), f(this, i);
    })), this.g.attachEmptyPacketListener("face_landmarks", ((s) => {
      f(this, s);
    })), this.outputFaceBlendshapes && (L(e, "extra_blendshapes"), k(r, "FACE_BLENDSHAPES:extra_blendshapes"), this.g.attachProtoListener("extra_blendshapes", ((s, i) => {
      var o = this.h.faceBlendshapes;
      this.outputFaceBlendshapes && (s = or(s), o.push(Xs(s.g() ?? []))), f(this, i);
    })), this.g.attachEmptyPacketListener("extra_blendshapes", ((s) => {
      f(this, s);
    }))), this.g.attachProtoListener("left_hand_landmarks", ((s, i) => {
      An(s, this.h.leftHandLandmarks), f(this, i);
    })), this.g.attachEmptyPacketListener("left_hand_landmarks", ((s) => {
      f(this, s);
    })), this.g.attachProtoListener("left_hand_world_landmarks", ((s, i) => {
      var o = this.h.leftHandWorldLandmarks;
      s = Ot(s), o.push(rn(s)), f(this, i);
    })), this.g.attachEmptyPacketListener("left_hand_world_landmarks", ((s) => {
      f(this, s);
    })), this.g.attachProtoListener("right_hand_landmarks", ((s, i) => {
      An(s, this.h.rightHandLandmarks), f(this, i);
    })), this.g.attachEmptyPacketListener("right_hand_landmarks", ((s) => {
      f(this, s);
    })), this.g.attachProtoListener("right_hand_world_landmarks", ((s, i) => {
      var o = this.h.rightHandWorldLandmarks;
      s = Ot(s), o.push(rn(s)), f(this, i);
    })), this.g.attachEmptyPacketListener("right_hand_world_landmarks", ((s) => {
      f(this, s);
    })), e = e.g(), this.setGraph(new Uint8Array(e), !0);
  }
};
N.prototype.detectForVideo = N.prototype.F, N.prototype.detect = N.prototype.D, N.prototype.setOptions = N.prototype.o, N.createFromModelPath = function(e, t) {
  return A(N, e, { baseOptions: { modelAssetPath: t } });
}, N.createFromModelBuffer = function(e, t) {
  return A(N, e, { baseOptions: { modelAssetBuffer: t } });
}, N.createFromOptions = function(e, t) {
  return A(N, e, t);
}, N.HAND_CONNECTIONS = ai, N.POSE_CONNECTIONS = v2, N.FACE_LANDMARKS_LIPS = ti, N.FACE_LANDMARKS_LEFT_EYE = ni, N.FACE_LANDMARKS_LEFT_EYEBROW = ri, N.FACE_LANDMARKS_LEFT_IRIS = m2, N.FACE_LANDMARKS_RIGHT_EYE = si, N.FACE_LANDMARKS_RIGHT_EYEBROW = ii, N.FACE_LANDMARKS_RIGHT_IRIS = y2, N.FACE_LANDMARKS_FACE_OVAL = oi, N.FACE_LANDMARKS_CONTOURS = _2, N.FACE_LANDMARKS_TESSELATION = w2;
var Ae = class extends fe {
  constructor(e, t) {
    super(new Fe(e, t), "input_image", "norm_rect", !0), this.j = { classifications: [] }, y(e = this.h = new e2(), 0, 1, t = new U());
  }
  get baseOptions() {
    return T(this.h, U, 1);
  }
  set baseOptions(e) {
    y(this.h, 0, 1, e);
  }
  o(e) {
    return y(this.h, 0, 2, $r(e, T(this.h, Vs, 2))), this.l(e);
  }
  sa(e, t) {
    return this.j = { classifications: [] }, Oe(this, e, t), this.j;
  }
  ta(e, t, n) {
    return this.j = { classifications: [] }, He(this, e, n, t), this.j;
  }
  m() {
    var e = new de();
    C(e, "input_image"), C(e, "norm_rect"), L(e, "classifications");
    const t = new we();
    Pe(t, U1, this.h);
    const n = new ae();
    Ee(n, "mediapipe.tasks.vision.image_classifier.ImageClassifierGraph"), I(n, "IMAGE:input_image"), I(n, "NORM_RECT:norm_rect"), k(n, "CLASSIFICATIONS:classifications"), n.o(t), be(e, n), this.g.attachProtoListener("classifications", ((r, s) => {
      this.j = (function(i) {
        const o = { classifications: Ze(i, k1, 1).map(((a) => {
          var c;
          return Xs(((c = T(a, Ra, 4)) == null ? void 0 : c.g()) ?? [], Se(a, 2) ?? 0, xe(a, 3) ?? "");
        })) };
        return In(Nt(i, 2)) != null && (o.timestampMs = In(Nt(i, 2)) ?? 0), o;
      })(T1(r)), f(this, s);
    })), this.g.attachEmptyPacketListener("classifications", ((r) => {
      f(this, r);
    })), e = e.g(), this.setGraph(new Uint8Array(e), !0);
  }
};
Ae.prototype.classifyForVideo = Ae.prototype.ta, Ae.prototype.classify = Ae.prototype.sa, Ae.prototype.setOptions = Ae.prototype.o, Ae.createFromModelPath = function(e, t) {
  return A(Ae, e, { baseOptions: { modelAssetPath: t } });
}, Ae.createFromModelBuffer = function(e, t) {
  return A(Ae, e, { baseOptions: { modelAssetBuffer: t } });
}, Ae.createFromOptions = function(e, t) {
  return A(Ae, e, t);
};
var me = class extends fe {
  constructor(e, t) {
    super(new Fe(e, t), "image_in", "norm_rect", !0), this.h = new t2(), this.embeddings = { embeddings: [] }, y(e = this.h, 0, 1, t = new U());
  }
  get baseOptions() {
    return T(this.h, U, 1);
  }
  set baseOptions(e) {
    y(this.h, 0, 1, e);
  }
  o(e) {
    var t = this.h, n = T(this.h, Hi, 2);
    return n = n ? n.clone() : new Hi(), e.l2Normalize !== void 0 ? an(n, 1, e.l2Normalize) : "l2Normalize" in e && R(n, 1), e.quantize !== void 0 ? an(n, 2, e.quantize) : "quantize" in e && R(n, 2), y(t, 0, 2, n), this.l(e);
  }
  za(e, t) {
    return Oe(this, e, t), this.embeddings;
  }
  Aa(e, t, n) {
    return He(this, e, n, t), this.embeddings;
  }
  m() {
    var e = new de();
    C(e, "image_in"), C(e, "norm_rect"), L(e, "embeddings_out");
    const t = new we();
    Pe(t, B1, this.h);
    const n = new ae();
    Ee(n, "mediapipe.tasks.vision.image_embedder.ImageEmbedderGraph"), I(n, "IMAGE:image_in"), I(n, "NORM_RECT:norm_rect"), k(n, "EMBEDDINGS:embeddings_out"), n.o(t), be(e, n), this.g.attachProtoListener("embeddings_out", ((r, s) => {
      r = x1(r), this.embeddings = (function(i) {
        return { embeddings: Ze(i, L1, 1).map(((o) => {
          var c, u;
          const a = { headIndex: Se(o, 3) ?? 0 ?? -1, headName: xe(o, 4) ?? "" ?? "" };
          if (Zo(o, ji, Ar(o, 1)) !== void 0) o = yt(o = T(o, ji, Ar(o, 1)), 1, ht, mt()), a.floatEmbedding = o.slice();
          else {
            const h = new Uint8Array(0);
            a.quantizedEmbedding = ((u = (c = T(o, S1, Ar(o, 2))) == null ? void 0 : c.oa()) == null ? void 0 : u.h()) ?? h;
          }
          return a;
        })), timestampMs: In(Nt(i, 2)) ?? 0 };
      })(r), f(this, s);
    })), this.g.attachEmptyPacketListener("embeddings_out", ((r) => {
      f(this, r);
    })), e = e.g(), this.setGraph(new Uint8Array(e), !0);
  }
};
me.cosineSimilarity = function(e, t) {
  if (e.floatEmbedding && t.floatEmbedding) e = $i(e.floatEmbedding, t.floatEmbedding);
  else {
    if (!e.quantizedEmbedding || !t.quantizedEmbedding) throw Error("Cannot compute cosine similarity between quantized and float embeddings.");
    e = $i(Ki(e.quantizedEmbedding), Ki(t.quantizedEmbedding));
  }
  return e;
}, me.prototype.embedForVideo = me.prototype.Aa, me.prototype.embed = me.prototype.za, me.prototype.setOptions = me.prototype.o, me.createFromModelPath = function(e, t) {
  return A(me, e, { baseOptions: { modelAssetPath: t } });
}, me.createFromModelBuffer = function(e, t) {
  return A(me, e, { baseOptions: { modelAssetBuffer: t } });
}, me.createFromOptions = function(e, t) {
  return A(me, e, t);
};
var Jr = class {
  constructor(e, t, n) {
    this.confidenceMasks = e, this.categoryMask = t, this.qualityScores = n;
  }
  close() {
    var e, t;
    (e = this.confidenceMasks) == null || e.forEach(((n) => {
      n.close();
    })), (t = this.categoryMask) == null || t.close();
  }
};
function fo(e) {
  e.categoryMask = void 0, e.confidenceMasks = void 0, e.qualityScores = void 0;
}
function po(e) {
  try {
    const t = new Jr(e.confidenceMasks, e.categoryMask, e.qualityScores);
    if (!e.j) return t;
    e.j(t);
  } finally {
    hr(e);
  }
}
Jr.prototype.close = Jr.prototype.close;
var oe = class extends fe {
  constructor(e, t) {
    super(new Fe(e, t), "image_in", "norm_rect", !1), this.s = [], this.outputCategoryMask = !1, this.outputConfidenceMasks = !0, this.h = new $s(), this.v = new n2(), y(this.h, 0, 3, this.v), y(e = this.h, 0, 1, t = new U());
  }
  get baseOptions() {
    return T(this.h, U, 1);
  }
  set baseOptions(e) {
    y(this.h, 0, 1, e);
  }
  o(e) {
    return e.displayNamesLocale !== void 0 ? R(this.h, 2, Wt(e.displayNamesLocale)) : "displayNamesLocale" in e && R(this.h, 2), "outputCategoryMask" in e && (this.outputCategoryMask = e.outputCategoryMask ?? !1), "outputConfidenceMasks" in e && (this.outputConfidenceMasks = e.outputConfidenceMasks ?? !0), super.l(e);
  }
  I() {
    (function(e) {
      var n, r;
      const t = Ze(e.da(), ae, 1).filter(((s) => (xe(s, 1) ?? "").includes("mediapipe.tasks.TensorsToSegmentationCalculator")));
      if (e.s = [], t.length > 1) throw Error("The graph has more than one mediapipe.tasks.TensorsToSegmentationCalculator.");
      t.length === 1 && (((r = (n = T(t[0], we, 7)) == null ? void 0 : n.l()) == null ? void 0 : r.g()) ?? /* @__PURE__ */ new Map()).forEach(((s, i) => {
        e.s[Number(i)] = xe(s, 1) ?? "";
      }));
    })(this);
  }
  segment(e, t, n) {
    const r = typeof t != "function" ? t : {};
    return this.j = typeof t == "function" ? t : n, fo(this), Oe(this, e, r), po(this);
  }
  Ma(e, t, n, r) {
    const s = typeof n != "function" ? n : {};
    return this.j = typeof n == "function" ? n : r, fo(this), He(this, e, s, t), po(this);
  }
  Da() {
    return this.s;
  }
  m() {
    var e = new de();
    C(e, "image_in"), C(e, "norm_rect");
    const t = new we();
    Pe(t, s2, this.h);
    const n = new ae();
    Ee(n, "mediapipe.tasks.vision.image_segmenter.ImageSegmenterGraph"), I(n, "IMAGE:image_in"), I(n, "NORM_RECT:norm_rect"), n.o(t), be(e, n), ur(this, e), this.outputConfidenceMasks && (L(e, "confidence_masks"), k(n, "CONFIDENCE_MASKS:confidence_masks"), Ut(this, "confidence_masks"), this.g.ca("confidence_masks", ((r, s) => {
      this.confidenceMasks = r.map(((i) => Vt(this, i, !0, !this.j))), f(this, s);
    })), this.g.attachEmptyPacketListener("confidence_masks", ((r) => {
      this.confidenceMasks = [], f(this, r);
    }))), this.outputCategoryMask && (L(e, "category_mask"), k(n, "CATEGORY_MASK:category_mask"), Ut(this, "category_mask"), this.g.U("category_mask", ((r, s) => {
      this.categoryMask = Vt(this, r, !1, !this.j), f(this, s);
    })), this.g.attachEmptyPacketListener("category_mask", ((r) => {
      this.categoryMask = void 0, f(this, r);
    }))), L(e, "quality_scores"), k(n, "QUALITY_SCORES:quality_scores"), this.g.attachFloatVectorListener("quality_scores", ((r, s) => {
      this.qualityScores = r, f(this, s);
    })), this.g.attachEmptyPacketListener("quality_scores", ((r) => {
      this.categoryMask = void 0, f(this, r);
    })), e = e.g(), this.setGraph(new Uint8Array(e), !0);
  }
};
oe.prototype.getLabels = oe.prototype.Da, oe.prototype.segmentForVideo = oe.prototype.Ma, oe.prototype.segment = oe.prototype.segment, oe.prototype.setOptions = oe.prototype.o, oe.createFromModelPath = function(e, t) {
  return A(oe, e, { baseOptions: { modelAssetPath: t } });
}, oe.createFromModelBuffer = function(e, t) {
  return A(oe, e, { baseOptions: { modelAssetBuffer: t } });
}, oe.createFromOptions = function(e, t) {
  return A(oe, e, t);
};
var Zr = class {
  constructor(e, t, n) {
    this.confidenceMasks = e, this.categoryMask = t, this.qualityScores = n;
  }
  close() {
    var e, t;
    (e = this.confidenceMasks) == null || e.forEach(((n) => {
      n.close();
    })), (t = this.categoryMask) == null || t.close();
  }
};
Zr.prototype.close = Zr.prototype.close;
var K1 = class extends d {
  constructor(e) {
    super(e);
  }
}, Tt = [0, W, -2], Bn = [0, ze, -3, D, ze, -1], go = [0, Bn], mo = [0, Bn, W, -1], Mr = class extends d {
  constructor(e) {
    super(e);
  }
}, yo = [0, ze, -1, D], $1 = class extends d {
  constructor(e) {
    super(e);
  }
}, _o = class extends d {
  constructor(e) {
    super(e);
  }
}, Qr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 14, 15], E2 = class extends d {
  constructor(e) {
    super(e);
  }
};
E2.prototype.g = ir([0, Z, [0, Qr, F, Bn, F, [0, Bn, Tt], F, go, F, [0, go, Tt], F, yo, F, [0, ze, -3, D, Me], F, [0, ze, -3, D], F, [0, M, ze, -2, D, W, D, -1, 2, ze, Tt], F, mo, F, [0, mo, Tt], ze, Tt, M, F, [0, ze, -3, D, Tt, -1], F, [0, Z, yo]], M, [0, M, W, -1, D]]);
var Be = class extends fe {
  constructor(e, t) {
    super(new Fe(e, t), "image_in", "norm_rect_in", !1), this.outputCategoryMask = !1, this.outputConfidenceMasks = !0, this.h = new $s(), this.s = new n2(), y(this.h, 0, 3, this.s), y(e = this.h, 0, 1, t = new U());
  }
  get baseOptions() {
    return T(this.h, U, 1);
  }
  set baseOptions(e) {
    y(this.h, 0, 1, e);
  }
  o(e) {
    return "outputCategoryMask" in e && (this.outputCategoryMask = e.outputCategoryMask ?? !1), "outputConfidenceMasks" in e && (this.outputConfidenceMasks = e.outputConfidenceMasks ?? !0), super.l(e);
  }
  segment(e, t, n, r) {
    const s = typeof n != "function" ? n : {};
    this.j = typeof n == "function" ? n : r, this.qualityScores = this.categoryMask = this.confidenceMasks = void 0, n = this.B + 1, r = new E2();
    const i = new _o();
    var o = new K1();
    if (je(o, 1, 255), y(i, 0, 12, o), t.keypoint && t.scribble) throw Error("Cannot provide both keypoint and scribble.");
    if (t.keypoint) {
      var a = new Mr();
      an(a, 3, !0), p(a, 1, t.keypoint.x), p(a, 2, t.keypoint.y), tn(i, 5, Qr, a);
    } else {
      if (!t.scribble) throw Error("Must provide either a keypoint or a scribble.");
      for (a of (o = new $1(), t.scribble)) an(t = new Mr(), 3, !0), p(t, 1, a.x), p(t, 2, a.y), Cn(o, 1, Mr, t);
      tn(i, 15, Qr, o);
    }
    Cn(r, 1, _o, i), this.g.addProtoToStream(r.g(), "drishti.RenderData", "roi_in", n), Oe(this, e, s);
    e: {
      try {
        const u = new Zr(this.confidenceMasks, this.categoryMask, this.qualityScores);
        if (!this.j) {
          var c = u;
          break e;
        }
        this.j(u);
      } finally {
        hr(this);
      }
      c = void 0;
    }
    return c;
  }
  m() {
    var e = new de();
    C(e, "image_in"), C(e, "roi_in"), C(e, "norm_rect_in");
    const t = new we();
    Pe(t, s2, this.h);
    const n = new ae();
    Ee(n, "mediapipe.tasks.vision.interactive_segmenter.InteractiveSegmenterGraph"), I(n, "IMAGE:image_in"), I(n, "ROI:roi_in"), I(n, "NORM_RECT:norm_rect_in"), n.o(t), be(e, n), ur(this, e), this.outputConfidenceMasks && (L(e, "confidence_masks"), k(n, "CONFIDENCE_MASKS:confidence_masks"), Ut(this, "confidence_masks"), this.g.ca("confidence_masks", ((r, s) => {
      this.confidenceMasks = r.map(((i) => Vt(this, i, !0, !this.j))), f(this, s);
    })), this.g.attachEmptyPacketListener("confidence_masks", ((r) => {
      this.confidenceMasks = [], f(this, r);
    }))), this.outputCategoryMask && (L(e, "category_mask"), k(n, "CATEGORY_MASK:category_mask"), Ut(this, "category_mask"), this.g.U("category_mask", ((r, s) => {
      this.categoryMask = Vt(this, r, !1, !this.j), f(this, s);
    })), this.g.attachEmptyPacketListener("category_mask", ((r) => {
      this.categoryMask = void 0, f(this, r);
    }))), L(e, "quality_scores"), k(n, "QUALITY_SCORES:quality_scores"), this.g.attachFloatVectorListener("quality_scores", ((r, s) => {
      this.qualityScores = r, f(this, s);
    })), this.g.attachEmptyPacketListener("quality_scores", ((r) => {
      this.categoryMask = void 0, f(this, r);
    })), e = e.g(), this.setGraph(new Uint8Array(e), !0);
  }
};
Be.prototype.segment = Be.prototype.segment, Be.prototype.setOptions = Be.prototype.o, Be.createFromModelPath = function(e, t) {
  return A(Be, e, { baseOptions: { modelAssetPath: t } });
}, Be.createFromModelBuffer = function(e, t) {
  return A(Be, e, { baseOptions: { modelAssetBuffer: t } });
}, Be.createFromOptions = function(e, t) {
  return A(Be, e, t);
};
var ke = class extends fe {
  constructor(e, t) {
    super(new Fe(e, t), "input_frame_gpu", "norm_rect", !1), this.j = { detections: [] }, y(e = this.h = new i2(), 0, 1, t = new U());
  }
  get baseOptions() {
    return T(this.h, U, 1);
  }
  set baseOptions(e) {
    y(this.h, 0, 1, e);
  }
  o(e) {
    return e.displayNamesLocale !== void 0 ? R(this.h, 2, Wt(e.displayNamesLocale)) : "displayNamesLocale" in e && R(this.h, 2), e.maxResults !== void 0 ? je(this.h, 3, e.maxResults) : "maxResults" in e && R(this.h, 3), e.scoreThreshold !== void 0 ? p(this.h, 4, e.scoreThreshold) : "scoreThreshold" in e && R(this.h, 4), e.categoryAllowlist !== void 0 ? Nn(this.h, 5, e.categoryAllowlist) : "categoryAllowlist" in e && R(this.h, 5), e.categoryDenylist !== void 0 ? Nn(this.h, 6, e.categoryDenylist) : "categoryDenylist" in e && R(this.h, 6), this.l(e);
  }
  D(e, t) {
    return this.j = { detections: [] }, Oe(this, e, t), this.j;
  }
  F(e, t, n) {
    return this.j = { detections: [] }, He(this, e, n, t), this.j;
  }
  m() {
    var e = new de();
    C(e, "input_frame_gpu"), C(e, "norm_rect"), L(e, "detections");
    const t = new we();
    Pe(t, V1, this.h);
    const n = new ae();
    Ee(n, "mediapipe.tasks.vision.ObjectDetectorGraph"), I(n, "IMAGE:input_frame_gpu"), I(n, "NORM_RECT:norm_rect"), k(n, "DETECTIONS:detections"), n.o(t), be(e, n), this.g.attachProtoVectorListener("detections", ((r, s) => {
      for (const i of r) r = Ca(i), this.j.detections.push(a2(r));
      f(this, s);
    })), this.g.attachEmptyPacketListener("detections", ((r) => {
      f(this, r);
    })), e = e.g(), this.setGraph(new Uint8Array(e), !0);
  }
};
ke.prototype.detectForVideo = ke.prototype.F, ke.prototype.detect = ke.prototype.D, ke.prototype.setOptions = ke.prototype.o, ke.createFromModelPath = async function(e, t) {
  return A(ke, e, { baseOptions: { modelAssetPath: t } });
}, ke.createFromModelBuffer = function(e, t) {
  return A(ke, e, { baseOptions: { modelAssetBuffer: t } });
}, ke.createFromOptions = function(e, t) {
  return A(ke, e, t);
};
var es = class {
  constructor(e, t, n) {
    this.landmarks = e, this.worldLandmarks = t, this.segmentationMasks = n;
  }
  close() {
    var e;
    (e = this.segmentationMasks) == null || e.forEach(((t) => {
      t.close();
    }));
  }
};
function wo(e) {
  e.landmarks = [], e.worldLandmarks = [], e.segmentationMasks = void 0;
}
function vo(e) {
  try {
    const t = new es(e.landmarks, e.worldLandmarks, e.segmentationMasks);
    if (!e.s) return t;
    e.s(t);
  } finally {
    hr(e);
  }
}
es.prototype.close = es.prototype.close;
var ye = class extends fe {
  constructor(e, t) {
    super(new Fe(e, t), "image_in", "norm_rect", !1), this.landmarks = [], this.worldLandmarks = [], this.outputSegmentationMasks = !1, y(e = this.h = new o2(), 0, 1, t = new U()), this.v = new Za(), y(this.h, 0, 3, this.v), this.j = new Ja(), y(this.h, 0, 2, this.j), je(this.j, 4, 1), p(this.j, 2, 0.5), p(this.v, 2, 0.5), p(this.h, 4, 0.5);
  }
  get baseOptions() {
    return T(this.h, U, 1);
  }
  set baseOptions(e) {
    y(this.h, 0, 1, e);
  }
  o(e) {
    return "numPoses" in e && je(this.j, 4, e.numPoses ?? 1), "minPoseDetectionConfidence" in e && p(this.j, 2, e.minPoseDetectionConfidence ?? 0.5), "minTrackingConfidence" in e && p(this.h, 4, e.minTrackingConfidence ?? 0.5), "minPosePresenceConfidence" in e && p(this.v, 2, e.minPosePresenceConfidence ?? 0.5), "outputSegmentationMasks" in e && (this.outputSegmentationMasks = e.outputSegmentationMasks ?? !1), this.l(e);
  }
  D(e, t, n) {
    const r = typeof t != "function" ? t : {};
    return this.s = typeof t == "function" ? t : n, wo(this), Oe(this, e, r), vo(this);
  }
  F(e, t, n, r) {
    const s = typeof n != "function" ? n : {};
    return this.s = typeof n == "function" ? n : r, wo(this), He(this, e, s, t), vo(this);
  }
  m() {
    var e = new de();
    C(e, "image_in"), C(e, "norm_rect"), L(e, "normalized_landmarks"), L(e, "world_landmarks"), L(e, "segmentation_masks");
    const t = new we();
    Pe(t, j1, this.h);
    const n = new ae();
    Ee(n, "mediapipe.tasks.vision.pose_landmarker.PoseLandmarkerGraph"), I(n, "IMAGE:image_in"), I(n, "NORM_RECT:norm_rect"), k(n, "NORM_LANDMARKS:normalized_landmarks"), k(n, "WORLD_LANDMARKS:world_landmarks"), n.o(t), be(e, n), ur(this, e), this.g.attachProtoVectorListener("normalized_landmarks", ((r, s) => {
      this.landmarks = [];
      for (const i of r) r = dn(i), this.landmarks.push(cr(r));
      f(this, s);
    })), this.g.attachEmptyPacketListener("normalized_landmarks", ((r) => {
      this.landmarks = [], f(this, r);
    })), this.g.attachProtoVectorListener("world_landmarks", ((r, s) => {
      this.worldLandmarks = [];
      for (const i of r) r = Ot(i), this.worldLandmarks.push(rn(r));
      f(this, s);
    })), this.g.attachEmptyPacketListener("world_landmarks", ((r) => {
      this.worldLandmarks = [], f(this, r);
    })), this.outputSegmentationMasks && (k(n, "SEGMENTATION_MASK:segmentation_masks"), Ut(this, "segmentation_masks"), this.g.ca("segmentation_masks", ((r, s) => {
      this.segmentationMasks = r.map(((i) => Vt(this, i, !0, !this.s))), f(this, s);
    })), this.g.attachEmptyPacketListener("segmentation_masks", ((r) => {
      this.segmentationMasks = [], f(this, r);
    }))), e = e.g(), this.setGraph(new Uint8Array(e), !0);
  }
};
ye.prototype.detectForVideo = ye.prototype.F, ye.prototype.detect = ye.prototype.D, ye.prototype.setOptions = ye.prototype.o, ye.createFromModelPath = function(e, t) {
  return A(ye, e, { baseOptions: { modelAssetPath: t } });
}, ye.createFromModelBuffer = function(e, t) {
  return A(ye, e, { baseOptions: { modelAssetBuffer: t } });
}, ye.createFromOptions = function(e, t) {
  return A(ye, e, t);
}, ye.POSE_CONNECTIONS = v2;
function X1(e) {
  return e && e.__esModule && Object.prototype.hasOwnProperty.call(e, "default") ? e.default : e;
}
var Fr = { exports: {} }, Eo;
function pn() {
  return Eo || (Eo = 1, (function(e) {
    var t = Object.prototype.hasOwnProperty, n = "~";
    function r() {
    }
    Object.create && (r.prototype = /* @__PURE__ */ Object.create(null), new r().__proto__ || (n = !1));
    function s(c, u, h) {
      this.fn = c, this.context = u, this.once = h || !1;
    }
    function i(c, u, h, l, b) {
      if (typeof h != "function")
        throw new TypeError("The listener must be a function");
      var x = new s(h, l || c, b), O = n ? n + u : u;
      return c._events[O] ? c._events[O].fn ? c._events[O] = [c._events[O], x] : c._events[O].push(x) : (c._events[O] = x, c._eventsCount++), c;
    }
    function o(c, u) {
      --c._eventsCount === 0 ? c._events = new r() : delete c._events[u];
    }
    function a() {
      this._events = new r(), this._eventsCount = 0;
    }
    a.prototype.eventNames = function() {
      var u = [], h, l;
      if (this._eventsCount === 0) return u;
      for (l in h = this._events)
        t.call(h, l) && u.push(n ? l.slice(1) : l);
      return Object.getOwnPropertySymbols ? u.concat(Object.getOwnPropertySymbols(h)) : u;
    }, a.prototype.listeners = function(u) {
      var h = n ? n + u : u, l = this._events[h];
      if (!l) return [];
      if (l.fn) return [l.fn];
      for (var b = 0, x = l.length, O = new Array(x); b < x; b++)
        O[b] = l[b].fn;
      return O;
    }, a.prototype.listenerCount = function(u) {
      var h = n ? n + u : u, l = this._events[h];
      return l ? l.fn ? 1 : l.length : 0;
    }, a.prototype.emit = function(u, h, l, b, x, O) {
      var Q = n ? n + u : u;
      if (!this._events[Q]) return !1;
      var E = this._events[Q], ne = arguments.length, ie, w;
      if (E.fn) {
        switch (E.once && this.removeListener(u, E.fn, void 0, !0), ne) {
          case 1:
            return E.fn.call(E.context), !0;
          case 2:
            return E.fn.call(E.context, h), !0;
          case 3:
            return E.fn.call(E.context, h, l), !0;
          case 4:
            return E.fn.call(E.context, h, l, b), !0;
          case 5:
            return E.fn.call(E.context, h, l, b, x), !0;
          case 6:
            return E.fn.call(E.context, h, l, b, x, O), !0;
        }
        for (w = 1, ie = new Array(ne - 1); w < ne; w++)
          ie[w - 1] = arguments[w];
        E.fn.apply(E.context, ie);
      } else {
        var B = E.length, S;
        for (w = 0; w < B; w++)
          switch (E[w].once && this.removeListener(u, E[w].fn, void 0, !0), ne) {
            case 1:
              E[w].fn.call(E[w].context);
              break;
            case 2:
              E[w].fn.call(E[w].context, h);
              break;
            case 3:
              E[w].fn.call(E[w].context, h, l);
              break;
            case 4:
              E[w].fn.call(E[w].context, h, l, b);
              break;
            default:
              if (!ie) for (S = 1, ie = new Array(ne - 1); S < ne; S++)
                ie[S - 1] = arguments[S];
              E[w].fn.apply(E[w].context, ie);
          }
      }
      return !0;
    }, a.prototype.on = function(u, h, l) {
      return i(this, u, h, l, !1);
    }, a.prototype.once = function(u, h, l) {
      return i(this, u, h, l, !0);
    }, a.prototype.removeListener = function(u, h, l, b) {
      var x = n ? n + u : u;
      if (!this._events[x]) return this;
      if (!h)
        return o(this, x), this;
      var O = this._events[x];
      if (O.fn)
        O.fn === h && (!b || O.once) && (!l || O.context === l) && o(this, x);
      else {
        for (var Q = 0, E = [], ne = O.length; Q < ne; Q++)
          (O[Q].fn !== h || b && !O[Q].once || l && O[Q].context !== l) && E.push(O[Q]);
        E.length ? this._events[x] = E.length === 1 ? E[0] : E : o(this, x);
      }
      return this;
    }, a.prototype.removeAllListeners = function(u) {
      var h;
      return u ? (h = n ? n + u : u, this._events[h] && o(this, h)) : (this._events = new r(), this._eventsCount = 0), this;
    }, a.prototype.off = a.prototype.removeListener, a.prototype.addListener = a.prototype.on, a.prefixed = n, a.EventEmitter = a, e.exports = a;
  })(Fr)), Fr.exports;
}
var Or, bo;
function Y1() {
  if (bo) return Or;
  bo = 1;
  const e = pn();
  function t({ connection: n, subTopic: r, pubTopic: s, subscribe: i = !0 }) {
    const o = new e();
    return i && n.subscribe(r), n.on("message", (a, c) => {
      if (a === r)
        try {
          const u = JSON.parse(c.toString());
          (u.method || u.id && ("result" in u || "error" in u)) && o.emit("rpc", u);
        } catch (u) {
          console.error(u);
        }
    }), o.send = (a) => {
      n.publish(s, JSON.stringify(a));
    }, o;
  }
  return Or = t, Or;
}
var Pr, Ao;
function J1() {
  if (Ao) return Pr;
  Ao = 1;
  const e = pn();
  function t({ connection: n, subTopic: r, pubTopic: s }) {
    const i = new e();
    return n.on(r, (o) => {
      (o.method || o.id && ("result" in o || "error" in o)) && i.emit("rpc", o);
    }), i.send = (o) => {
      n.emit(s, o);
    }, i;
  }
  return Pr = t, Pr;
}
var Rr, ko;
function Z1() {
  if (ko) return Rr;
  ko = 1;
  const e = pn();
  function t(n, r = !1) {
    const s = new e();
    return n.addEventListener("message", async (i) => {
      let { data: o } = i;
      if (r && o instanceof Blob && (o = await new Response(o).text().catch(() => null)), typeof i.data == "string")
        try {
          const a = JSON.parse(i.data);
          (a.method || a.id && ("result" in a || "error" in a)) && s.emit("rpc", a);
        } catch {
        }
    }), s.send = (i) => {
      n.send(JSON.stringify(i));
    }, s;
  }
  return Rr = t, Rr;
}
var Ir, To;
function Q1() {
  if (To) return Ir;
  To = 1;
  const e = pn();
  function t(s) {
    const i = new e();
    return s.addEventListener("message", (o) => {
      const { data: a } = o;
      a && (a.method || a.id && ("result" in a || "error" in a)) && i.emit("rpc", a);
    }), i.send = (o, a) => {
      s.postMessage(o, a ? a.postMessageOptions : void 0);
    }, i;
  }
  function n() {
    const s = new e();
    return self.onmessage = (i) => {
      const { data: o } = i;
      o && (o.method || o.id && ("result" in o || "error" in o)) && s.emit("rpc", o);
    }, s.send = (i, o) => {
      self.postMessage(i, o ? o.postMessageOptions : void 0);
    }, s;
  }
  function r(s) {
    return s ? t(s) : n();
  }
  return r.dom = t, r.worker = n, Ir = r, Ir;
}
var Cr, So;
function ec() {
  if (So) return Cr;
  So = 1;
  const e = Y1(), t = J1(), n = Z1(), r = Q1();
  return Cr = {
    mqtt: e,
    socketio: t,
    websocket: n,
    worker: r
  }, Cr;
}
var Nr, Lo;
function tc() {
  if (Lo) return Nr;
  Lo = 1;
  const e = pn(), t = ec();
  function n({ transport: r, timeout: s = 0, handlers: i = {}, methods: o, idGenerator: a }) {
    let c = 0;
    o = o || i || {};
    const u = {}, h = {}, l = new e();
    l.on = l.on.bind(l), r.on("rpc", (w) => {
      if (w.id) {
        if (w.params && h[w.method]) {
          h[w.method](w);
          return;
        }
        const B = u[w.id];
        return B ? (B.timeoutId && clearTimeout(B.timeoutId), delete u[w.id], w.error && B.reject(w.error), B.resolve(w.result)) : void 0;
      }
      w.params.unshift(w.method), l.emit(...w.params);
    });
    function b(w, B) {
      h[w] = (S) => {
        Promise.resolve().then(() => B.apply(this, S.params)).then((G) => {
          r.send({
            id: S.id,
            result: G
          });
        }).catch((G) => {
          const he = { message: G.message };
          G.code && (he.code = G.code), r.send({
            id: S.id,
            error: he
          });
        });
      };
    }
    Object.keys(o).forEach((w) => {
      b(w, o[w]);
    });
    function x(w, B, S) {
      const G = a ? a() : ++c, he = {
        jsonrpc: "2.0",
        method: w,
        params: B,
        id: G
      };
      let Ne;
      (S.timeout || s) && (Ne = setTimeout(() => {
        if (u[G]) {
          const bt = new Error("RPC timeout");
          bt.code = 504, u[G].reject(bt), delete u[G];
        }
      }, S.timeout || s));
      const pr = new Promise((bt, gn) => {
        u[G] = { resolve: bt, reject: gn, timeoutId: Ne };
      });
      return r.send(he, S), pr;
    }
    const O = new Proxy({}, {
      get: (w, B) => (...S) => x(B, S, {})
    }), Q = new Proxy({}, {
      get: (w, B) => (...S) => {
        let G;
        if (S.length) {
          const he = S.pop();
          he && typeof he == "object" && !Array.isArray(he) ? G = he : S.push(he);
        }
        return x(B, S, G || {});
      }
    }), E = new Proxy({}, {
      get: (w, B) => (...S) => {
        const G = {
          jsonrpc: "2.0",
          method: B,
          params: S
        };
        r.send(G);
      }
    }), ne = new Proxy({}, {
      get: (w, B) => (...S) => {
        let G;
        if (S.length) {
          const Ne = S.pop();
          Ne && typeof Ne == "object" && !Array.isArray(Ne) ? G = Ne : S.push(Ne);
        }
        const he = {
          jsonrpc: "2.0",
          method: B,
          params: S
        };
        r.send(he, G || {});
      }
    }), ie = new Proxy({}, {
      get: (w, B) => (S) => {
        l.on(B.substring(2), (...G) => S.apply(S, G));
      }
    });
    return {
      methods: O,
      methodsExt: Q,
      addHandler: b,
      notifications: ie,
      notifiers: E,
      notifiersExt: ne,
      transport: r
    };
  }
  return n.transports = t, Nr = n, Nr;
}
var nc = tc();
const xo = /* @__PURE__ */ X1(nc), rc = new URLSearchParams(self.location.search);
let Ke = rc.get("worker-directory");
Ke ? Ke[0] === "/" && (Ke = Ke.slice(1)) : Ke = "/public";
const z = xo({ transport: xo.transports.worker() });
self.rawrPeer = z;
function ts(e) {
  if (e && typeof e == "object") {
    e.timestamp = Date.now(), z.notifiers.log(e);
    return;
  }
  z.notifiers.log({ msg: e, timestamp: Date.now() });
}
function Gn(e) {
  z.notifiers.log({ error: e.message, stack: e.stack, timestamp: Date.now() });
}
self.onerror = (e) => {
  console.log("error in worker", e), Gn(e);
};
let Mo = 0;
function Ge(e) {
  Mo++, ts(`Load step ${Mo}: ${e}`);
}
async function sc() {
  const e = "IMAGE";
  let t, n, r, s, i = !1, o, a, c, u, h = null, l = !1;
  const b = new OffscreenCanvas(1, 1), x = b.getContext("2d", { willReadFrequently: !0 }), O = "models/";
  async function Q() {
    var We, Yt, mn;
    const _ = await (((Yt = (We = navigator.storage) == null ? void 0 : We.estimate) == null ? void 0 : Yt.call(We)) || {}), v = ((mn = performance.memory) == null ? void 0 : mn.jsHeapSizeLimit) || null;
    let J = null, re = null;
    try {
      const ft = new Uint8Array([
        // Header
        0,
        97,
        115,
        109,
        // \0asm
        1,
        0,
        0,
        0,
        // version 1
        // Type section
        1,
        5,
        1,
        // section 1 (type), length 5, 1 entry
        96,
        0,
        1,
        127,
        // func type: () → i32
        // Function section
        3,
        2,
        1,
        0,
        // section 3 (function), length 2, 1 func of type 0
        // Export section
        7,
        7,
        1,
        // section 7 (export), length 7, 1 export
        3,
        102,
        110,
        49,
        // name "fn1"
        0,
        0,
        // kind: function, index 0
        // Code section
        10,
        6,
        1,
        // section 10 (code), length 6, 1 function
        4,
        0,
        // func body size 4, 0 locals
        65,
        42,
        11
        // i32.const 42, end
      ]), gr = await WebAssembly.compile(ft), tt = (await WebAssembly.instantiate(gr)).exports.fn1, dt = performance.now();
      for (let At = 0; At < 1e6; At++) tt();
      J = performance.now() - dt;
    } catch (ft) {
      re = ft instanceof Error ? ft.message : String(ft);
    }
    return {
      wasmSupported: typeof WebAssembly < "u",
      wasmThreads: typeof SharedArrayBuffer < "u" && crossOriginIsolated === !0,
      deviceMemoryGB: navigator.deviceMemory || null,
      logicalProcessors: navigator.hardwareConcurrency || null,
      jsHeapSizeLimit: v,
      storageEstimate: {
        quota: _.quota || null,
        usage: _.usage || null
      },
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      wasm1MCallsDurationMs: J,
      wasmBenchmarkError: re,
      likelyJITDisabled: J !== null && J > 100
    };
  }
  async function E() {
    return (await import(
      /* @vite-ignore */
      `/${Ke}/webvital.js`
    )).default();
  }
  function ne() {
    i || (i = !0, t = void 0, t = new n.WebVital(O));
  }
  async function ie(_, v) {
    b.width = v.width, b.height = v.height, x.drawImage(v, 0, 0);
    const J = x.getImageData(0, 0, v.width, v.height);
    v.close();
    const re = _.height, We = _.width, Yt = t.requiredInputs();
    for (let yn = 0; yn < Yt.size(); yn++) {
      const tt = Yt.get(yn);
      if (tt === "frame_image") {
        r = gn(J.data, r);
        const dt = r.byteOffset;
        t.setFrameImage(tt, dt, re, We, _.timestamp);
      } else if (tt === "frame_segmentation") {
        const dt = performance.now();
        if (ui(J), c) {
          s = gn(c, s);
          const At = s.byteOffset;
          t.setSegmentation(tt, At, re, We, _.timestamp);
        }
        const _n = Math.round(performance.now() - dt);
        z.notifiers.segDuration({ duration: _n, timestamp: _.timestamp });
      } else if (tt === "frame_detectedFaceRoi") {
        const dt = performance.now(), _n = hi(J), At = Math.round(performance.now() - dt);
        z.notifiers.faceDuration({ duration: At, timestamp: _.timestamp }), t.setFace(tt, _n, _.timestamp);
      }
    }
    const mn = performance.now(), ft = JSON.parse(t.processFrame(_.timestamp)), gr = Math.round(performance.now() - mn);
    return z.notifiers.signs({ ...ft, duration: gr, timestamp: _.timestamp }), 1;
  }
  function w() {
    return t.getVersionString();
  }
  function B(_) {
    !l && h && (l = !0, ts({ wasmEnvReport: h })), t.startSession(_);
  }
  function S() {
    return t.endSession();
  }
  function G() {
    t.previewSession();
  }
  function he() {
    return t.getRunToken();
  }
  function Ne(_) {
    const v = t.authorizeVitals(_);
    return ts({ msg: "Authorization result", auth: v }), v;
  }
  function pr(_) {
    t.setExtendedLogs(_);
  }
  async function bt(_) {
    const v = new n.cvRect();
    v.x = _.x, v.y = _.y, v.width = _.width, v.height = _.height, t.setFaceGuide(v);
  }
  function gn(_, v) {
    return v ? v.length !== _.length ? (b2(v), v = ci(_)) : v.set(_) : v = ci(_), v;
  }
  function b2(_) {
    n._free(_.byteOffset);
  }
  function ci(_) {
    const v = _.length * _.BYTES_PER_ELEMENT, J = n._malloc(v), re = new Uint8Array(n.HEAPU8.buffer, J, v);
    return re.set(_), re;
  }
  async function A2() {
    console.log("Initializing Image Segmenter ...");
    const _ = Date.now();
    Ge("Mediapipe Tasks Vision module loaded");
    const v = await gt.forVisionTasks(`/${Ke}/@mediapipe/tasks-vision/wasm`);
    Ge("Mediapipe Tasks Vision fileset resolved");
    const J = new OffscreenCanvas(1, 1);
    u = J.getContext("webgl2") || J.getContext("webgl") ? "GPU" : "CPU", console.log(`Mediapipe delegate chosen: ${u}`);
    try {
      h = await Q(), Ge("WASM Environment Report generated"), console.log("WASM Environment Report:", h), h.delegateType = u;
    } catch (We) {
      console.error("Error initializing Mediapipe Tasks Vision:", We);
    }
    const _selfieModelPromise = oe.createFromOptions(v, {
      baseOptions: {
        modelAssetPath: `/${Ke}/selfie_multiclass_256x256.tflite?v=2.6.0`,
        delegate: u
      },
      runningMode: e,
      outputCategoryMask: !0,
      outputConfidenceMasks: !1,
      canvas: new OffscreenCanvas(640, 640)
    });
    const _faceModelPromise = _e.createFromOptions(v, {
      baseOptions: {
        modelAssetPath: `/${Ke}/blaze_face_short_range.tflite?v=2.6.0`,
        delegate: u
      },
      runningMode: e,
      minDetectionConfidence: 0.6,
      canvas: new OffscreenCanvas(640, 640)
    });
    [a, o] = await Promise.all([_selfieModelPromise, _faceModelPromise]);
    Ge("Image Segmenter created"), Ge("Face Detector created"), console.log(`Mediapipe initialized in ${Date.now() - _} ms`);
  }
  function ui(_, v = !1) {
    if (a === void 0)
      return null;
    if (v)
      return new Promise((J) => {
        a.segment(_, (re) => {
          J(re.categoryMask.getAsUint8Array());
        });
      });
    a.segment(_, k2);
  }
  function k2(_) {
    if (!_ || !_.categoryMask) {
      console.warn("No segmentation result received. No face was segmented."), c = null;
      return;
    }
    c = _.categoryMask.getAsUint8Array();
  }
  function hi(_) {
    let v = new n.cvRect();
    if (o === void 0) return v;
    const J = o.detect(_);
    if (J.detections && J.detections.length > 0) {
      let re = J.detections[0].boundingBox;
      v.x = re.originX, v.y = re.originY, v.width = re.width, v.height = re.height;
    }
    return v;
  }
  try {
    n = await E(), Ge("Wasm module loaded"), await A2(), Ge("Mediapipe modules loaded");
  } catch (_) {
    console.error("Error loading Wasm module:", _), Gn(_);
    try {
      await new Promise((v) => setTimeout(v, 100)), n = await E(), Ge("Wasm module loaded on second attempt");
    } catch (v) {
      throw console.error("Error loading Wasm module on second attempt:", v), Gn(v), v;
    }
  }
  z.addHandler("mainRun", ne), z.addHandler("detectVitals", ie), z.addHandler("getVersionString", w), z.addHandler("startSession", B), z.addHandler("endSession", S), z.addHandler("previewSession", G), z.addHandler("getRunToken", he), z.addHandler("authorizeVitals", Ne), z.addHandler("setExtendedLogs", pr), z.addHandler("setFaceGuide", bt), z.addHandler("segmentImage", ui), z.addHandler("detectFace", hi), z.notifications.ondetectVitals(ie), ne(), console.log("Required worker modules initialized"), z.notifiers.ready("ok");
}
console.log("Worker script loaded");
Ge("Worker parsed");
sc().then(() => {
  Ge("Worker started"), console.log("Worker started");
}).catch((e) => {
  console.error("Error starting worker:", e), Gn(e);
});
//# sourceMappingURL=worker.js.map
