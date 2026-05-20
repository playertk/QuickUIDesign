import Ue, { useState as I, useEffect as j, useCallback as U, createContext as mn, useContext as hn, useRef as re } from "react";
/**
 * @license QuickUICORE
 * Copyright (c) 2025 MarcoTin. 保留所有权利.
 * 本代码为商业授权，未经授权严禁复制、分发或使用。
 * 联系方式: https://space.bilibili.com/74228375
 */
function yn(r = !0) {
  const [s, u] = I(r);
  return j(() => {
    const c = (w) => w?.hasAttribute("data-nohit") || !1, o = (w) => {
      let h = w;
      for (; h; ) {
        if (c(h))
          return !0;
        h = h.parentElement;
      }
      return !1;
    }, i = (w) => {
      s && !o(w.target) && window.ue?.uecommand.jsmousewheel(w.deltaY);
    }, v = (w) => {
      s && !o(w.target) && window?.ue?.uecommand?.jsmouseposition?.(
        w.clientX * window.devicePixelRatio,
        w.clientY * window.devicePixelRatio
      );
    }, b = (w) => {
      s && !o(w.target) && window.ue?.uecommand?.jsmousedown(
        w.clientX * window.devicePixelRatio,
        w.clientY * window.devicePixelRatio,
        w.button
      );
    }, p = (w) => {
      s && !o(w.target) && window.ue?.uecommand?.jsmouseup(
        w.clientX * window.devicePixelRatio,
        w.clientY * window.devicePixelRatio,
        w.button
      );
    };
    return document.addEventListener("mousemove", v), document.addEventListener("mousedown", b), document.addEventListener("mouseup", p), document.addEventListener("wheel", i), () => {
      document.removeEventListener("mousemove", v), document.removeEventListener("mousedown", b), document.removeEventListener("mouseup", p), document.removeEventListener("wheel", i);
    };
  }, [s]), { useMouse: s, setUseMouse: u };
}
var N = { exports: {} }, Y = {};
/**
 * @license React
 * react-jsx-runtime.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var xe;
function En() {
  if (xe) return Y;
  xe = 1;
  var r = Ue, s = Symbol.for("react.element"), u = Symbol.for("react.fragment"), c = Object.prototype.hasOwnProperty, o = r.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner, i = { key: !0, ref: !0, __self: !0, __source: !0 };
  function v(b, p, w) {
    var h, k = {}, f = null, y = null;
    w !== void 0 && (f = "" + w), p.key !== void 0 && (f = "" + p.key), p.ref !== void 0 && (y = p.ref);
    for (h in p) c.call(p, h) && !i.hasOwnProperty(h) && (k[h] = p[h]);
    if (b && b.defaultProps) for (h in p = b.defaultProps, p) k[h] === void 0 && (k[h] = p[h]);
    return { $$typeof: s, type: b, key: f, ref: y, props: k, _owner: o.current };
  }
  return Y.Fragment = u, Y.jsx = v, Y.jsxs = v, Y;
}
var J = {};
/**
 * @license React
 * react-jsx-runtime.development.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var Te;
function bn() {
  return Te || (Te = 1, process.env.NODE_ENV !== "production" && (function() {
    var r = Ue, s = Symbol.for("react.element"), u = Symbol.for("react.portal"), c = Symbol.for("react.fragment"), o = Symbol.for("react.strict_mode"), i = Symbol.for("react.profiler"), v = Symbol.for("react.provider"), b = Symbol.for("react.context"), p = Symbol.for("react.forward_ref"), w = Symbol.for("react.suspense"), h = Symbol.for("react.suspense_list"), k = Symbol.for("react.memo"), f = Symbol.for("react.lazy"), y = Symbol.for("react.offscreen"), A = Symbol.iterator, C = "@@iterator";
    function x(e) {
      if (e === null || typeof e != "object")
        return null;
      var n = A && e[A] || e[C];
      return typeof n == "function" ? n : null;
    }
    var O = r.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED;
    function R(e) {
      {
        for (var n = arguments.length, t = new Array(n > 1 ? n - 1 : 0), a = 1; a < n; a++)
          t[a - 1] = arguments[a];
        De("error", e, t);
      }
    }
    function De(e, n, t) {
      {
        var a = O.ReactDebugCurrentFrame, g = a.getStackAddendum();
        g !== "" && (n += "%s", t = t.concat([g]));
        var m = t.map(function(d) {
          return String(d);
        });
        m.unshift("Warning: " + n), Function.prototype.apply.call(console[e], console, m);
      }
    }
    var Le = !1, Me = !1, $e = !1, Fe = !1, Ge = !1, oe;
    oe = Symbol.for("react.module.reference");
    function We(e) {
      return !!(typeof e == "string" || typeof e == "function" || e === c || e === i || Ge || e === o || e === w || e === h || Fe || e === y || Le || Me || $e || typeof e == "object" && e !== null && (e.$$typeof === f || e.$$typeof === k || e.$$typeof === v || e.$$typeof === b || e.$$typeof === p || // This needs to include all possible module reference object
      // types supported by any Flight configuration anywhere since
      // we don't know which Flight build this will end up being used
      // with.
      e.$$typeof === oe || e.getModuleId !== void 0));
    }
    function Ye(e, n, t) {
      var a = e.displayName;
      if (a)
        return a;
      var g = n.displayName || n.name || "";
      return g !== "" ? t + "(" + g + ")" : t;
    }
    function ie(e) {
      return e.displayName || "Context";
    }
    function D(e) {
      if (e == null)
        return null;
      if (typeof e.tag == "number" && R("Received an unexpected object in getComponentNameFromType(). This is likely a bug in React. Please file an issue."), typeof e == "function")
        return e.displayName || e.name || null;
      if (typeof e == "string")
        return e;
      switch (e) {
        case c:
          return "Fragment";
        case u:
          return "Portal";
        case i:
          return "Profiler";
        case o:
          return "StrictMode";
        case w:
          return "Suspense";
        case h:
          return "SuspenseList";
      }
      if (typeof e == "object")
        switch (e.$$typeof) {
          case b:
            var n = e;
            return ie(n) + ".Consumer";
          case v:
            var t = e;
            return ie(t._context) + ".Provider";
          case p:
            return Ye(e, e.render, "ForwardRef");
          case k:
            var a = e.displayName || null;
            return a !== null ? a : D(e.type) || "Memo";
          case f: {
            var g = e, m = g._payload, d = g._init;
            try {
              return D(d(m));
            } catch {
              return null;
            }
          }
        }
      return null;
    }
    var L = Object.assign, G = 0, ae, se, ue, ce, le, de, fe;
    function we() {
    }
    we.__reactDisabledLog = !0;
    function Je() {
      {
        if (G === 0) {
          ae = console.log, se = console.info, ue = console.warn, ce = console.error, le = console.group, de = console.groupCollapsed, fe = console.groupEnd;
          var e = {
            configurable: !0,
            enumerable: !0,
            value: we,
            writable: !0
          };
          Object.defineProperties(console, {
            info: e,
            log: e,
            warn: e,
            error: e,
            group: e,
            groupCollapsed: e,
            groupEnd: e
          });
        }
        G++;
      }
    }
    function qe() {
      {
        if (G--, G === 0) {
          var e = {
            configurable: !0,
            enumerable: !0,
            writable: !0
          };
          Object.defineProperties(console, {
            log: L({}, e, {
              value: ae
            }),
            info: L({}, e, {
              value: se
            }),
            warn: L({}, e, {
              value: ue
            }),
            error: L({}, e, {
              value: ce
            }),
            group: L({}, e, {
              value: le
            }),
            groupCollapsed: L({}, e, {
              value: de
            }),
            groupEnd: L({}, e, {
              value: fe
            })
          });
        }
        G < 0 && R("disabledDepth fell below zero. This is a bug in React. Please file an issue.");
      }
    }
    var Q = O.ReactCurrentDispatcher, z;
    function q(e, n, t) {
      {
        if (z === void 0)
          try {
            throw Error();
          } catch (g) {
            var a = g.stack.trim().match(/\n( *(at )?)/);
            z = a && a[1] || "";
          }
        return `
` + z + e;
      }
    }
    var X = !1, B;
    {
      var Be = typeof WeakMap == "function" ? WeakMap : Map;
      B = new Be();
    }
    function ve(e, n) {
      if (!e || X)
        return "";
      {
        var t = B.get(e);
        if (t !== void 0)
          return t;
      }
      var a;
      X = !0;
      var g = Error.prepareStackTrace;
      Error.prepareStackTrace = void 0;
      var m;
      m = Q.current, Q.current = null, Je();
      try {
        if (n) {
          var d = function() {
            throw Error();
          };
          if (Object.defineProperty(d.prototype, "props", {
            set: function() {
              throw Error();
            }
          }), typeof Reflect == "object" && Reflect.construct) {
            try {
              Reflect.construct(d, []);
            } catch (P) {
              a = P;
            }
            Reflect.construct(e, [], d);
          } else {
            try {
              d.call();
            } catch (P) {
              a = P;
            }
            e.call(d.prototype);
          }
        } else {
          try {
            throw Error();
          } catch (P) {
            a = P;
          }
          e();
        }
      } catch (P) {
        if (P && a && typeof P.stack == "string") {
          for (var l = P.stack.split(`
`), _ = a.stack.split(`
`), E = l.length - 1, S = _.length - 1; E >= 1 && S >= 0 && l[E] !== _[S]; )
            S--;
          for (; E >= 1 && S >= 0; E--, S--)
            if (l[E] !== _[S]) {
              if (E !== 1 || S !== 1)
                do
                  if (E--, S--, S < 0 || l[E] !== _[S]) {
                    var T = `
` + l[E].replace(" at new ", " at ");
                    return e.displayName && T.includes("<anonymous>") && (T = T.replace("<anonymous>", e.displayName)), typeof e == "function" && B.set(e, T), T;
                  }
                while (E >= 1 && S >= 0);
              break;
            }
        }
      } finally {
        X = !1, Q.current = m, qe(), Error.prepareStackTrace = g;
      }
      var F = e ? e.displayName || e.name : "", M = F ? q(F) : "";
      return typeof e == "function" && B.set(e, M), M;
    }
    function Ke(e, n, t) {
      return ve(e, !1);
    }
    function Ve(e) {
      var n = e.prototype;
      return !!(n && n.isReactComponent);
    }
    function K(e, n, t) {
      if (e == null)
        return "";
      if (typeof e == "function")
        return ve(e, Ve(e));
      if (typeof e == "string")
        return q(e);
      switch (e) {
        case w:
          return q("Suspense");
        case h:
          return q("SuspenseList");
      }
      if (typeof e == "object")
        switch (e.$$typeof) {
          case p:
            return Ke(e.render);
          case k:
            return K(e.type, n, t);
          case f: {
            var a = e, g = a._payload, m = a._init;
            try {
              return K(m(g), n, t);
            } catch {
            }
          }
        }
      return "";
    }
    var W = Object.prototype.hasOwnProperty, pe = {}, ge = O.ReactDebugCurrentFrame;
    function V(e) {
      if (e) {
        var n = e._owner, t = K(e.type, e._source, n ? n.type : null);
        ge.setExtraStackFrame(t);
      } else
        ge.setExtraStackFrame(null);
    }
    function Ne(e, n, t, a, g) {
      {
        var m = Function.call.bind(W);
        for (var d in e)
          if (m(e, d)) {
            var l = void 0;
            try {
              if (typeof e[d] != "function") {
                var _ = Error((a || "React class") + ": " + t + " type `" + d + "` is invalid; it must be a function, usually from the `prop-types` package, but received `" + typeof e[d] + "`.This often happens because of typos such as `PropTypes.function` instead of `PropTypes.func`.");
                throw _.name = "Invariant Violation", _;
              }
              l = e[d](n, d, a, t, null, "SECRET_DO_NOT_PASS_THIS_OR_YOU_WILL_BE_FIRED");
            } catch (E) {
              l = E;
            }
            l && !(l instanceof Error) && (V(g), R("%s: type specification of %s `%s` is invalid; the type checker function must return `null` or an `Error` but returned a %s. You may have forgotten to pass an argument to the type checker creator (arrayOf, instanceOf, objectOf, oneOf, oneOfType, and shape all require an argument).", a || "React class", t, d, typeof l), V(null)), l instanceof Error && !(l.message in pe) && (pe[l.message] = !0, V(g), R("Failed %s type: %s", t, l.message), V(null));
          }
      }
    }
    var Qe = Array.isArray;
    function H(e) {
      return Qe(e);
    }
    function ze(e) {
      {
        var n = typeof Symbol == "function" && Symbol.toStringTag, t = n && e[Symbol.toStringTag] || e.constructor.name || "Object";
        return t;
      }
    }
    function Xe(e) {
      try {
        return me(e), !1;
      } catch {
        return !0;
      }
    }
    function me(e) {
      return "" + e;
    }
    function he(e) {
      if (Xe(e))
        return R("The provided key is an unsupported type %s. This value must be coerced to a string before before using it here.", ze(e)), me(e);
    }
    var ye = O.ReactCurrentOwner, He = {
      key: !0,
      ref: !0,
      __self: !0,
      __source: !0
    }, Ee, be;
    function Ze(e) {
      if (W.call(e, "ref")) {
        var n = Object.getOwnPropertyDescriptor(e, "ref").get;
        if (n && n.isReactWarning)
          return !1;
      }
      return e.ref !== void 0;
    }
    function en(e) {
      if (W.call(e, "key")) {
        var n = Object.getOwnPropertyDescriptor(e, "key").get;
        if (n && n.isReactWarning)
          return !1;
      }
      return e.key !== void 0;
    }
    function nn(e, n) {
      typeof e.ref == "string" && ye.current;
    }
    function tn(e, n) {
      {
        var t = function() {
          Ee || (Ee = !0, R("%s: `key` is not a prop. Trying to access it will result in `undefined` being returned. If you need to access the same value within the child component, you should pass it as a different prop. (https://reactjs.org/link/special-props)", n));
        };
        t.isReactWarning = !0, Object.defineProperty(e, "key", {
          get: t,
          configurable: !0
        });
      }
    }
    function rn(e, n) {
      {
        var t = function() {
          be || (be = !0, R("%s: `ref` is not a prop. Trying to access it will result in `undefined` being returned. If you need to access the same value within the child component, you should pass it as a different prop. (https://reactjs.org/link/special-props)", n));
        };
        t.isReactWarning = !0, Object.defineProperty(e, "ref", {
          get: t,
          configurable: !0
        });
      }
    }
    var on = function(e, n, t, a, g, m, d) {
      var l = {
        // This tag allows us to uniquely identify this as a React Element
        $$typeof: s,
        // Built-in properties that belong on the element
        type: e,
        key: n,
        ref: t,
        props: d,
        // Record the component responsible for creating this element.
        _owner: m
      };
      return l._store = {}, Object.defineProperty(l._store, "validated", {
        configurable: !1,
        enumerable: !1,
        writable: !0,
        value: !1
      }), Object.defineProperty(l, "_self", {
        configurable: !1,
        enumerable: !1,
        writable: !1,
        value: a
      }), Object.defineProperty(l, "_source", {
        configurable: !1,
        enumerable: !1,
        writable: !1,
        value: g
      }), Object.freeze && (Object.freeze(l.props), Object.freeze(l)), l;
    };
    function an(e, n, t, a, g) {
      {
        var m, d = {}, l = null, _ = null;
        t !== void 0 && (he(t), l = "" + t), en(n) && (he(n.key), l = "" + n.key), Ze(n) && (_ = n.ref, nn(n, g));
        for (m in n)
          W.call(n, m) && !He.hasOwnProperty(m) && (d[m] = n[m]);
        if (e && e.defaultProps) {
          var E = e.defaultProps;
          for (m in E)
            d[m] === void 0 && (d[m] = E[m]);
        }
        if (l || _) {
          var S = typeof e == "function" ? e.displayName || e.name || "Unknown" : e;
          l && tn(d, S), _ && rn(d, S);
        }
        return on(e, l, _, g, a, ye.current, d);
      }
    }
    var Z = O.ReactCurrentOwner, Se = O.ReactDebugCurrentFrame;
    function $(e) {
      if (e) {
        var n = e._owner, t = K(e.type, e._source, n ? n.type : null);
        Se.setExtraStackFrame(t);
      } else
        Se.setExtraStackFrame(null);
    }
    var ee;
    ee = !1;
    function ne(e) {
      return typeof e == "object" && e !== null && e.$$typeof === s;
    }
    function ke() {
      {
        if (Z.current) {
          var e = D(Z.current.type);
          if (e)
            return `

Check the render method of \`` + e + "`.";
        }
        return "";
      }
    }
    function sn(e) {
      return "";
    }
    var Re = {};
    function un(e) {
      {
        var n = ke();
        if (!n) {
          var t = typeof e == "string" ? e : e.displayName || e.name;
          t && (n = `

Check the top-level render call using <` + t + ">.");
        }
        return n;
      }
    }
    function _e(e, n) {
      {
        if (!e._store || e._store.validated || e.key != null)
          return;
        e._store.validated = !0;
        var t = un(n);
        if (Re[t])
          return;
        Re[t] = !0;
        var a = "";
        e && e._owner && e._owner !== Z.current && (a = " It was passed a child from " + D(e._owner.type) + "."), $(e), R('Each child in a list should have a unique "key" prop.%s%s See https://reactjs.org/link/warning-keys for more information.', t, a), $(null);
      }
    }
    function Pe(e, n) {
      {
        if (typeof e != "object")
          return;
        if (H(e))
          for (var t = 0; t < e.length; t++) {
            var a = e[t];
            ne(a) && _e(a, n);
          }
        else if (ne(e))
          e._store && (e._store.validated = !0);
        else if (e) {
          var g = x(e);
          if (typeof g == "function" && g !== e.entries)
            for (var m = g.call(e), d; !(d = m.next()).done; )
              ne(d.value) && _e(d.value, n);
        }
      }
    }
    function cn(e) {
      {
        var n = e.type;
        if (n == null || typeof n == "string")
          return;
        var t;
        if (typeof n == "function")
          t = n.propTypes;
        else if (typeof n == "object" && (n.$$typeof === p || // Note: Memo only checks outer props here.
        // Inner props are checked in the reconciler.
        n.$$typeof === k))
          t = n.propTypes;
        else
          return;
        if (t) {
          var a = D(n);
          Ne(t, e.props, "prop", a, e);
        } else if (n.PropTypes !== void 0 && !ee) {
          ee = !0;
          var g = D(n);
          R("Component %s declared `PropTypes` instead of `propTypes`. Did you misspell the property assignment?", g || "Unknown");
        }
        typeof n.getDefaultProps == "function" && !n.getDefaultProps.isReactClassApproved && R("getDefaultProps is only used on classic React.createClass definitions. Use a static property named `defaultProps` instead.");
      }
    }
    function ln(e) {
      {
        for (var n = Object.keys(e.props), t = 0; t < n.length; t++) {
          var a = n[t];
          if (a !== "children" && a !== "key") {
            $(e), R("Invalid prop `%s` supplied to `React.Fragment`. React.Fragment can only have `key` and `children` props.", a), $(null);
            break;
          }
        }
        e.ref !== null && ($(e), R("Invalid attribute `ref` supplied to `React.Fragment`."), $(null));
      }
    }
    var Ae = {};
    function Ce(e, n, t, a, g, m) {
      {
        var d = We(e);
        if (!d) {
          var l = "";
          (e === void 0 || typeof e == "object" && e !== null && Object.keys(e).length === 0) && (l += " You likely forgot to export your component from the file it's defined in, or you might have mixed up default and named imports.");
          var _ = sn();
          _ ? l += _ : l += ke();
          var E;
          e === null ? E = "null" : H(e) ? E = "array" : e !== void 0 && e.$$typeof === s ? (E = "<" + (D(e.type) || "Unknown") + " />", l = " Did you accidentally export a JSX literal instead of a component?") : E = typeof e, R("React.jsx: type is invalid -- expected a string (for built-in components) or a class/function (for composite components) but got: %s.%s", E, l);
        }
        var S = an(e, n, t, g, m);
        if (S == null)
          return S;
        if (d) {
          var T = n.children;
          if (T !== void 0)
            if (a)
              if (H(T)) {
                for (var F = 0; F < T.length; F++)
                  Pe(T[F], e);
                Object.freeze && Object.freeze(T);
              } else
                R("React.jsx: Static children should always be an array. You are likely explicitly calling React.jsxs or React.jsxDEV. Use the Babel transform instead.");
            else
              Pe(T, e);
        }
        if (W.call(n, "key")) {
          var M = D(e), P = Object.keys(n).filter(function(gn) {
            return gn !== "key";
          }), te = P.length > 0 ? "{key: someKey, " + P.join(": ..., ") + ": ...}" : "{key: someKey}";
          if (!Ae[M + te]) {
            var pn = P.length > 0 ? "{" + P.join(": ..., ") + ": ...}" : "{}";
            R(`A props object containing a "key" prop is being spread into JSX:
  let props = %s;
  <%s {...props} />
React keys must be passed directly to JSX without using spread:
  let props = %s;
  <%s key={someKey} {...props} />`, te, M, pn, M), Ae[M + te] = !0;
          }
        }
        return e === c ? ln(S) : cn(S), S;
      }
    }
    function dn(e, n, t) {
      return Ce(e, n, t, !0);
    }
    function fn(e, n, t) {
      return Ce(e, n, t, !1);
    }
    var wn = fn, vn = dn;
    J.Fragment = c, J.jsx = wn, J.jsxs = vn;
  })()), J;
}
var Oe;
function Sn() {
  return Oe || (Oe = 1, process.env.NODE_ENV === "production" ? N.exports = En() : N.exports = bn()), N.exports;
}
var kn = Sn();
function Rn(r = {}) {
  const { onKeyAction: s } = r, [u, c] = I(null), o = U(
    (i) => {
      c(i), s?.(i);
    },
    [s]
  );
  return j(() => {
    const i = window, v = () => o("Up"), b = () => o("Down"), p = () => o("Left"), w = () => o("Right"), h = () => o("Next"), k = () => o("Previous"), f = () => o("Select");
    return i.keyUp = v, i.keyDown = b, i.keyLeft = p, i.keyRight = w, i.keyNext = h, i.keyPrev = k, i.keyEventChoose = f, () => {
      delete i.keyUp, delete i.keyDown, delete i.keyLeft, delete i.keyRight, delete i.keyNext, delete i.keyPrev, delete i.keyEventChoose;
    };
  }, [o]), { lastKeyAction: u };
}
const Ie = mn(null), xn = ({
  children: r
}) => {
  const [s, u] = I(!1), [c] = I(() => !!(navigator.userAgent.match(/Android/i) || navigator.userAgent.match(/webOS/i) || navigator.userAgent.match(/iPhone/i) || navigator.userAgent.match(/iPad/i) || navigator.userAgent.match(/iPod/i) || navigator.userAgent.match(/BlackBerry/i) || navigator.userAgent.match(/Windows Phone/i))), { useMouse: o, setUseMouse: i } = yn(), { lastKeyAction: v } = Rn();
  return j(() => {
    const b = () => {
      const p = window;
      u(!!(p.ue && p.ue.uecommand));
    };
    return b(), window.addEventListener("load", b), () => window.removeEventListener("load", b);
  }, []), /* @__PURE__ */ kn.jsx(
    Ie.Provider,
    {
      value: { isConnected: s, isMobile: c, useMouse: o, setUseMouse: i, lastKeyAction: v },
      children: r
    }
  );
};
function _n() {
  const r = hn(Ie);
  if (!r)
    throw new Error("useUEContext must be used within a UEProvider");
  return r;
}
function Tn() {
  const [r, s] = I(window.devicePixelRatio || 1);
  return j(() => {
    const o = () => s(window.devicePixelRatio || 1);
    return window.addEventListener("resize", o), () => window.removeEventListener("resize", o);
  }, []), { ratio: r, toPhysical: (o) => o * r, toLogical: (o) => o / r };
}
function On(r) {
  j(() => {
    const { disableContextMenu: s = !0, disableTabKey: u = !0 } = r || {}, c = (i) => {
      s && i.preventDefault();
    }, o = (i) => {
      u && i.key === "Tab" && i.preventDefault();
    };
    return document.addEventListener("contextmenu", c), document.addEventListener("keydown", o), () => {
      document.removeEventListener("contextmenu", c), document.removeEventListener("keydown", o);
    };
  }, [r?.disableContextMenu, r?.disableTabKey]);
}
function Pn(r) {
  return r.replace(/\\"/g, '"').replace(/^"(.*)"$/, "$1");
}
function An(r) {
  return JSON.stringify(r).replace(/\\u2028/g, "\\u2028").replace(/\\u2029/g, "\\u2029");
}
function je(r) {
  if (!r) return null;
  if (typeof r == "object") return r;
  try {
    return JSON.parse(r);
  } catch {
    return null;
  }
}
function jn(r, s) {
  if (!r) return;
  const u = {};
  for (const [c, o] of Object.entries(s))
    c in r && (typeof o == "function" ? o(r[c]) && (u[c] = r[c]) : r[c] === o && (u[c] = r[c]));
  return Object.keys(u).length > 0 ? u : void 0;
}
const Un = ({ functionName: r }) => {
  const [s, u] = I(!1), [c] = I(() => !!(navigator.userAgent.match(/Android/i) || navigator.userAgent.match(/webOS/i) || navigator.userAgent.match(/iPhone/i) || navigator.userAgent.match(/iPad/i) || navigator.userAgent.match(/iPod/i) || navigator.userAgent.match(/BlackBerry/i) || navigator.userAgent.match(/Windows Phone/i))), o = U(
    (i) => {
      const v = window, b = Pn(JSON.stringify(i));
      if (c)
        console.warn("Mobile WebSocket implementation not included");
      else if (s && v.ue?.uecommand)
        try {
          const p = v.ue.uecommand;
          typeof p.emitjsonevent == "function" ? p.emitjsonevent(r, b) : console.warn(
            "[useUEEventJSON] uecommand has no emitjsonevent/EmitJsONEvent method"
          );
        } catch (p) {
          console.error("[useUEEventJSON] send failed", p);
        }
      else
        console.warn("UE4 connection not found");
    },
    [r, s, c]
  );
  return j(() => {
    const i = () => {
      const v = window;
      u(!!(v.ue && v.ue.uecommand));
    };
    return i(), window.addEventListener("load", i), () => window.removeEventListener("load", i);
  }, []), o;
}, In = () => {
  const { isConnected: r, isMobile: s } = _n(), [u, c] = I({
    resolution: "1280x720",
    windowMode: 2,
    antiAliasing: 3,
    shadows: 3,
    resolutionScale: 10
  }), [o, i] = I(!1);
  j(() => {
    typeof window < "u" && (window.UE4SetGraphics = function(f, y, A, C, x, O = !1) {
      window.resolution = f, window.windowMode = parseInt(String(y)), window.antiAliasing = parseInt(String(A)), window.shadows = parseInt(String(C)), window.resolutionScale = parseInt(String(x)), O && window.UE4ApplyAndSaveGraphics?.();
    }, window.UE4GetGraphics = function() {
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|Windows Phone/i.test(
        navigator.userAgent
      ) ? window.websocket?.send("#ue4getgraphics") : window.ue?.uecommand?.javascriptgetgraphics?.();
    }, window.UE4ApplyAndSaveGraphics = function() {
      const f = window.resolution || "1280x720", y = parseInt(String(window.windowMode || 2)), A = parseInt(
        String(window.antiAliasing || 3)
      ), C = parseInt(String(window.shadows || 3)), x = parseInt(
        String(window.resolutionScale || 10)
      );
      s ? window.websocket?.send(
        `#ue4applyandsavegraphics'();:${f}'();:${y}'();:${A}'();:${C}'();:${x}`
      ) : window.ue?.uecommand?.javascriptapplyandsavegraphics?.(
        f,
        y,
        A,
        C,
        x
      );
    }, window.UE4QuitGame = function() {
      s ? window.websocketConnected ? window.websocket?.send("#ue4quit") : (window.mobileActionsStack || (window.mobileActionsStack = []), window.mobileActionsStack.push("#ue4quit")) : window.ue?.uecommand ? window.ue.uecommand.javascriptquitgame?.() : console.log("UE4 process not found! This works only in UE4/UE5.");
    });
  }, []);
  const v = U(() => {
    typeof window < "u" && (window.UE4QuitGame ? window.UE4QuitGame() : s ? window.websocketConnected ? window.websocket?.send("#ue4quit") : (window.mobileActionsStack || (window.mobileActionsStack = []), window.mobileActionsStack.push("#ue4quit")) : window.ue?.uecommand ? window.ue.uecommand.javascriptquitgame?.() : console.log("UE4 process not found! This works only in UE4/UE5."));
  }, []), b = U((f) => {
    typeof window < "u" && (s ? window.websocketConnected ? window.websocket?.send(`#ue4travel'();:${f}`) : (window.mobileActionsStack || (window.mobileActionsStack = []), window.mobileActionsStack.push(
      `#ue4travel'();:${f}`
    )) : window.ue?.uecommand ? window.ue.uecommand.javascriptclienttravel(f) : console.log(f));
  }, []), p = U((f) => {
    typeof window < "u" && (s ? window.websocketConnected ? window.websocket?.send(`#console'();:${f}`) : (window.mobileActionsStack || (window.mobileActionsStack = []), window.mobileActionsStack.push(`#console'();:${f}`)) : window.ue?.uecommand ? window.ue.uecommand.javascriptconsolecommand(f) : alert("UE4 process not found! This works only in UE4/UE5."));
  }, []), w = U(
    (f, y, A, C, x, O = !1) => {
      typeof window < "u" && (window.UE4SetGraphics ? window.UE4SetGraphics(
        f,
        y,
        A,
        C,
        x,
        O
      ) : (window.resolution = f, window.windowMode = parseInt(String(y)), window.antiAliasing = parseInt(String(A)), window.shadows = parseInt(String(C)), window.resolutionScale = parseInt(String(x)), O && window.UE4ApplyAndSaveGraphics?.()));
    },
    []
  ), h = U(() => {
    if (typeof window < "u")
      if (window.UE4ApplyAndSaveGraphics)
        window.UE4ApplyAndSaveGraphics();
      else {
        const f = window.resolution || "1280x720", y = parseInt(String(window.windowMode || 2)), A = parseInt(
          String(window.antiAliasing || 3)
        ), C = parseInt(String(window.shadows || 3)), x = parseInt(
          String(window.resolutionScale || 10)
        );
        s ? window.websocket?.send(
          `#ue4applyandsavegraphics'();:${f}'();:${y}'();:${A}'();:${C}'();:${x}`
        ) : window.ue?.uecommand?.javascriptapplyandsavegraphics?.(
          f,
          y,
          A,
          C,
          x
        );
      }
  }, []), k = U(() => {
    typeof window < "u" && (i(!0), window.UE4GetGraphics ? window.UE4GetGraphics() : s ? window.websocketConnected ? window.websocket?.send("#ue4getgraphics") : (window.mobileActionsStack || (window.mobileActionsStack = []), window.mobileActionsStack.push("#ue4getgraphics")) : window.ue?.uecommand ? window.ue.uecommand.javascriptgetgraphics() : (console.log("UE4 process not found! This works only in UE4/UE5."), i(!1)));
  }, []);
  return j(() => {
    if (typeof window > "u") return;
    const f = (y) => {
      c({
        resolution: y.resolution || "1280x720",
        windowMode: y.windowMode || 2,
        antiAliasing: y.antiAliasing || 3,
        shadows: y.shadows || 3,
        resolutionScale: y.resolutionScale || 10
      }), i(!1);
    };
    return window.setGraphicsSettings = f, () => {
      delete window.setGraphicsSettings;
    };
  }, []), j(() => {
    r && k();
  }, [r, k]), {
    // 游戏控制功能
    quitGame: v,
    clientTravel: b,
    consoleCommand: p,
    // 图形设置功能
    setGraphics: w,
    applyAndSaveGraphics: h,
    getGraphicsSettings: k,
    // 图形设置状态
    graphicsSettings: u,
    isGraphicsLoading: o,
    // 便捷的图形设置获取器
    resolution: u.resolution,
    windowMode: u.windowMode,
    antiAliasing: u.antiAliasing,
    shadows: u.shadows,
    resolutionScale: u.resolutionScale
  };
};
function Dn(r) {
  return U(
    (s) => {
      const u = {
        type: "event",
        topic: r,
        payload: s ?? null,
        timestamp: Date.now(),
        source: "web"
      }, c = An(u), o = window;
      try {
        o?.ue?.uecommand?.emitjsonevent?.(r, c), o && o.__quickui_debug && console.debug("[QuickUI] send", r, u);
      } catch (i) {
        console.warn("[QuickUI] EmitJsONEvent failed", i);
        try {
          const v = `window.${r}(${c});`;
          o?.ue?.uecommand?.executejs?.(v), o && o.__quickui_debug && console.debug("[QuickUI] fallback send executejs", v);
        } catch (v) {
          console.error("[QuickUI] send failed", v);
        }
      }
    },
    [r]
  );
}
function Ln(r, s) {
  const u = re(s);
  u.current = s, j(() => {
    const c = (o) => {
      const i = je(o);
      if (!i) {
        try {
          if (typeof o == "string") {
            const v = je(o);
            v ? u.current(v) : u.current({
              type: "event",
              topic: r,
              payload: { data: o },
              timestamp: Date.now(),
              source: "ue"
            });
          } else
            u.current({
              type: "event",
              topic: r,
              payload: { data: o },
              timestamp: Date.now(),
              source: "ue"
            });
        } catch (v) {
          console.warn("[QuickUI] invalid event payload", v);
        }
        return;
      }
      u.current(i);
    };
    return window[r] = c, () => {
      try {
        delete window[r];
      } catch (o) {
        console.warn("[QuickUI] failed to delete global function", o);
      }
    };
  }, [r]);
}
function Mn(r, s) {
  const u = re(s), c = re(null);
  u.current = s, j(() => {
    const o = (i) => {
      i !== c.current && (c.current = i, u.current(i));
    };
    return window[r] = o, () => {
      delete window[r];
    };
  }, [r]);
}
export {
  xn as UEProvider,
  jn as filterUECallBackJSonData,
  Tn as useDPR,
  On as useInputBlocker,
  Rn as useInputKeyEventListener,
  Ln as useQuickUIEventListener,
  Dn as useQuickUIEventSender,
  Mn as useUECallback,
  _n as useUEContext,
  Un as useUEEventJSON,
  In as useUEGameControl,
  yn as useUEMouse
};
