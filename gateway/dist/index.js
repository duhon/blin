"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// ../node_modules/fast-content-type-parse/index.js
var require_fast_content_type_parse = __commonJS({
  "../node_modules/fast-content-type-parse/index.js"(exports2, module2) {
    "use strict";
    var NullObject = function NullObject2() {
    };
    NullObject.prototype = /* @__PURE__ */ Object.create(null);
    var paramRE = /; *([!#$%&'*+.^\w`|~-]+)=("(?:[\v\u0020\u0021\u0023-\u005b\u005d-\u007e\u0080-\u00ff]|\\[\v\u0020-\u00ff])*"|[!#$%&'*+.^\w`|~-]+) */gu;
    var quotedPairRE = /\\([\v\u0020-\u00ff])/gu;
    var mediaTypeRE = /^[!#$%&'*+.^\w|~-]+\/[!#$%&'*+.^\w|~-]+$/u;
    var defaultContentType = { type: "", parameters: new NullObject() };
    Object.freeze(defaultContentType.parameters);
    Object.freeze(defaultContentType);
    function parse2(header) {
      if (typeof header !== "string") {
        throw new TypeError("argument header is required and must be a string");
      }
      let index = header.indexOf(";");
      const type = index !== -1 ? header.slice(0, index).trim() : header.trim();
      if (mediaTypeRE.test(type) === false) {
        throw new TypeError("invalid media type");
      }
      const result = {
        type: type.toLowerCase(),
        parameters: new NullObject()
      };
      if (index === -1) {
        return result;
      }
      let key;
      let match;
      let value;
      paramRE.lastIndex = index;
      while (match = paramRE.exec(header)) {
        if (match.index !== index) {
          throw new TypeError("invalid parameter format");
        }
        index += match[0].length;
        key = match[1].toLowerCase();
        value = match[2];
        if (value[0] === '"') {
          value = value.slice(1, value.length - 1);
          quotedPairRE.test(value) && (value = value.replace(quotedPairRE, "$1"));
        }
        result.parameters[key] = value;
      }
      if (index !== header.length) {
        throw new TypeError("invalid parameter format");
      }
      return result;
    }
    function safeParse2(header) {
      if (typeof header !== "string") {
        return defaultContentType;
      }
      let index = header.indexOf(";");
      const type = index !== -1 ? header.slice(0, index).trim() : header.trim();
      if (mediaTypeRE.test(type) === false) {
        return defaultContentType;
      }
      const result = {
        type: type.toLowerCase(),
        parameters: new NullObject()
      };
      if (index === -1) {
        return result;
      }
      let key;
      let match;
      let value;
      paramRE.lastIndex = index;
      while (match = paramRE.exec(header)) {
        if (match.index !== index) {
          return defaultContentType;
        }
        index += match[0].length;
        key = match[1].toLowerCase();
        value = match[2];
        if (value[0] === '"') {
          value = value.slice(1, value.length - 1);
          quotedPairRE.test(value) && (value = value.replace(quotedPairRE, "$1"));
        }
        result.parameters[key] = value;
      }
      if (index !== header.length) {
        return defaultContentType;
      }
      return result;
    }
    module2.exports.default = { parse: parse2, safeParse: safeParse2 };
    module2.exports.parse = parse2;
    module2.exports.safeParse = safeParse2;
    module2.exports.defaultContentType = defaultContentType;
  }
});

// src/lambda.ts
var lambda_exports = {};
__export(lambda_exports, {
  handler: () => handler
});
module.exports = __toCommonJS(lambda_exports);

// ../node_modules/universal-user-agent/index.js
function getUserAgent() {
  if (typeof navigator === "object" && "userAgent" in navigator) {
    return navigator.userAgent;
  }
  if (typeof process === "object" && process.version !== void 0) {
    return `Node.js/${process.version.substr(1)} (${process.platform}; ${process.arch})`;
  }
  return "<environment undetectable>";
}

// ../node_modules/before-after-hook/lib/register.js
function register(state, name, method, options) {
  if (typeof method !== "function") {
    throw new Error("method for before hook must be a function");
  }
  if (!options) {
    options = {};
  }
  if (Array.isArray(name)) {
    return name.reverse().reduce((callback, name2) => {
      return register.bind(null, state, name2, callback, options);
    }, method)();
  }
  return Promise.resolve().then(() => {
    if (!state.registry[name]) {
      return method(options);
    }
    return state.registry[name].reduce((method2, registered) => {
      return registered.hook.bind(null, method2, options);
    }, method)();
  });
}

// ../node_modules/before-after-hook/lib/add.js
function addHook(state, kind, name, hook7) {
  const orig = hook7;
  if (!state.registry[name]) {
    state.registry[name] = [];
  }
  if (kind === "before") {
    hook7 = (method, options) => {
      return Promise.resolve().then(orig.bind(null, options)).then(method.bind(null, options));
    };
  }
  if (kind === "after") {
    hook7 = (method, options) => {
      let result;
      return Promise.resolve().then(method.bind(null, options)).then((result_) => {
        result = result_;
        return orig(result, options);
      }).then(() => {
        return result;
      });
    };
  }
  if (kind === "error") {
    hook7 = (method, options) => {
      return Promise.resolve().then(method.bind(null, options)).catch((error) => {
        return orig(error, options);
      });
    };
  }
  state.registry[name].push({
    hook: hook7,
    orig
  });
}

// ../node_modules/before-after-hook/lib/remove.js
function removeHook(state, name, method) {
  if (!state.registry[name]) {
    return;
  }
  const index = state.registry[name].map((registered) => {
    return registered.orig;
  }).indexOf(method);
  if (index === -1) {
    return;
  }
  state.registry[name].splice(index, 1);
}

// ../node_modules/before-after-hook/index.js
var bind = Function.bind;
var bindable = bind.bind(bind);
function bindApi(hook7, state, name) {
  const removeHookRef = bindable(removeHook, null).apply(
    null,
    name ? [state, name] : [state]
  );
  hook7.api = { remove: removeHookRef };
  hook7.remove = removeHookRef;
  ["before", "error", "after", "wrap"].forEach((kind) => {
    const args = name ? [state, kind, name] : [state, kind];
    hook7[kind] = hook7.api[kind] = bindable(addHook, null).apply(null, args);
  });
}
function Singular() {
  const singularHookName = Symbol("Singular");
  const singularHookState = {
    registry: {}
  };
  const singularHook = register.bind(null, singularHookState, singularHookName);
  bindApi(singularHook, singularHookState, singularHookName);
  return singularHook;
}
function Collection() {
  const state = {
    registry: {}
  };
  const hook7 = register.bind(null, state);
  bindApi(hook7, state);
  return hook7;
}
var before_after_hook_default = { Singular, Collection };

// ../node_modules/@octokit/endpoint/dist-bundle/index.js
var VERSION = "0.0.0-development";
var userAgent = `octokit-endpoint.js/${VERSION} ${getUserAgent()}`;
var DEFAULTS = {
  method: "GET",
  baseUrl: "https://api.github.com",
  headers: {
    accept: "application/vnd.github.v3+json",
    "user-agent": userAgent
  },
  mediaType: {
    format: ""
  }
};
function lowercaseKeys(object) {
  if (!object) {
    return {};
  }
  return Object.keys(object).reduce((newObj, key) => {
    newObj[key.toLowerCase()] = object[key];
    return newObj;
  }, {});
}
function isPlainObject(value) {
  if (typeof value !== "object" || value === null) return false;
  if (Object.prototype.toString.call(value) !== "[object Object]") return false;
  const proto = Object.getPrototypeOf(value);
  if (proto === null) return true;
  const Ctor = Object.prototype.hasOwnProperty.call(proto, "constructor") && proto.constructor;
  return typeof Ctor === "function" && Ctor instanceof Ctor && Function.prototype.call(Ctor) === Function.prototype.call(value);
}
function mergeDeep(defaults, options) {
  const result = Object.assign({}, defaults);
  Object.keys(options).forEach((key) => {
    if (isPlainObject(options[key])) {
      if (!(key in defaults)) Object.assign(result, { [key]: options[key] });
      else result[key] = mergeDeep(defaults[key], options[key]);
    } else {
      Object.assign(result, { [key]: options[key] });
    }
  });
  return result;
}
function removeUndefinedProperties(obj) {
  for (const key in obj) {
    if (obj[key] === void 0) {
      delete obj[key];
    }
  }
  return obj;
}
function merge(defaults, route, options) {
  if (typeof route === "string") {
    let [method, url] = route.split(" ");
    options = Object.assign(url ? { method, url } : { url: method }, options);
  } else {
    options = Object.assign({}, route);
  }
  options.headers = lowercaseKeys(options.headers);
  removeUndefinedProperties(options);
  removeUndefinedProperties(options.headers);
  const mergedOptions = mergeDeep(defaults || {}, options);
  if (options.url === "/graphql") {
    if (defaults && defaults.mediaType.previews?.length) {
      mergedOptions.mediaType.previews = defaults.mediaType.previews.filter(
        (preview) => !mergedOptions.mediaType.previews.includes(preview)
      ).concat(mergedOptions.mediaType.previews);
    }
    mergedOptions.mediaType.previews = (mergedOptions.mediaType.previews || []).map((preview) => preview.replace(/-preview/, ""));
  }
  return mergedOptions;
}
function addQueryParameters(url, parameters) {
  const separator = /\?/.test(url) ? "&" : "?";
  const names = Object.keys(parameters);
  if (names.length === 0) {
    return url;
  }
  return url + separator + names.map((name) => {
    if (name === "q") {
      return "q=" + parameters.q.split("+").map(encodeURIComponent).join("+");
    }
    return `${name}=${encodeURIComponent(parameters[name])}`;
  }).join("&");
}
var urlVariableRegex = /\{[^{}}]+\}/g;
function removeNonChars(variableName) {
  return variableName.replace(/(?:^\W+)|(?:(?<!\W)\W+$)/g, "").split(/,/);
}
function extractUrlVariableNames(url) {
  const matches = url.match(urlVariableRegex);
  if (!matches) {
    return [];
  }
  return matches.map(removeNonChars).reduce((a, b) => a.concat(b), []);
}
function omit(object, keysToOmit) {
  const result = { __proto__: null };
  for (const key of Object.keys(object)) {
    if (keysToOmit.indexOf(key) === -1) {
      result[key] = object[key];
    }
  }
  return result;
}
function encodeReserved(str) {
  return str.split(/(%[0-9A-Fa-f]{2})/g).map(function(part) {
    if (!/%[0-9A-Fa-f]/.test(part)) {
      part = encodeURI(part).replace(/%5B/g, "[").replace(/%5D/g, "]");
    }
    return part;
  }).join("");
}
function encodeUnreserved(str) {
  return encodeURIComponent(str).replace(/[!'()*]/g, function(c) {
    return "%" + c.charCodeAt(0).toString(16).toUpperCase();
  });
}
function encodeValue(operator, value, key) {
  value = operator === "+" || operator === "#" ? encodeReserved(value) : encodeUnreserved(value);
  if (key) {
    return encodeUnreserved(key) + "=" + value;
  } else {
    return value;
  }
}
function isDefined(value) {
  return value !== void 0 && value !== null;
}
function isKeyOperator(operator) {
  return operator === ";" || operator === "&" || operator === "?";
}
function getValues(context, operator, key, modifier) {
  var value = context[key], result = [];
  if (isDefined(value) && value !== "") {
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      value = value.toString();
      if (modifier && modifier !== "*") {
        value = value.substring(0, parseInt(modifier, 10));
      }
      result.push(
        encodeValue(operator, value, isKeyOperator(operator) ? key : "")
      );
    } else {
      if (modifier === "*") {
        if (Array.isArray(value)) {
          value.filter(isDefined).forEach(function(value2) {
            result.push(
              encodeValue(operator, value2, isKeyOperator(operator) ? key : "")
            );
          });
        } else {
          Object.keys(value).forEach(function(k) {
            if (isDefined(value[k])) {
              result.push(encodeValue(operator, value[k], k));
            }
          });
        }
      } else {
        const tmp = [];
        if (Array.isArray(value)) {
          value.filter(isDefined).forEach(function(value2) {
            tmp.push(encodeValue(operator, value2));
          });
        } else {
          Object.keys(value).forEach(function(k) {
            if (isDefined(value[k])) {
              tmp.push(encodeUnreserved(k));
              tmp.push(encodeValue(operator, value[k].toString()));
            }
          });
        }
        if (isKeyOperator(operator)) {
          result.push(encodeUnreserved(key) + "=" + tmp.join(","));
        } else if (tmp.length !== 0) {
          result.push(tmp.join(","));
        }
      }
    }
  } else {
    if (operator === ";") {
      if (isDefined(value)) {
        result.push(encodeUnreserved(key));
      }
    } else if (value === "" && (operator === "&" || operator === "?")) {
      result.push(encodeUnreserved(key) + "=");
    } else if (value === "") {
      result.push("");
    }
  }
  return result;
}
function parseUrl(template) {
  return {
    expand: expand.bind(null, template)
  };
}
function expand(template, context) {
  var operators = ["+", "#", ".", "/", ";", "?", "&"];
  template = template.replace(
    /\{([^\{\}]+)\}|([^\{\}]+)/g,
    function(_, expression, literal) {
      if (expression) {
        let operator = "";
        const values = [];
        if (operators.indexOf(expression.charAt(0)) !== -1) {
          operator = expression.charAt(0);
          expression = expression.substr(1);
        }
        expression.split(/,/g).forEach(function(variable) {
          var tmp = /([^:\*]*)(?::(\d+)|(\*))?/.exec(variable);
          values.push(getValues(context, operator, tmp[1], tmp[2] || tmp[3]));
        });
        if (operator && operator !== "+") {
          var separator = ",";
          if (operator === "?") {
            separator = "&";
          } else if (operator !== "#") {
            separator = operator;
          }
          return (values.length !== 0 ? operator : "") + values.join(separator);
        } else {
          return values.join(",");
        }
      } else {
        return encodeReserved(literal);
      }
    }
  );
  if (template === "/") {
    return template;
  } else {
    return template.replace(/\/$/, "");
  }
}
function parse(options) {
  let method = options.method.toUpperCase();
  let url = (options.url || "/").replace(/:([a-z]\w+)/g, "{$1}");
  let headers = Object.assign({}, options.headers);
  let body;
  let parameters = omit(options, [
    "method",
    "baseUrl",
    "url",
    "headers",
    "request",
    "mediaType"
  ]);
  const urlVariableNames = extractUrlVariableNames(url);
  url = parseUrl(url).expand(parameters);
  if (!/^http/.test(url)) {
    url = options.baseUrl + url;
  }
  const omittedParameters = Object.keys(options).filter((option) => urlVariableNames.includes(option)).concat("baseUrl");
  const remainingParameters = omit(parameters, omittedParameters);
  const isBinaryRequest = /application\/octet-stream/i.test(headers.accept);
  if (!isBinaryRequest) {
    if (options.mediaType.format) {
      headers.accept = headers.accept.split(/,/).map(
        (format) => format.replace(
          /application\/vnd(\.\w+)(\.v3)?(\.\w+)?(\+json)?$/,
          `application/vnd$1$2.${options.mediaType.format}`
        )
      ).join(",");
    }
    if (url.endsWith("/graphql")) {
      if (options.mediaType.previews?.length) {
        const previewsFromAcceptHeader = headers.accept.match(/(?<![\w-])[\w-]+(?=-preview)/g) || [];
        headers.accept = previewsFromAcceptHeader.concat(options.mediaType.previews).map((preview) => {
          const format = options.mediaType.format ? `.${options.mediaType.format}` : "+json";
          return `application/vnd.github.${preview}-preview${format}`;
        }).join(",");
      }
    }
  }
  if (["GET", "HEAD"].includes(method)) {
    url = addQueryParameters(url, remainingParameters);
  } else {
    if ("data" in remainingParameters) {
      body = remainingParameters.data;
    } else {
      if (Object.keys(remainingParameters).length) {
        body = remainingParameters;
      }
    }
  }
  if (!headers["content-type"] && typeof body !== "undefined") {
    headers["content-type"] = "application/json; charset=utf-8";
  }
  if (["PATCH", "PUT"].includes(method) && typeof body === "undefined") {
    body = "";
  }
  return Object.assign(
    { method, url, headers },
    typeof body !== "undefined" ? { body } : null,
    options.request ? { request: options.request } : null
  );
}
function endpointWithDefaults(defaults, route, options) {
  return parse(merge(defaults, route, options));
}
function withDefaults(oldDefaults, newDefaults) {
  const DEFAULTS2 = merge(oldDefaults, newDefaults);
  const endpoint2 = endpointWithDefaults.bind(null, DEFAULTS2);
  return Object.assign(endpoint2, {
    DEFAULTS: DEFAULTS2,
    defaults: withDefaults.bind(null, DEFAULTS2),
    merge: merge.bind(null, DEFAULTS2),
    parse
  });
}
var endpoint = withDefaults(null, DEFAULTS);

// ../node_modules/@octokit/request/dist-bundle/index.js
var import_fast_content_type_parse = __toESM(require_fast_content_type_parse(), 1);

// ../node_modules/@octokit/request-error/dist-src/index.js
var RequestError = class extends Error {
  name;
  /**
   * http status code
   */
  status;
  /**
   * Request options that lead to the error.
   */
  request;
  /**
   * Response object if a response was received
   */
  response;
  constructor(message, statusCode, options) {
    super(message);
    this.name = "HttpError";
    this.status = Number.parseInt(statusCode);
    if (Number.isNaN(this.status)) {
      this.status = 0;
    }
    if ("response" in options) {
      this.response = options.response;
    }
    const requestCopy = Object.assign({}, options.request);
    if (options.request.headers.authorization) {
      requestCopy.headers = Object.assign({}, options.request.headers, {
        authorization: options.request.headers.authorization.replace(
          /(?<! ) .*$/,
          " [REDACTED]"
        )
      });
    }
    requestCopy.url = requestCopy.url.replace(/\bclient_secret=\w+/g, "client_secret=[REDACTED]").replace(/\baccess_token=\w+/g, "access_token=[REDACTED]");
    this.request = requestCopy;
  }
};

// ../node_modules/@octokit/request/dist-bundle/index.js
var VERSION2 = "9.2.4";
var defaults_default = {
  headers: {
    "user-agent": `octokit-request.js/${VERSION2} ${getUserAgent()}`
  }
};
function isPlainObject2(value) {
  if (typeof value !== "object" || value === null) return false;
  if (Object.prototype.toString.call(value) !== "[object Object]") return false;
  const proto = Object.getPrototypeOf(value);
  if (proto === null) return true;
  const Ctor = Object.prototype.hasOwnProperty.call(proto, "constructor") && proto.constructor;
  return typeof Ctor === "function" && Ctor instanceof Ctor && Function.prototype.call(Ctor) === Function.prototype.call(value);
}
async function fetchWrapper(requestOptions) {
  const fetch2 = requestOptions.request?.fetch || globalThis.fetch;
  if (!fetch2) {
    throw new Error(
      "fetch is not set. Please pass a fetch implementation as new Octokit({ request: { fetch }}). Learn more at https://github.com/octokit/octokit.js/#fetch-missing"
    );
  }
  const log = requestOptions.request?.log || console;
  const parseSuccessResponseBody = requestOptions.request?.parseSuccessResponseBody !== false;
  const body = isPlainObject2(requestOptions.body) || Array.isArray(requestOptions.body) ? JSON.stringify(requestOptions.body) : requestOptions.body;
  const requestHeaders = Object.fromEntries(
    Object.entries(requestOptions.headers).map(([name, value]) => [
      name,
      String(value)
    ])
  );
  let fetchResponse;
  try {
    fetchResponse = await fetch2(requestOptions.url, {
      method: requestOptions.method,
      body,
      redirect: requestOptions.request?.redirect,
      headers: requestHeaders,
      signal: requestOptions.request?.signal,
      // duplex must be set if request.body is ReadableStream or Async Iterables.
      // See https://fetch.spec.whatwg.org/#dom-requestinit-duplex.
      ...requestOptions.body && { duplex: "half" }
    });
  } catch (error) {
    let message = "Unknown Error";
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        error.status = 500;
        throw error;
      }
      message = error.message;
      if (error.name === "TypeError" && "cause" in error) {
        if (error.cause instanceof Error) {
          message = error.cause.message;
        } else if (typeof error.cause === "string") {
          message = error.cause;
        }
      }
    }
    const requestError = new RequestError(message, 500, {
      request: requestOptions
    });
    requestError.cause = error;
    throw requestError;
  }
  const status = fetchResponse.status;
  const url = fetchResponse.url;
  const responseHeaders = {};
  for (const [key, value] of fetchResponse.headers) {
    responseHeaders[key] = value;
  }
  const octokitResponse = {
    url,
    status,
    headers: responseHeaders,
    data: ""
  };
  if ("deprecation" in responseHeaders) {
    const matches = responseHeaders.link && responseHeaders.link.match(/<([^<>]+)>; rel="deprecation"/);
    const deprecationLink = matches && matches.pop();
    log.warn(
      `[@octokit/request] "${requestOptions.method} ${requestOptions.url}" is deprecated. It is scheduled to be removed on ${responseHeaders.sunset}${deprecationLink ? `. See ${deprecationLink}` : ""}`
    );
  }
  if (status === 204 || status === 205) {
    return octokitResponse;
  }
  if (requestOptions.method === "HEAD") {
    if (status < 400) {
      return octokitResponse;
    }
    throw new RequestError(fetchResponse.statusText, status, {
      response: octokitResponse,
      request: requestOptions
    });
  }
  if (status === 304) {
    octokitResponse.data = await getResponseData(fetchResponse);
    throw new RequestError("Not modified", status, {
      response: octokitResponse,
      request: requestOptions
    });
  }
  if (status >= 400) {
    octokitResponse.data = await getResponseData(fetchResponse);
    throw new RequestError(toErrorMessage(octokitResponse.data), status, {
      response: octokitResponse,
      request: requestOptions
    });
  }
  octokitResponse.data = parseSuccessResponseBody ? await getResponseData(fetchResponse) : fetchResponse.body;
  return octokitResponse;
}
async function getResponseData(response) {
  const contentType = response.headers.get("content-type");
  if (!contentType) {
    return response.text().catch(() => "");
  }
  const mimetype = (0, import_fast_content_type_parse.safeParse)(contentType);
  if (isJSONResponse(mimetype)) {
    let text = "";
    try {
      text = await response.text();
      return JSON.parse(text);
    } catch (err) {
      return text;
    }
  } else if (mimetype.type.startsWith("text/") || mimetype.parameters.charset?.toLowerCase() === "utf-8") {
    return response.text().catch(() => "");
  } else {
    return response.arrayBuffer().catch(() => new ArrayBuffer(0));
  }
}
function isJSONResponse(mimetype) {
  return mimetype.type === "application/json" || mimetype.type === "application/scim+json";
}
function toErrorMessage(data) {
  if (typeof data === "string") {
    return data;
  }
  if (data instanceof ArrayBuffer) {
    return "Unknown error";
  }
  if ("message" in data) {
    const suffix = "documentation_url" in data ? ` - ${data.documentation_url}` : "";
    return Array.isArray(data.errors) ? `${data.message}: ${data.errors.map((v) => JSON.stringify(v)).join(", ")}${suffix}` : `${data.message}${suffix}`;
  }
  return `Unknown error: ${JSON.stringify(data)}`;
}
function withDefaults2(oldEndpoint, newDefaults) {
  const endpoint2 = oldEndpoint.defaults(newDefaults);
  const newApi = function(route, parameters) {
    const endpointOptions = endpoint2.merge(route, parameters);
    if (!endpointOptions.request || !endpointOptions.request.hook) {
      return fetchWrapper(endpoint2.parse(endpointOptions));
    }
    const request2 = (route2, parameters2) => {
      return fetchWrapper(
        endpoint2.parse(endpoint2.merge(route2, parameters2))
      );
    };
    Object.assign(request2, {
      endpoint: endpoint2,
      defaults: withDefaults2.bind(null, endpoint2)
    });
    return endpointOptions.request.hook(request2, endpointOptions);
  };
  return Object.assign(newApi, {
    endpoint: endpoint2,
    defaults: withDefaults2.bind(null, endpoint2)
  });
}
var request = withDefaults2(endpoint, defaults_default);

// ../node_modules/@octokit/graphql/dist-bundle/index.js
var VERSION3 = "0.0.0-development";
function _buildMessageForResponseErrors(data) {
  return `Request failed due to following response errors:
` + data.errors.map((e) => ` - ${e.message}`).join("\n");
}
var GraphqlResponseError = class extends Error {
  constructor(request2, headers, response) {
    super(_buildMessageForResponseErrors(response));
    this.request = request2;
    this.headers = headers;
    this.response = response;
    this.errors = response.errors;
    this.data = response.data;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
  name = "GraphqlResponseError";
  errors;
  data;
};
var NON_VARIABLE_OPTIONS = [
  "method",
  "baseUrl",
  "url",
  "headers",
  "request",
  "query",
  "mediaType",
  "operationName"
];
var FORBIDDEN_VARIABLE_OPTIONS = ["query", "method", "url"];
var GHES_V3_SUFFIX_REGEX = /\/api\/v3\/?$/;
function graphql(request2, query, options) {
  if (options) {
    if (typeof query === "string" && "query" in options) {
      return Promise.reject(
        new Error(`[@octokit/graphql] "query" cannot be used as variable name`)
      );
    }
    for (const key in options) {
      if (!FORBIDDEN_VARIABLE_OPTIONS.includes(key)) continue;
      return Promise.reject(
        new Error(
          `[@octokit/graphql] "${key}" cannot be used as variable name`
        )
      );
    }
  }
  const parsedOptions = typeof query === "string" ? Object.assign({ query }, options) : query;
  const requestOptions = Object.keys(
    parsedOptions
  ).reduce((result, key) => {
    if (NON_VARIABLE_OPTIONS.includes(key)) {
      result[key] = parsedOptions[key];
      return result;
    }
    if (!result.variables) {
      result.variables = {};
    }
    result.variables[key] = parsedOptions[key];
    return result;
  }, {});
  const baseUrl = parsedOptions.baseUrl || request2.endpoint.DEFAULTS.baseUrl;
  if (GHES_V3_SUFFIX_REGEX.test(baseUrl)) {
    requestOptions.url = baseUrl.replace(GHES_V3_SUFFIX_REGEX, "/api/graphql");
  }
  return request2(requestOptions).then((response) => {
    if (response.data.errors) {
      const headers = {};
      for (const key of Object.keys(response.headers)) {
        headers[key] = response.headers[key];
      }
      throw new GraphqlResponseError(
        requestOptions,
        headers,
        response.data
      );
    }
    return response.data.data;
  });
}
function withDefaults3(request2, newDefaults) {
  const newRequest = request2.defaults(newDefaults);
  const newApi = (query, options) => {
    return graphql(newRequest, query, options);
  };
  return Object.assign(newApi, {
    defaults: withDefaults3.bind(null, newRequest),
    endpoint: newRequest.endpoint
  });
}
var graphql2 = withDefaults3(request, {
  headers: {
    "user-agent": `octokit-graphql.js/${VERSION3} ${getUserAgent()}`
  },
  method: "POST",
  url: "/graphql"
});
function withCustomRequest(customRequest) {
  return withDefaults3(customRequest, {
    method: "POST",
    url: "/graphql"
  });
}

// ../node_modules/@octokit/auth-token/dist-bundle/index.js
var b64url = "(?:[a-zA-Z0-9_-]+)";
var sep = "\\.";
var jwtRE = new RegExp(`^${b64url}${sep}${b64url}${sep}${b64url}$`);
var isJWT = jwtRE.test.bind(jwtRE);
async function auth(token) {
  const isApp = isJWT(token);
  const isInstallation = token.startsWith("v1.") || token.startsWith("ghs_");
  const isUserToServer = token.startsWith("ghu_");
  const tokenType = isApp ? "app" : isInstallation ? "installation" : isUserToServer ? "user-to-server" : "oauth";
  return {
    type: "token",
    token,
    tokenType
  };
}
function withAuthorizationPrefix(token) {
  if (token.split(/\./).length === 3) {
    return `bearer ${token}`;
  }
  return `token ${token}`;
}
async function hook(token, request2, route, parameters) {
  const endpoint2 = request2.endpoint.merge(
    route,
    parameters
  );
  endpoint2.headers.authorization = withAuthorizationPrefix(token);
  return request2(endpoint2);
}
var createTokenAuth = function createTokenAuth2(token) {
  if (!token) {
    throw new Error("[@octokit/auth-token] No token passed to createTokenAuth");
  }
  if (typeof token !== "string") {
    throw new Error(
      "[@octokit/auth-token] Token passed to createTokenAuth is not a string"
    );
  }
  token = token.replace(/^(token|bearer) +/i, "");
  return Object.assign(auth.bind(null, token), {
    hook: hook.bind(null, token)
  });
};

// ../node_modules/@octokit/core/dist-src/version.js
var VERSION4 = "6.1.6";

// ../node_modules/@octokit/core/dist-src/index.js
var noop = () => {
};
var consoleWarn = console.warn.bind(console);
var consoleError = console.error.bind(console);
function createLogger(logger = {}) {
  if (typeof logger.debug !== "function") {
    logger.debug = noop;
  }
  if (typeof logger.info !== "function") {
    logger.info = noop;
  }
  if (typeof logger.warn !== "function") {
    logger.warn = consoleWarn;
  }
  if (typeof logger.error !== "function") {
    logger.error = consoleError;
  }
  return logger;
}
var userAgentTrail = `octokit-core.js/${VERSION4} ${getUserAgent()}`;
var Octokit = class {
  static VERSION = VERSION4;
  static defaults(defaults) {
    const OctokitWithDefaults = class extends this {
      constructor(...args) {
        const options = args[0] || {};
        if (typeof defaults === "function") {
          super(defaults(options));
          return;
        }
        super(
          Object.assign(
            {},
            defaults,
            options,
            options.userAgent && defaults.userAgent ? {
              userAgent: `${options.userAgent} ${defaults.userAgent}`
            } : null
          )
        );
      }
    };
    return OctokitWithDefaults;
  }
  static plugins = [];
  /**
   * Attach a plugin (or many) to your Octokit instance.
   *
   * @example
   * const API = Octokit.plugin(plugin1, plugin2, plugin3, ...)
   */
  static plugin(...newPlugins) {
    const currentPlugins = this.plugins;
    const NewOctokit = class extends this {
      static plugins = currentPlugins.concat(
        newPlugins.filter((plugin) => !currentPlugins.includes(plugin))
      );
    };
    return NewOctokit;
  }
  constructor(options = {}) {
    const hook7 = new before_after_hook_default.Collection();
    const requestDefaults = {
      baseUrl: request.endpoint.DEFAULTS.baseUrl,
      headers: {},
      request: Object.assign({}, options.request, {
        // @ts-ignore internal usage only, no need to type
        hook: hook7.bind(null, "request")
      }),
      mediaType: {
        previews: [],
        format: ""
      }
    };
    requestDefaults.headers["user-agent"] = options.userAgent ? `${options.userAgent} ${userAgentTrail}` : userAgentTrail;
    if (options.baseUrl) {
      requestDefaults.baseUrl = options.baseUrl;
    }
    if (options.previews) {
      requestDefaults.mediaType.previews = options.previews;
    }
    if (options.timeZone) {
      requestDefaults.headers["time-zone"] = options.timeZone;
    }
    this.request = request.defaults(requestDefaults);
    this.graphql = withCustomRequest(this.request).defaults(requestDefaults);
    this.log = createLogger(options.log);
    this.hook = hook7;
    if (!options.authStrategy) {
      if (!options.auth) {
        this.auth = async () => ({
          type: "unauthenticated"
        });
      } else {
        const auth7 = createTokenAuth(options.auth);
        hook7.wrap("request", auth7.hook);
        this.auth = auth7;
      }
    } else {
      const { authStrategy, ...otherOptions } = options;
      const auth7 = authStrategy(
        Object.assign(
          {
            request: this.request,
            log: this.log,
            // we pass the current octokit instance as well as its constructor options
            // to allow for authentication strategies that return a new octokit instance
            // that shares the same internal state as the current one. The original
            // requirement for this was the "event-octokit" authentication strategy
            // of https://github.com/probot/octokit-auth-probot.
            octokit: this,
            octokitOptions: otherOptions
          },
          options.auth
        )
      );
      hook7.wrap("request", auth7.hook);
      this.auth = auth7;
    }
    const classConstructor = this.constructor;
    for (let i = 0; i < classConstructor.plugins.length; ++i) {
      Object.assign(this, classConstructor.plugins[i](this, options));
    }
  }
  // assigned during constructor
  request;
  graphql;
  log;
  hook;
  // TODO: type `octokit.auth` based on passed options.authStrategy
  auth;
};

// ../node_modules/@octokit/oauth-authorization-url/dist-src/index.js
function oauthAuthorizationUrl(options) {
  const clientType = options.clientType || "oauth-app";
  const baseUrl = options.baseUrl || "https://github.com";
  const result = {
    clientType,
    allowSignup: options.allowSignup === false ? false : true,
    clientId: options.clientId,
    login: options.login || null,
    redirectUrl: options.redirectUrl || null,
    state: options.state || Math.random().toString(36).substr(2),
    url: ""
  };
  if (clientType === "oauth-app") {
    const scopes = "scopes" in options ? options.scopes : [];
    result.scopes = typeof scopes === "string" ? scopes.split(/[,\s]+/).filter(Boolean) : scopes;
  }
  result.url = urlBuilderAuthorize(`${baseUrl}/login/oauth/authorize`, result);
  return result;
}
function urlBuilderAuthorize(base, options) {
  const map = {
    allowSignup: "allow_signup",
    clientId: "client_id",
    login: "login",
    redirectUrl: "redirect_uri",
    scopes: "scope",
    state: "state"
  };
  let url = base;
  Object.keys(map).filter((k) => options[k] !== null).filter((k) => {
    if (k !== "scopes")
      return true;
    if (options.clientType === "github-app")
      return false;
    return !Array.isArray(options[k]) || options[k].length > 0;
  }).map((key) => [map[key], `${options[key]}`]).forEach(([key, value], index) => {
    url += index === 0 ? `?` : "&";
    url += `${key}=${encodeURIComponent(value)}`;
  });
  return url;
}

// ../node_modules/@octokit/oauth-methods/dist-bundle/index.js
function requestToOAuthBaseUrl(request2) {
  const endpointDefaults = request2.endpoint.DEFAULTS;
  return /^https:\/\/(api\.)?github\.com$/.test(endpointDefaults.baseUrl) ? "https://github.com" : endpointDefaults.baseUrl.replace("/api/v3", "");
}
async function oauthRequest(request2, route, parameters) {
  const withOAuthParameters = {
    baseUrl: requestToOAuthBaseUrl(request2),
    headers: {
      accept: "application/json"
    },
    ...parameters
  };
  const response = await request2(route, withOAuthParameters);
  if ("error" in response.data) {
    const error = new RequestError(
      `${response.data.error_description} (${response.data.error}, ${response.data.error_uri})`,
      400,
      {
        request: request2.endpoint.merge(
          route,
          withOAuthParameters
        )
      }
    );
    error.response = response;
    throw error;
  }
  return response;
}
function getWebFlowAuthorizationUrl({
  request: request2 = request,
  ...options
}) {
  const baseUrl = requestToOAuthBaseUrl(request2);
  return oauthAuthorizationUrl({
    ...options,
    baseUrl
  });
}
async function exchangeWebFlowCode(options) {
  const request2 = options.request || request;
  const response = await oauthRequest(
    request2,
    "POST /login/oauth/access_token",
    {
      client_id: options.clientId,
      client_secret: options.clientSecret,
      code: options.code,
      redirect_uri: options.redirectUrl
    }
  );
  const authentication = {
    clientType: options.clientType,
    clientId: options.clientId,
    clientSecret: options.clientSecret,
    token: response.data.access_token,
    scopes: response.data.scope.split(/\s+/).filter(Boolean)
  };
  if (options.clientType === "github-app") {
    if ("refresh_token" in response.data) {
      const apiTimeInMs = new Date(response.headers.date).getTime();
      authentication.refreshToken = response.data.refresh_token, authentication.expiresAt = toTimestamp(
        apiTimeInMs,
        response.data.expires_in
      ), authentication.refreshTokenExpiresAt = toTimestamp(
        apiTimeInMs,
        response.data.refresh_token_expires_in
      );
    }
    delete authentication.scopes;
  }
  return { ...response, authentication };
}
function toTimestamp(apiTimeInMs, expirationInSeconds) {
  return new Date(apiTimeInMs + expirationInSeconds * 1e3).toISOString();
}
async function createDeviceCode(options) {
  const request2 = options.request || request;
  const parameters = {
    client_id: options.clientId
  };
  if ("scopes" in options && Array.isArray(options.scopes)) {
    parameters.scope = options.scopes.join(" ");
  }
  return oauthRequest(request2, "POST /login/device/code", parameters);
}
async function exchangeDeviceCode(options) {
  const request2 = options.request || request;
  const response = await oauthRequest(
    request2,
    "POST /login/oauth/access_token",
    {
      client_id: options.clientId,
      device_code: options.code,
      grant_type: "urn:ietf:params:oauth:grant-type:device_code"
    }
  );
  const authentication = {
    clientType: options.clientType,
    clientId: options.clientId,
    token: response.data.access_token,
    scopes: response.data.scope.split(/\s+/).filter(Boolean)
  };
  if ("clientSecret" in options) {
    authentication.clientSecret = options.clientSecret;
  }
  if (options.clientType === "github-app") {
    if ("refresh_token" in response.data) {
      const apiTimeInMs = new Date(response.headers.date).getTime();
      authentication.refreshToken = response.data.refresh_token, authentication.expiresAt = toTimestamp2(
        apiTimeInMs,
        response.data.expires_in
      ), authentication.refreshTokenExpiresAt = toTimestamp2(
        apiTimeInMs,
        response.data.refresh_token_expires_in
      );
    }
    delete authentication.scopes;
  }
  return { ...response, authentication };
}
function toTimestamp2(apiTimeInMs, expirationInSeconds) {
  return new Date(apiTimeInMs + expirationInSeconds * 1e3).toISOString();
}
async function checkToken(options) {
  const request2 = options.request || request;
  const response = await request2("POST /applications/{client_id}/token", {
    headers: {
      authorization: `basic ${btoa(
        `${options.clientId}:${options.clientSecret}`
      )}`
    },
    client_id: options.clientId,
    access_token: options.token
  });
  const authentication = {
    clientType: options.clientType,
    clientId: options.clientId,
    clientSecret: options.clientSecret,
    token: options.token,
    scopes: response.data.scopes
  };
  if (response.data.expires_at)
    authentication.expiresAt = response.data.expires_at;
  if (options.clientType === "github-app") {
    delete authentication.scopes;
  }
  return { ...response, authentication };
}
async function refreshToken(options) {
  const request2 = options.request || request;
  const response = await oauthRequest(
    request2,
    "POST /login/oauth/access_token",
    {
      client_id: options.clientId,
      client_secret: options.clientSecret,
      grant_type: "refresh_token",
      refresh_token: options.refreshToken
    }
  );
  const apiTimeInMs = new Date(response.headers.date).getTime();
  const authentication = {
    clientType: "github-app",
    clientId: options.clientId,
    clientSecret: options.clientSecret,
    token: response.data.access_token,
    refreshToken: response.data.refresh_token,
    expiresAt: toTimestamp3(apiTimeInMs, response.data.expires_in),
    refreshTokenExpiresAt: toTimestamp3(
      apiTimeInMs,
      response.data.refresh_token_expires_in
    )
  };
  return { ...response, authentication };
}
function toTimestamp3(apiTimeInMs, expirationInSeconds) {
  return new Date(apiTimeInMs + expirationInSeconds * 1e3).toISOString();
}
async function scopeToken(options) {
  const {
    request: optionsRequest,
    clientType,
    clientId,
    clientSecret,
    token,
    ...requestOptions
  } = options;
  const request2 = options.request || request;
  const response = await request2(
    "POST /applications/{client_id}/token/scoped",
    {
      headers: {
        authorization: `basic ${btoa(`${clientId}:${clientSecret}`)}`
      },
      client_id: clientId,
      access_token: token,
      ...requestOptions
    }
  );
  const authentication = Object.assign(
    {
      clientType,
      clientId,
      clientSecret,
      token: response.data.token
    },
    response.data.expires_at ? { expiresAt: response.data.expires_at } : {}
  );
  return { ...response, authentication };
}
async function resetToken(options) {
  const request2 = options.request || request;
  const auth7 = btoa(`${options.clientId}:${options.clientSecret}`);
  const response = await request2(
    "PATCH /applications/{client_id}/token",
    {
      headers: {
        authorization: `basic ${auth7}`
      },
      client_id: options.clientId,
      access_token: options.token
    }
  );
  const authentication = {
    clientType: options.clientType,
    clientId: options.clientId,
    clientSecret: options.clientSecret,
    token: response.data.token,
    scopes: response.data.scopes
  };
  if (response.data.expires_at)
    authentication.expiresAt = response.data.expires_at;
  if (options.clientType === "github-app") {
    delete authentication.scopes;
  }
  return { ...response, authentication };
}
async function deleteToken(options) {
  const request2 = options.request || request;
  const auth7 = btoa(`${options.clientId}:${options.clientSecret}`);
  return request2(
    "DELETE /applications/{client_id}/token",
    {
      headers: {
        authorization: `basic ${auth7}`
      },
      client_id: options.clientId,
      access_token: options.token
    }
  );
}
async function deleteAuthorization(options) {
  const request2 = options.request || request;
  const auth7 = btoa(`${options.clientId}:${options.clientSecret}`);
  return request2(
    "DELETE /applications/{client_id}/grant",
    {
      headers: {
        authorization: `basic ${auth7}`
      },
      client_id: options.clientId,
      access_token: options.token
    }
  );
}

// ../node_modules/@octokit/auth-oauth-device/dist-bundle/index.js
async function getOAuthAccessToken(state, options) {
  const cachedAuthentication = getCachedAuthentication(state, options.auth);
  if (cachedAuthentication) return cachedAuthentication;
  const { data: verification } = await createDeviceCode({
    clientType: state.clientType,
    clientId: state.clientId,
    request: options.request || state.request,
    // @ts-expect-error the extra code to make TS happy is not worth it
    scopes: options.auth.scopes || state.scopes
  });
  await state.onVerification(verification);
  const authentication = await waitForAccessToken(
    options.request || state.request,
    state.clientId,
    state.clientType,
    verification
  );
  state.authentication = authentication;
  return authentication;
}
function getCachedAuthentication(state, auth22) {
  if (auth22.refresh === true) return false;
  if (!state.authentication) return false;
  if (state.clientType === "github-app") {
    return state.authentication;
  }
  const authentication = state.authentication;
  const newScope = ("scopes" in auth22 && auth22.scopes || state.scopes).join(
    " "
  );
  const currentScope = authentication.scopes.join(" ");
  return newScope === currentScope ? authentication : false;
}
async function wait(seconds) {
  await new Promise((resolve) => setTimeout(resolve, seconds * 1e3));
}
async function waitForAccessToken(request2, clientId, clientType, verification) {
  try {
    const options = {
      clientId,
      request: request2,
      code: verification.device_code
    };
    const { authentication } = clientType === "oauth-app" ? await exchangeDeviceCode({
      ...options,
      clientType: "oauth-app"
    }) : await exchangeDeviceCode({
      ...options,
      clientType: "github-app"
    });
    return {
      type: "token",
      tokenType: "oauth",
      ...authentication
    };
  } catch (error) {
    if (!error.response) throw error;
    const errorType = error.response.data.error;
    if (errorType === "authorization_pending") {
      await wait(verification.interval);
      return waitForAccessToken(request2, clientId, clientType, verification);
    }
    if (errorType === "slow_down") {
      await wait(verification.interval + 7);
      return waitForAccessToken(request2, clientId, clientType, verification);
    }
    throw error;
  }
}
async function auth2(state, authOptions) {
  return getOAuthAccessToken(state, {
    auth: authOptions
  });
}
async function hook2(state, request2, route, parameters) {
  let endpoint2 = request2.endpoint.merge(
    route,
    parameters
  );
  if (/\/login\/(oauth\/access_token|device\/code)$/.test(endpoint2.url)) {
    return request2(endpoint2);
  }
  const { token } = await getOAuthAccessToken(state, {
    request: request2,
    auth: { type: "oauth" }
  });
  endpoint2.headers.authorization = `token ${token}`;
  return request2(endpoint2);
}
var VERSION5 = "0.0.0-development";
function createOAuthDeviceAuth(options) {
  const requestWithDefaults = options.request || request.defaults({
    headers: {
      "user-agent": `octokit-auth-oauth-device.js/${VERSION5} ${getUserAgent()}`
    }
  });
  const { request: request2 = requestWithDefaults, ...otherOptions } = options;
  const state = options.clientType === "github-app" ? {
    ...otherOptions,
    clientType: "github-app",
    request: request2
  } : {
    ...otherOptions,
    clientType: "oauth-app",
    request: request2,
    scopes: options.scopes || []
  };
  if (!options.clientId) {
    throw new Error(
      '[@octokit/auth-oauth-device] "clientId" option must be set (https://github.com/octokit/auth-oauth-device.js#usage)'
    );
  }
  if (!options.onVerification) {
    throw new Error(
      '[@octokit/auth-oauth-device] "onVerification" option must be a function (https://github.com/octokit/auth-oauth-device.js#usage)'
    );
  }
  return Object.assign(auth2.bind(null, state), {
    hook: hook2.bind(null, state)
  });
}

// ../node_modules/@octokit/auth-oauth-user/dist-bundle/index.js
var VERSION6 = "0.0.0-development";
async function getAuthentication(state) {
  if ("code" in state.strategyOptions) {
    const { authentication } = await exchangeWebFlowCode({
      clientId: state.clientId,
      clientSecret: state.clientSecret,
      clientType: state.clientType,
      onTokenCreated: state.onTokenCreated,
      ...state.strategyOptions,
      request: state.request
    });
    return {
      type: "token",
      tokenType: "oauth",
      ...authentication
    };
  }
  if ("onVerification" in state.strategyOptions) {
    const deviceAuth = createOAuthDeviceAuth({
      clientType: state.clientType,
      clientId: state.clientId,
      onTokenCreated: state.onTokenCreated,
      ...state.strategyOptions,
      request: state.request
    });
    const authentication = await deviceAuth({
      type: "oauth"
    });
    return {
      clientSecret: state.clientSecret,
      ...authentication
    };
  }
  if ("token" in state.strategyOptions) {
    return {
      type: "token",
      tokenType: "oauth",
      clientId: state.clientId,
      clientSecret: state.clientSecret,
      clientType: state.clientType,
      onTokenCreated: state.onTokenCreated,
      ...state.strategyOptions
    };
  }
  throw new Error("[@octokit/auth-oauth-user] Invalid strategy options");
}
async function auth3(state, options = {}) {
  if (!state.authentication) {
    state.authentication = state.clientType === "oauth-app" ? await getAuthentication(state) : await getAuthentication(state);
  }
  if (state.authentication.invalid) {
    throw new Error("[@octokit/auth-oauth-user] Token is invalid");
  }
  const currentAuthentication = state.authentication;
  if ("expiresAt" in currentAuthentication) {
    if (options.type === "refresh" || new Date(currentAuthentication.expiresAt) < /* @__PURE__ */ new Date()) {
      const { authentication } = await refreshToken({
        clientType: "github-app",
        clientId: state.clientId,
        clientSecret: state.clientSecret,
        refreshToken: currentAuthentication.refreshToken,
        request: state.request
      });
      state.authentication = {
        tokenType: "oauth",
        type: "token",
        ...authentication
      };
    }
  }
  if (options.type === "refresh") {
    if (state.clientType === "oauth-app") {
      throw new Error(
        "[@octokit/auth-oauth-user] OAuth Apps do not support expiring tokens"
      );
    }
    if (!currentAuthentication.hasOwnProperty("expiresAt")) {
      throw new Error("[@octokit/auth-oauth-user] Refresh token missing");
    }
    await state.onTokenCreated?.(state.authentication, {
      type: options.type
    });
  }
  if (options.type === "check" || options.type === "reset") {
    const method = options.type === "check" ? checkToken : resetToken;
    try {
      const { authentication } = await method({
        // @ts-expect-error making TS happy would require unnecessary code so no
        clientType: state.clientType,
        clientId: state.clientId,
        clientSecret: state.clientSecret,
        token: state.authentication.token,
        request: state.request
      });
      state.authentication = {
        tokenType: "oauth",
        type: "token",
        // @ts-expect-error TBD
        ...authentication
      };
      if (options.type === "reset") {
        await state.onTokenCreated?.(state.authentication, {
          type: options.type
        });
      }
      return state.authentication;
    } catch (error) {
      if (error.status === 404) {
        error.message = "[@octokit/auth-oauth-user] Token is invalid";
        state.authentication.invalid = true;
      }
      throw error;
    }
  }
  if (options.type === "delete" || options.type === "deleteAuthorization") {
    const method = options.type === "delete" ? deleteToken : deleteAuthorization;
    try {
      await method({
        // @ts-expect-error making TS happy would require unnecessary code so no
        clientType: state.clientType,
        clientId: state.clientId,
        clientSecret: state.clientSecret,
        token: state.authentication.token,
        request: state.request
      });
    } catch (error) {
      if (error.status !== 404) throw error;
    }
    state.authentication.invalid = true;
    return state.authentication;
  }
  return state.authentication;
}
var ROUTES_REQUIRING_BASIC_AUTH = /\/applications\/[^/]+\/(token|grant)s?/;
function requiresBasicAuth(url) {
  return url && ROUTES_REQUIRING_BASIC_AUTH.test(url);
}
async function hook3(state, request2, route, parameters = {}) {
  const endpoint2 = request2.endpoint.merge(
    route,
    parameters
  );
  if (/\/login\/(oauth\/access_token|device\/code)$/.test(endpoint2.url)) {
    return request2(endpoint2);
  }
  if (requiresBasicAuth(endpoint2.url)) {
    const credentials = btoa(`${state.clientId}:${state.clientSecret}`);
    endpoint2.headers.authorization = `basic ${credentials}`;
    return request2(endpoint2);
  }
  const { token } = state.clientType === "oauth-app" ? await auth3({ ...state, request: request2 }) : await auth3({ ...state, request: request2 });
  endpoint2.headers.authorization = "token " + token;
  return request2(endpoint2);
}
function createOAuthUserAuth({
  clientId,
  clientSecret,
  clientType = "oauth-app",
  request: request2 = request.defaults({
    headers: {
      "user-agent": `octokit-auth-oauth-app.js/${VERSION6} ${getUserAgent()}`
    }
  }),
  onTokenCreated,
  ...strategyOptions
}) {
  const state = Object.assign({
    clientType,
    clientId,
    clientSecret,
    onTokenCreated,
    strategyOptions,
    request: request2
  });
  return Object.assign(auth3.bind(null, state), {
    // @ts-expect-error not worth the extra code needed to appease TS
    hook: hook3.bind(null, state)
  });
}
createOAuthUserAuth.VERSION = VERSION6;

// ../node_modules/@octokit/auth-oauth-app/dist-bundle/index.js
async function auth4(state, authOptions) {
  if (authOptions.type === "oauth-app") {
    return {
      type: "oauth-app",
      clientId: state.clientId,
      clientSecret: state.clientSecret,
      clientType: state.clientType,
      headers: {
        authorization: `basic ${btoa(
          `${state.clientId}:${state.clientSecret}`
        )}`
      }
    };
  }
  if ("factory" in authOptions) {
    const { type, ...options } = {
      ...authOptions,
      ...state
    };
    return authOptions.factory(options);
  }
  const common = {
    clientId: state.clientId,
    clientSecret: state.clientSecret,
    request: state.request,
    ...authOptions
  };
  const userAuth = state.clientType === "oauth-app" ? await createOAuthUserAuth({
    ...common,
    clientType: state.clientType
  }) : await createOAuthUserAuth({
    ...common,
    clientType: state.clientType
  });
  return userAuth();
}
async function hook4(state, request2, route, parameters) {
  let endpoint2 = request2.endpoint.merge(
    route,
    parameters
  );
  if (/\/login\/(oauth\/access_token|device\/code)$/.test(endpoint2.url)) {
    return request2(endpoint2);
  }
  if (state.clientType === "github-app" && !requiresBasicAuth(endpoint2.url)) {
    throw new Error(
      `[@octokit/auth-oauth-app] GitHub Apps cannot use their client ID/secret for basic authentication for endpoints other than "/applications/{client_id}/**". "${endpoint2.method} ${endpoint2.url}" is not supported.`
    );
  }
  const credentials = btoa(`${state.clientId}:${state.clientSecret}`);
  endpoint2.headers.authorization = `basic ${credentials}`;
  try {
    return await request2(endpoint2);
  } catch (error) {
    if (error.status !== 401) throw error;
    error.message = `[@octokit/auth-oauth-app] "${endpoint2.method} ${endpoint2.url}" does not support clientId/clientSecret basic authentication.`;
    throw error;
  }
}
var VERSION7 = "0.0.0-development";
function createOAuthAppAuth(options) {
  const state = Object.assign(
    {
      request: request.defaults({
        headers: {
          "user-agent": `octokit-auth-oauth-app.js/${VERSION7} ${getUserAgent()}`
        }
      }),
      clientType: "oauth-app"
    },
    options
  );
  return Object.assign(auth4.bind(null, state), {
    hook: hook4.bind(null, state)
  });
}

// ../node_modules/universal-github-app-jwt/lib/utils.js
function isPkcs1(privateKey) {
  return privateKey.includes("-----BEGIN RSA PRIVATE KEY-----");
}
function isOpenSsh(privateKey) {
  return privateKey.includes("-----BEGIN OPENSSH PRIVATE KEY-----");
}
function string2ArrayBuffer(str) {
  const buf = new ArrayBuffer(str.length);
  const bufView = new Uint8Array(buf);
  for (let i = 0, strLen = str.length; i < strLen; i++) {
    bufView[i] = str.charCodeAt(i);
  }
  return buf;
}
function getDERfromPEM(pem) {
  const pemB64 = pem.trim().split("\n").slice(1, -1).join("");
  const decoded = atob(pemB64);
  return string2ArrayBuffer(decoded);
}
function getEncodedMessage(header, payload) {
  return `${base64encodeJSON(header)}.${base64encodeJSON(payload)}`;
}
function base64encode(buffer) {
  var binary = "";
  var bytes = new Uint8Array(buffer);
  var len = bytes.byteLength;
  for (var i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return fromBase64(btoa(binary));
}
function fromBase64(base64) {
  return base64.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}
function base64encodeJSON(obj) {
  return fromBase64(btoa(JSON.stringify(obj)));
}

// ../node_modules/universal-github-app-jwt/lib/crypto-node.js
var import_node_crypto = require("node:crypto");
var import_node_crypto2 = require("node:crypto");
function convertPrivateKey(privateKey) {
  if (!isPkcs1(privateKey)) return privateKey;
  return (0, import_node_crypto2.createPrivateKey)(privateKey).export({
    type: "pkcs8",
    format: "pem"
  });
}

// ../node_modules/universal-github-app-jwt/lib/get-token.js
async function getToken({ privateKey, payload }) {
  const convertedPrivateKey = convertPrivateKey(privateKey);
  if (isPkcs1(convertedPrivateKey)) {
    throw new Error(
      "[universal-github-app-jwt] Private Key is in PKCS#1 format, but only PKCS#8 is supported. See https://github.com/gr2m/universal-github-app-jwt#private-key-formats"
    );
  }
  if (isOpenSsh(convertedPrivateKey)) {
    throw new Error(
      "[universal-github-app-jwt] Private Key is in OpenSSH format, but only PKCS#8 is supported. See https://github.com/gr2m/universal-github-app-jwt#private-key-formats"
    );
  }
  const algorithm = {
    name: "RSASSA-PKCS1-v1_5",
    hash: { name: "SHA-256" }
  };
  const header = { alg: "RS256", typ: "JWT" };
  const privateKeyDER = getDERfromPEM(convertedPrivateKey);
  const importedKey = await import_node_crypto.subtle.importKey(
    "pkcs8",
    privateKeyDER,
    algorithm,
    false,
    ["sign"]
  );
  const encodedMessage = getEncodedMessage(header, payload);
  const encodedMessageArrBuf = string2ArrayBuffer(encodedMessage);
  const signatureArrBuf = await import_node_crypto.subtle.sign(
    algorithm.name,
    importedKey,
    encodedMessageArrBuf
  );
  const encodedSignature = base64encode(signatureArrBuf);
  return `${encodedMessage}.${encodedSignature}`;
}

// ../node_modules/universal-github-app-jwt/index.js
async function githubAppJwt({
  id,
  privateKey,
  now = Math.floor(Date.now() / 1e3)
}) {
  const privateKeyWithNewlines = privateKey.replace(/\\n/g, "\n");
  const nowWithSafetyMargin = now - 30;
  const expiration = nowWithSafetyMargin + 60 * 10;
  const payload = {
    iat: nowWithSafetyMargin,
    // Issued at time
    exp: expiration,
    iss: id
  };
  const token = await getToken({
    privateKey: privateKeyWithNewlines,
    payload
  });
  return {
    appId: id,
    expiration,
    token
  };
}

// ../node_modules/toad-cache/dist/toad-cache.mjs
var LruObject = class {
  constructor(max = 1e3, ttlInMsecs = 0) {
    if (isNaN(max) || max < 0) {
      throw new Error("Invalid max value");
    }
    if (isNaN(ttlInMsecs) || ttlInMsecs < 0) {
      throw new Error("Invalid ttl value");
    }
    this.first = null;
    this.items = /* @__PURE__ */ Object.create(null);
    this.last = null;
    this.size = 0;
    this.max = max;
    this.ttl = ttlInMsecs;
  }
  bumpLru(item) {
    if (this.last === item) {
      return;
    }
    const last = this.last;
    const next = item.next;
    const prev = item.prev;
    if (this.first === item) {
      this.first = next;
    }
    item.next = null;
    item.prev = last;
    last.next = item;
    if (prev !== null) {
      prev.next = next;
    }
    if (next !== null) {
      next.prev = prev;
    }
    this.last = item;
  }
  clear() {
    this.items = /* @__PURE__ */ Object.create(null);
    this.first = null;
    this.last = null;
    this.size = 0;
  }
  delete(key) {
    if (Object.prototype.hasOwnProperty.call(this.items, key)) {
      const item = this.items[key];
      delete this.items[key];
      this.size--;
      if (item.prev !== null) {
        item.prev.next = item.next;
      }
      if (item.next !== null) {
        item.next.prev = item.prev;
      }
      if (this.first === item) {
        this.first = item.next;
      }
      if (this.last === item) {
        this.last = item.prev;
      }
    }
  }
  deleteMany(keys) {
    for (var i = 0; i < keys.length; i++) {
      this.delete(keys[i]);
    }
  }
  evict() {
    if (this.size > 0) {
      const item = this.first;
      delete this.items[item.key];
      if (--this.size === 0) {
        this.first = null;
        this.last = null;
      } else {
        this.first = item.next;
        this.first.prev = null;
      }
    }
  }
  expiresAt(key) {
    if (Object.prototype.hasOwnProperty.call(this.items, key)) {
      return this.items[key].expiry;
    }
  }
  get(key) {
    if (Object.prototype.hasOwnProperty.call(this.items, key)) {
      const item = this.items[key];
      if (this.ttl > 0 && item.expiry <= Date.now()) {
        this.delete(key);
        return;
      }
      this.bumpLru(item);
      return item.value;
    }
  }
  getMany(keys) {
    const result = [];
    for (var i = 0; i < keys.length; i++) {
      result.push(this.get(keys[i]));
    }
    return result;
  }
  keys() {
    return Object.keys(this.items);
  }
  set(key, value) {
    if (Object.prototype.hasOwnProperty.call(this.items, key)) {
      const item2 = this.items[key];
      item2.value = value;
      item2.expiry = this.ttl > 0 ? Date.now() + this.ttl : this.ttl;
      if (this.last !== item2) {
        this.bumpLru(item2);
      }
      return;
    }
    if (this.max > 0 && this.size === this.max) {
      this.evict();
    }
    const item = {
      expiry: this.ttl > 0 ? Date.now() + this.ttl : this.ttl,
      key,
      prev: this.last,
      next: null,
      value
    };
    this.items[key] = item;
    if (++this.size === 1) {
      this.first = item;
    } else {
      this.last.next = item;
    }
    this.last = item;
  }
};

// ../node_modules/@octokit/auth-app/dist-node/index.js
async function getAppAuthentication({
  appId,
  privateKey,
  timeDifference
}) {
  try {
    const authOptions = {
      id: appId,
      privateKey
    };
    if (timeDifference) {
      Object.assign(authOptions, {
        now: Math.floor(Date.now() / 1e3) + timeDifference
      });
    }
    const appAuthentication = await githubAppJwt(authOptions);
    return {
      type: "app",
      token: appAuthentication.token,
      appId: appAuthentication.appId,
      expiresAt: new Date(appAuthentication.expiration * 1e3).toISOString()
    };
  } catch (error) {
    if (privateKey === "-----BEGIN RSA PRIVATE KEY-----") {
      throw new Error(
        "The 'privateKey` option contains only the first line '-----BEGIN RSA PRIVATE KEY-----'. If you are setting it using a `.env` file, make sure it is set on a single line with newlines replaced by '\n'"
      );
    } else {
      throw error;
    }
  }
}
function getCache() {
  return new LruObject(
    // cache max. 15000 tokens, that will use less than 10mb memory
    15e3,
    // Cache for 1 minute less than GitHub expiry
    1e3 * 60 * 59
  );
}
async function get(cache, options) {
  const cacheKey = optionsToCacheKey(options);
  const result = await cache.get(cacheKey);
  if (!result) {
    return;
  }
  const [
    token,
    createdAt,
    expiresAt,
    repositorySelection,
    permissionsString,
    singleFileName
  ] = result.split("|");
  const permissions = options.permissions || permissionsString.split(/,/).reduce((permissions2, string) => {
    if (/!$/.test(string)) {
      permissions2[string.slice(0, -1)] = "write";
    } else {
      permissions2[string] = "read";
    }
    return permissions2;
  }, {});
  return {
    token,
    createdAt,
    expiresAt,
    permissions,
    repositoryIds: options.repositoryIds,
    repositoryNames: options.repositoryNames,
    singleFileName,
    repositorySelection
  };
}
async function set(cache, options, data) {
  const key = optionsToCacheKey(options);
  const permissionsString = options.permissions ? "" : Object.keys(data.permissions).map(
    (name) => `${name}${data.permissions[name] === "write" ? "!" : ""}`
  ).join(",");
  const value = [
    data.token,
    data.createdAt,
    data.expiresAt,
    data.repositorySelection,
    permissionsString,
    data.singleFileName
  ].join("|");
  await cache.set(key, value);
}
function optionsToCacheKey({
  installationId,
  permissions = {},
  repositoryIds = [],
  repositoryNames = []
}) {
  const permissionsString = Object.keys(permissions).sort().map((name) => permissions[name] === "read" ? name : `${name}!`).join(",");
  const repositoryIdsString = repositoryIds.sort().join(",");
  const repositoryNamesString = repositoryNames.join(",");
  return [
    installationId,
    repositoryIdsString,
    repositoryNamesString,
    permissionsString
  ].filter(Boolean).join("|");
}
function toTokenAuthentication({
  installationId,
  token,
  createdAt,
  expiresAt,
  repositorySelection,
  permissions,
  repositoryIds,
  repositoryNames,
  singleFileName
}) {
  return Object.assign(
    {
      type: "token",
      tokenType: "installation",
      token,
      installationId,
      permissions,
      createdAt,
      expiresAt,
      repositorySelection
    },
    repositoryIds ? { repositoryIds } : null,
    repositoryNames ? { repositoryNames } : null,
    singleFileName ? { singleFileName } : null
  );
}
async function getInstallationAuthentication(state, options, customRequest) {
  const installationId = Number(options.installationId || state.installationId);
  if (!installationId) {
    throw new Error(
      "[@octokit/auth-app] installationId option is required for installation authentication."
    );
  }
  if (options.factory) {
    const { type, factory, oauthApp, ...factoryAuthOptions } = {
      ...state,
      ...options
    };
    return factory(factoryAuthOptions);
  }
  const request2 = customRequest || state.request;
  return getInstallationAuthenticationConcurrently(
    state,
    { ...options, installationId },
    request2
  );
}
var pendingPromises = /* @__PURE__ */ new Map();
function getInstallationAuthenticationConcurrently(state, options, request2) {
  const cacheKey = optionsToCacheKey(options);
  if (pendingPromises.has(cacheKey)) {
    return pendingPromises.get(cacheKey);
  }
  const promise = getInstallationAuthenticationImpl(
    state,
    options,
    request2
  ).finally(() => pendingPromises.delete(cacheKey));
  pendingPromises.set(cacheKey, promise);
  return promise;
}
async function getInstallationAuthenticationImpl(state, options, request2) {
  if (!options.refresh) {
    const result = await get(state.cache, options);
    if (result) {
      const {
        token: token2,
        createdAt: createdAt2,
        expiresAt: expiresAt2,
        permissions: permissions2,
        repositoryIds: repositoryIds2,
        repositoryNames: repositoryNames2,
        singleFileName: singleFileName2,
        repositorySelection: repositorySelection2
      } = result;
      return toTokenAuthentication({
        installationId: options.installationId,
        token: token2,
        createdAt: createdAt2,
        expiresAt: expiresAt2,
        permissions: permissions2,
        repositorySelection: repositorySelection2,
        repositoryIds: repositoryIds2,
        repositoryNames: repositoryNames2,
        singleFileName: singleFileName2
      });
    }
  }
  const appAuthentication = await getAppAuthentication(state);
  const payload = {
    installation_id: options.installationId,
    mediaType: {
      previews: ["machine-man"]
    },
    headers: {
      authorization: `bearer ${appAuthentication.token}`
    }
  };
  if (options.repositoryIds) {
    Object.assign(payload, { repository_ids: options.repositoryIds });
  }
  if (options.repositoryNames) {
    Object.assign(payload, {
      repositories: options.repositoryNames
    });
  }
  if (options.permissions) {
    Object.assign(payload, { permissions: options.permissions });
  }
  const {
    data: {
      token,
      expires_at: expiresAt,
      repositories,
      permissions: permissionsOptional,
      repository_selection: repositorySelectionOptional,
      single_file: singleFileName
    }
  } = await request2(
    "POST /app/installations/{installation_id}/access_tokens",
    payload
  );
  const permissions = permissionsOptional || {};
  const repositorySelection = repositorySelectionOptional || "all";
  const repositoryIds = repositories ? repositories.map((r) => r.id) : void 0;
  const repositoryNames = repositories ? repositories.map((repo) => repo.name) : void 0;
  const createdAt = (/* @__PURE__ */ new Date()).toISOString();
  const cacheOptions = {
    token,
    createdAt,
    expiresAt,
    repositorySelection,
    permissions,
    repositoryIds,
    repositoryNames
  };
  if (singleFileName) {
    Object.assign(payload, { singleFileName });
  }
  await set(state.cache, options, cacheOptions);
  const cacheData = {
    installationId: options.installationId,
    token,
    createdAt,
    expiresAt,
    repositorySelection,
    permissions,
    repositoryIds,
    repositoryNames
  };
  if (singleFileName) {
    Object.assign(cacheData, { singleFileName });
  }
  return toTokenAuthentication(cacheData);
}
async function auth5(state, authOptions) {
  switch (authOptions.type) {
    case "app":
      return getAppAuthentication(state);
    case "oauth-app":
      return state.oauthApp({ type: "oauth-app" });
    case "installation":
      authOptions;
      return getInstallationAuthentication(state, {
        ...authOptions,
        type: "installation"
      });
    case "oauth-user":
      return state.oauthApp(authOptions);
    default:
      throw new Error(`Invalid auth type: ${authOptions.type}`);
  }
}
var PATHS = [
  "/app",
  "/app/hook/config",
  "/app/hook/deliveries",
  "/app/hook/deliveries/{delivery_id}",
  "/app/hook/deliveries/{delivery_id}/attempts",
  "/app/installations",
  "/app/installations/{installation_id}",
  "/app/installations/{installation_id}/access_tokens",
  "/app/installations/{installation_id}/suspended",
  "/app/installation-requests",
  "/marketplace_listing/accounts/{account_id}",
  "/marketplace_listing/plan",
  "/marketplace_listing/plans",
  "/marketplace_listing/plans/{plan_id}/accounts",
  "/marketplace_listing/stubbed/accounts/{account_id}",
  "/marketplace_listing/stubbed/plan",
  "/marketplace_listing/stubbed/plans",
  "/marketplace_listing/stubbed/plans/{plan_id}/accounts",
  "/orgs/{org}/installation",
  "/repos/{owner}/{repo}/installation",
  "/users/{username}/installation"
];
function routeMatcher(paths) {
  const regexes = paths.map(
    (p) => p.split("/").map((c) => c.startsWith("{") ? "(?:.+?)" : c).join("/")
  );
  const regex = `^(?:${regexes.map((r) => `(?:${r})`).join("|")})$`;
  return new RegExp(regex, "i");
}
var REGEX = routeMatcher(PATHS);
function requiresAppAuth(url) {
  return !!url && REGEX.test(url.split("?")[0]);
}
var FIVE_SECONDS_IN_MS = 5 * 1e3;
function isNotTimeSkewError(error) {
  return !(error.message.match(
    /'Expiration time' claim \('exp'\) must be a numeric value representing the future time at which the assertion expires/
  ) || error.message.match(
    /'Issued at' claim \('iat'\) must be an Integer representing the time that the assertion was issued/
  ));
}
async function hook5(state, request2, route, parameters) {
  const endpoint2 = request2.endpoint.merge(route, parameters);
  const url = endpoint2.url;
  if (/\/login\/oauth\/access_token$/.test(url)) {
    return request2(endpoint2);
  }
  if (requiresAppAuth(url.replace(request2.endpoint.DEFAULTS.baseUrl, ""))) {
    const { token: token2 } = await getAppAuthentication(state);
    endpoint2.headers.authorization = `bearer ${token2}`;
    let response;
    try {
      response = await request2(endpoint2);
    } catch (error) {
      if (isNotTimeSkewError(error)) {
        throw error;
      }
      if (typeof error.response.headers.date === "undefined") {
        throw error;
      }
      const diff = Math.floor(
        (Date.parse(error.response.headers.date) - Date.parse((/* @__PURE__ */ new Date()).toString())) / 1e3
      );
      state.log.warn(error.message);
      state.log.warn(
        `[@octokit/auth-app] GitHub API time and system time are different by ${diff} seconds. Retrying request with the difference accounted for.`
      );
      const { token: token3 } = await getAppAuthentication({
        ...state,
        timeDifference: diff
      });
      endpoint2.headers.authorization = `bearer ${token3}`;
      return request2(endpoint2);
    }
    return response;
  }
  if (requiresBasicAuth(url)) {
    const authentication = await state.oauthApp({ type: "oauth-app" });
    endpoint2.headers.authorization = authentication.headers.authorization;
    return request2(endpoint2);
  }
  const { token, createdAt } = await getInstallationAuthentication(
    state,
    // @ts-expect-error TBD
    {},
    request2.defaults({ baseUrl: endpoint2.baseUrl })
  );
  endpoint2.headers.authorization = `token ${token}`;
  return sendRequestWithRetries(
    state,
    request2,
    endpoint2,
    createdAt
  );
}
async function sendRequestWithRetries(state, request2, options, createdAt, retries = 0) {
  const timeSinceTokenCreationInMs = +/* @__PURE__ */ new Date() - +new Date(createdAt);
  try {
    return await request2(options);
  } catch (error) {
    if (error.status !== 401) {
      throw error;
    }
    if (timeSinceTokenCreationInMs >= FIVE_SECONDS_IN_MS) {
      if (retries > 0) {
        error.message = `After ${retries} retries within ${timeSinceTokenCreationInMs / 1e3}s of creating the installation access token, the response remains 401. At this point, the cause may be an authentication problem or a system outage. Please check https://www.githubstatus.com for status information`;
      }
      throw error;
    }
    ++retries;
    const awaitTime = retries * 1e3;
    state.log.warn(
      `[@octokit/auth-app] Retrying after 401 response to account for token replication delay (retry: ${retries}, wait: ${awaitTime / 1e3}s)`
    );
    await new Promise((resolve) => setTimeout(resolve, awaitTime));
    return sendRequestWithRetries(state, request2, options, createdAt, retries);
  }
}
var VERSION8 = "7.2.2";
function createAppAuth(options) {
  if (!options.appId) {
    throw new Error("[@octokit/auth-app] appId option is required");
  }
  if (!options.privateKey) {
    throw new Error("[@octokit/auth-app] privateKey option is required");
  }
  if ("installationId" in options && !options.installationId) {
    throw new Error(
      "[@octokit/auth-app] installationId is set to a falsy value"
    );
  }
  const log = options.log || {};
  if (typeof log.warn !== "function") {
    log.warn = console.warn.bind(console);
  }
  const request2 = options.request || request.defaults({
    headers: {
      "user-agent": `octokit-auth-app.js/${VERSION8} ${getUserAgent()}`
    }
  });
  const state = Object.assign(
    {
      request: request2,
      cache: getCache()
    },
    options,
    options.installationId ? { installationId: Number(options.installationId) } : {},
    {
      log,
      oauthApp: createOAuthAppAuth({
        clientType: "github-app",
        clientId: options.clientId || "",
        clientSecret: options.clientSecret || "",
        request: request2
      })
    }
  );
  return Object.assign(auth5.bind(null, state), {
    hook: hook5.bind(null, state)
  });
}

// ../node_modules/@octokit/auth-unauthenticated/dist-node/index.js
async function auth6(reason) {
  return {
    type: "unauthenticated",
    reason
  };
}
function isRateLimitError(error) {
  if (error.status !== 403) {
    return false;
  }
  if (!error.response) {
    return false;
  }
  return error.response.headers["x-ratelimit-remaining"] === "0";
}
var REGEX_ABUSE_LIMIT_MESSAGE = /\babuse\b/i;
function isAbuseLimitError(error) {
  if (error.status !== 403) {
    return false;
  }
  return REGEX_ABUSE_LIMIT_MESSAGE.test(error.message);
}
async function hook6(reason, request2, route, parameters) {
  const endpoint2 = request2.endpoint.merge(
    route,
    parameters
  );
  return request2(endpoint2).catch((error) => {
    if (error.status === 404) {
      error.message = `Not found. May be due to lack of authentication. Reason: ${reason}`;
      throw error;
    }
    if (isRateLimitError(error)) {
      error.message = `API rate limit exceeded. This maybe caused by the lack of authentication. Reason: ${reason}`;
      throw error;
    }
    if (isAbuseLimitError(error)) {
      error.message = `You have triggered an abuse detection mechanism. This maybe caused by the lack of authentication. Reason: ${reason}`;
      throw error;
    }
    if (error.status === 401) {
      error.message = `Unauthorized. "${endpoint2.method} ${endpoint2.url}" failed most likely due to lack of authentication. Reason: ${reason}`;
      throw error;
    }
    if (error.status >= 400 && error.status < 500) {
      error.message = error.message.replace(
        /\.?$/,
        `. May be caused by lack of authentication (${reason}).`
      );
    }
    throw error;
  });
}
var createUnauthenticatedAuth = function createUnauthenticatedAuth2(options) {
  if (!options || !options.reason) {
    throw new Error(
      "[@octokit/auth-unauthenticated] No reason passed to createUnauthenticatedAuth"
    );
  }
  return Object.assign(auth6.bind(null, options.reason), {
    hook: hook6.bind(null, options.reason)
  });
};

// ../node_modules/@octokit/oauth-app/dist-node/index.js
var VERSION9 = "7.1.6";
function addEventHandler(state, eventName, eventHandler) {
  if (Array.isArray(eventName)) {
    for (const singleEventName of eventName) {
      addEventHandler(state, singleEventName, eventHandler);
    }
    return;
  }
  if (!state.eventHandlers[eventName]) {
    state.eventHandlers[eventName] = [];
  }
  state.eventHandlers[eventName].push(eventHandler);
}
var OAuthAppOctokit = Octokit.defaults({
  userAgent: `octokit-oauth-app.js/${VERSION9} ${getUserAgent()}`
});
async function emitEvent(state, context) {
  const { name, action } = context;
  if (state.eventHandlers[`${name}.${action}`]) {
    for (const eventHandler of state.eventHandlers[`${name}.${action}`]) {
      await eventHandler(context);
    }
  }
  if (state.eventHandlers[name]) {
    for (const eventHandler of state.eventHandlers[name]) {
      await eventHandler(context);
    }
  }
}
async function getUserOctokitWithState(state, options) {
  return state.octokit.auth({
    type: "oauth-user",
    ...options,
    async factory(options2) {
      const octokit = new state.Octokit({
        authStrategy: createOAuthUserAuth,
        auth: options2
      });
      const authentication = await octokit.auth({
        type: "get"
      });
      await emitEvent(state, {
        name: "token",
        action: "created",
        token: authentication.token,
        scopes: authentication.scopes,
        authentication,
        octokit
      });
      return octokit;
    }
  });
}
function getWebFlowAuthorizationUrlWithState(state, options) {
  const optionsWithDefaults = {
    clientId: state.clientId,
    request: state.octokit.request,
    ...options,
    allowSignup: state.allowSignup ?? options.allowSignup,
    redirectUrl: options.redirectUrl ?? state.redirectUrl,
    scopes: options.scopes ?? state.defaultScopes
  };
  return getWebFlowAuthorizationUrl({
    clientType: state.clientType,
    ...optionsWithDefaults
  });
}
async function createTokenWithState(state, options) {
  const authentication = await state.octokit.auth({
    type: "oauth-user",
    ...options
  });
  await emitEvent(state, {
    name: "token",
    action: "created",
    token: authentication.token,
    scopes: authentication.scopes,
    authentication,
    octokit: new state.Octokit({
      authStrategy: createOAuthUserAuth,
      auth: {
        clientType: state.clientType,
        clientId: state.clientId,
        clientSecret: state.clientSecret,
        token: authentication.token,
        scopes: authentication.scopes,
        refreshToken: authentication.refreshToken,
        expiresAt: authentication.expiresAt,
        refreshTokenExpiresAt: authentication.refreshTokenExpiresAt
      }
    })
  });
  return { authentication };
}
async function checkTokenWithState(state, options) {
  const result = await checkToken({
    // @ts-expect-error not worth the extra code to appease TS
    clientType: state.clientType,
    clientId: state.clientId,
    clientSecret: state.clientSecret,
    request: state.octokit.request,
    ...options
  });
  Object.assign(result.authentication, { type: "token", tokenType: "oauth" });
  return result;
}
async function resetTokenWithState(state, options) {
  const optionsWithDefaults = {
    clientId: state.clientId,
    clientSecret: state.clientSecret,
    request: state.octokit.request,
    ...options
  };
  if (state.clientType === "oauth-app") {
    const response2 = await resetToken({
      clientType: "oauth-app",
      ...optionsWithDefaults
    });
    const authentication2 = Object.assign(response2.authentication, {
      type: "token",
      tokenType: "oauth"
    });
    await emitEvent(state, {
      name: "token",
      action: "reset",
      token: response2.authentication.token,
      scopes: response2.authentication.scopes || void 0,
      authentication: authentication2,
      octokit: new state.Octokit({
        authStrategy: createOAuthUserAuth,
        auth: {
          clientType: state.clientType,
          clientId: state.clientId,
          clientSecret: state.clientSecret,
          token: response2.authentication.token,
          scopes: response2.authentication.scopes
        }
      })
    });
    return { ...response2, authentication: authentication2 };
  }
  const response = await resetToken({
    clientType: "github-app",
    ...optionsWithDefaults
  });
  const authentication = Object.assign(response.authentication, {
    type: "token",
    tokenType: "oauth"
  });
  await emitEvent(state, {
    name: "token",
    action: "reset",
    token: response.authentication.token,
    authentication,
    octokit: new state.Octokit({
      authStrategy: createOAuthUserAuth,
      auth: {
        clientType: state.clientType,
        clientId: state.clientId,
        clientSecret: state.clientSecret,
        token: response.authentication.token
      }
    })
  });
  return { ...response, authentication };
}
async function refreshTokenWithState(state, options) {
  if (state.clientType === "oauth-app") {
    throw new Error(
      "[@octokit/oauth-app] app.refreshToken() is not supported for OAuth Apps"
    );
  }
  const response = await refreshToken({
    clientType: "github-app",
    clientId: state.clientId,
    clientSecret: state.clientSecret,
    request: state.octokit.request,
    refreshToken: options.refreshToken
  });
  const authentication = Object.assign(response.authentication, {
    type: "token",
    tokenType: "oauth"
  });
  await emitEvent(state, {
    name: "token",
    action: "refreshed",
    token: response.authentication.token,
    authentication,
    octokit: new state.Octokit({
      authStrategy: createOAuthUserAuth,
      auth: {
        clientType: state.clientType,
        clientId: state.clientId,
        clientSecret: state.clientSecret,
        token: response.authentication.token
      }
    })
  });
  return { ...response, authentication };
}
async function scopeTokenWithState(state, options) {
  if (state.clientType === "oauth-app") {
    throw new Error(
      "[@octokit/oauth-app] app.scopeToken() is not supported for OAuth Apps"
    );
  }
  const response = await scopeToken({
    clientType: "github-app",
    clientId: state.clientId,
    clientSecret: state.clientSecret,
    request: state.octokit.request,
    ...options
  });
  const authentication = Object.assign(response.authentication, {
    type: "token",
    tokenType: "oauth"
  });
  await emitEvent(state, {
    name: "token",
    action: "scoped",
    token: response.authentication.token,
    authentication,
    octokit: new state.Octokit({
      authStrategy: createOAuthUserAuth,
      auth: {
        clientType: state.clientType,
        clientId: state.clientId,
        clientSecret: state.clientSecret,
        token: response.authentication.token
      }
    })
  });
  return { ...response, authentication };
}
async function deleteTokenWithState(state, options) {
  const optionsWithDefaults = {
    clientId: state.clientId,
    clientSecret: state.clientSecret,
    request: state.octokit.request,
    ...options
  };
  const response = state.clientType === "oauth-app" ? await deleteToken({
    clientType: "oauth-app",
    ...optionsWithDefaults
  }) : (
    /* v8 ignore next 4 */
    await deleteToken({
      clientType: "github-app",
      ...optionsWithDefaults
    })
  );
  await emitEvent(state, {
    name: "token",
    action: "deleted",
    token: options.token,
    octokit: new state.Octokit({
      authStrategy: createUnauthenticatedAuth,
      auth: {
        reason: `Handling "token.deleted" event. The access for the token has been revoked.`
      }
    })
  });
  return response;
}
async function deleteAuthorizationWithState(state, options) {
  const optionsWithDefaults = {
    clientId: state.clientId,
    clientSecret: state.clientSecret,
    request: state.octokit.request,
    ...options
  };
  const response = state.clientType === "oauth-app" ? await deleteAuthorization({
    clientType: "oauth-app",
    ...optionsWithDefaults
  }) : (
    /* v8 ignore next 4 */
    await deleteAuthorization({
      clientType: "github-app",
      ...optionsWithDefaults
    })
  );
  await emitEvent(state, {
    name: "token",
    action: "deleted",
    token: options.token,
    octokit: new state.Octokit({
      authStrategy: createUnauthenticatedAuth,
      auth: {
        reason: `Handling "token.deleted" event. The access for the token has been revoked.`
      }
    })
  });
  await emitEvent(state, {
    name: "authorization",
    action: "deleted",
    token: options.token,
    octokit: new state.Octokit({
      authStrategy: createUnauthenticatedAuth,
      auth: {
        reason: `Handling "authorization.deleted" event. The access for the app has been revoked.`
      }
    })
  });
  return response;
}
var OAuthApp = class {
  static VERSION = VERSION9;
  static defaults(defaults) {
    const OAuthAppWithDefaults = class extends this {
      constructor(...args) {
        super({
          ...defaults,
          ...args[0]
        });
      }
    };
    return OAuthAppWithDefaults;
  }
  constructor(options) {
    const Octokit2 = options.Octokit || OAuthAppOctokit;
    this.type = options.clientType || "oauth-app";
    const octokit = new Octokit2({
      authStrategy: createOAuthAppAuth,
      auth: {
        clientType: this.type,
        clientId: options.clientId,
        clientSecret: options.clientSecret
      }
    });
    const state = {
      clientType: this.type,
      clientId: options.clientId,
      clientSecret: options.clientSecret,
      // @ts-expect-error defaultScopes not permitted for GitHub Apps
      defaultScopes: options.defaultScopes || [],
      allowSignup: options.allowSignup,
      baseUrl: options.baseUrl,
      redirectUrl: options.redirectUrl,
      log: options.log,
      Octokit: Octokit2,
      octokit,
      eventHandlers: {}
    };
    this.on = addEventHandler.bind(null, state);
    this.octokit = octokit;
    this.getUserOctokit = getUserOctokitWithState.bind(null, state);
    this.getWebFlowAuthorizationUrl = getWebFlowAuthorizationUrlWithState.bind(
      null,
      state
    );
    this.createToken = createTokenWithState.bind(
      null,
      state
    );
    this.checkToken = checkTokenWithState.bind(
      null,
      state
    );
    this.resetToken = resetTokenWithState.bind(
      null,
      state
    );
    this.refreshToken = refreshTokenWithState.bind(
      null,
      state
    );
    this.scopeToken = scopeTokenWithState.bind(
      null,
      state
    );
    this.deleteToken = deleteTokenWithState.bind(null, state);
    this.deleteAuthorization = deleteAuthorizationWithState.bind(null, state);
  }
  // assigned during constructor
  type;
  on;
  octokit;
  getUserOctokit;
  getWebFlowAuthorizationUrl;
  createToken;
  checkToken;
  resetToken;
  refreshToken;
  scopeToken;
  deleteToken;
  deleteAuthorization;
};

// ../node_modules/@octokit/webhooks-methods/dist-node/index.js
var import_node_crypto3 = require("node:crypto");
var import_node_crypto4 = require("node:crypto");
var import_node_buffer = require("node:buffer");
var VERSION10 = "5.1.1";
async function sign(secret, payload) {
  if (!secret || !payload) {
    throw new TypeError(
      "[@octokit/webhooks-methods] secret & payload required for sign()"
    );
  }
  if (typeof payload !== "string") {
    throw new TypeError("[@octokit/webhooks-methods] payload must be a string");
  }
  const algorithm = "sha256";
  return `${algorithm}=${(0, import_node_crypto3.createHmac)(algorithm, secret).update(payload).digest("hex")}`;
}
sign.VERSION = VERSION10;
async function verify(secret, eventPayload, signature) {
  if (!secret || !eventPayload || !signature) {
    throw new TypeError(
      "[@octokit/webhooks-methods] secret, eventPayload & signature required"
    );
  }
  if (typeof eventPayload !== "string") {
    throw new TypeError(
      "[@octokit/webhooks-methods] eventPayload must be a string"
    );
  }
  const signatureBuffer = import_node_buffer.Buffer.from(signature);
  const verificationBuffer = import_node_buffer.Buffer.from(await sign(secret, eventPayload));
  if (signatureBuffer.length !== verificationBuffer.length) {
    return false;
  }
  return (0, import_node_crypto4.timingSafeEqual)(signatureBuffer, verificationBuffer);
}
verify.VERSION = VERSION10;
async function verifyWithFallback(secret, payload, signature, additionalSecrets) {
  const firstPass = await verify(secret, payload, signature);
  if (firstPass) {
    return true;
  }
  if (additionalSecrets !== void 0) {
    for (const s of additionalSecrets) {
      const v = await verify(s, payload, signature);
      if (v) {
        return v;
      }
    }
  }
  return false;
}

// ../node_modules/@octokit/webhooks/dist-bundle/index.js
var createLogger2 = (logger = {}) => {
  if (typeof logger.debug !== "function") {
    logger.debug = () => {
    };
  }
  if (typeof logger.info !== "function") {
    logger.info = () => {
    };
  }
  if (typeof logger.warn !== "function") {
    logger.warn = console.warn.bind(console);
  }
  if (typeof logger.error !== "function") {
    logger.error = console.error.bind(console);
  }
  return logger;
};
var emitterEventNames = [
  "branch_protection_configuration",
  "branch_protection_configuration.disabled",
  "branch_protection_configuration.enabled",
  "branch_protection_rule",
  "branch_protection_rule.created",
  "branch_protection_rule.deleted",
  "branch_protection_rule.edited",
  "check_run",
  "check_run.completed",
  "check_run.created",
  "check_run.requested_action",
  "check_run.rerequested",
  "check_suite",
  "check_suite.completed",
  "check_suite.requested",
  "check_suite.rerequested",
  "code_scanning_alert",
  "code_scanning_alert.appeared_in_branch",
  "code_scanning_alert.closed_by_user",
  "code_scanning_alert.created",
  "code_scanning_alert.fixed",
  "code_scanning_alert.reopened",
  "code_scanning_alert.reopened_by_user",
  "commit_comment",
  "commit_comment.created",
  "create",
  "custom_property",
  "custom_property.created",
  "custom_property.deleted",
  "custom_property.promote_to_enterprise",
  "custom_property.updated",
  "custom_property_values",
  "custom_property_values.updated",
  "delete",
  "dependabot_alert",
  "dependabot_alert.auto_dismissed",
  "dependabot_alert.auto_reopened",
  "dependabot_alert.created",
  "dependabot_alert.dismissed",
  "dependabot_alert.fixed",
  "dependabot_alert.reintroduced",
  "dependabot_alert.reopened",
  "deploy_key",
  "deploy_key.created",
  "deploy_key.deleted",
  "deployment",
  "deployment.created",
  "deployment_protection_rule",
  "deployment_protection_rule.requested",
  "deployment_review",
  "deployment_review.approved",
  "deployment_review.rejected",
  "deployment_review.requested",
  "deployment_status",
  "deployment_status.created",
  "discussion",
  "discussion.answered",
  "discussion.category_changed",
  "discussion.closed",
  "discussion.created",
  "discussion.deleted",
  "discussion.edited",
  "discussion.labeled",
  "discussion.locked",
  "discussion.pinned",
  "discussion.reopened",
  "discussion.transferred",
  "discussion.unanswered",
  "discussion.unlabeled",
  "discussion.unlocked",
  "discussion.unpinned",
  "discussion_comment",
  "discussion_comment.created",
  "discussion_comment.deleted",
  "discussion_comment.edited",
  "fork",
  "github_app_authorization",
  "github_app_authorization.revoked",
  "gollum",
  "installation",
  "installation.created",
  "installation.deleted",
  "installation.new_permissions_accepted",
  "installation.suspend",
  "installation.unsuspend",
  "installation_repositories",
  "installation_repositories.added",
  "installation_repositories.removed",
  "installation_target",
  "installation_target.renamed",
  "issue_comment",
  "issue_comment.created",
  "issue_comment.deleted",
  "issue_comment.edited",
  "issues",
  "issues.assigned",
  "issues.closed",
  "issues.deleted",
  "issues.demilestoned",
  "issues.edited",
  "issues.labeled",
  "issues.locked",
  "issues.milestoned",
  "issues.opened",
  "issues.pinned",
  "issues.reopened",
  "issues.transferred",
  "issues.typed",
  "issues.unassigned",
  "issues.unlabeled",
  "issues.unlocked",
  "issues.unpinned",
  "issues.untyped",
  "label",
  "label.created",
  "label.deleted",
  "label.edited",
  "marketplace_purchase",
  "marketplace_purchase.cancelled",
  "marketplace_purchase.changed",
  "marketplace_purchase.pending_change",
  "marketplace_purchase.pending_change_cancelled",
  "marketplace_purchase.purchased",
  "member",
  "member.added",
  "member.edited",
  "member.removed",
  "membership",
  "membership.added",
  "membership.removed",
  "merge_group",
  "merge_group.checks_requested",
  "merge_group.destroyed",
  "meta",
  "meta.deleted",
  "milestone",
  "milestone.closed",
  "milestone.created",
  "milestone.deleted",
  "milestone.edited",
  "milestone.opened",
  "org_block",
  "org_block.blocked",
  "org_block.unblocked",
  "organization",
  "organization.deleted",
  "organization.member_added",
  "organization.member_invited",
  "organization.member_removed",
  "organization.renamed",
  "package",
  "package.published",
  "package.updated",
  "page_build",
  "personal_access_token_request",
  "personal_access_token_request.approved",
  "personal_access_token_request.cancelled",
  "personal_access_token_request.created",
  "personal_access_token_request.denied",
  "ping",
  "project",
  "project.closed",
  "project.created",
  "project.deleted",
  "project.edited",
  "project.reopened",
  "project_card",
  "project_card.converted",
  "project_card.created",
  "project_card.deleted",
  "project_card.edited",
  "project_card.moved",
  "project_column",
  "project_column.created",
  "project_column.deleted",
  "project_column.edited",
  "project_column.moved",
  "projects_v2",
  "projects_v2.closed",
  "projects_v2.created",
  "projects_v2.deleted",
  "projects_v2.edited",
  "projects_v2.reopened",
  "projects_v2_item",
  "projects_v2_item.archived",
  "projects_v2_item.converted",
  "projects_v2_item.created",
  "projects_v2_item.deleted",
  "projects_v2_item.edited",
  "projects_v2_item.reordered",
  "projects_v2_item.restored",
  "projects_v2_status_update",
  "projects_v2_status_update.created",
  "projects_v2_status_update.deleted",
  "projects_v2_status_update.edited",
  "public",
  "pull_request",
  "pull_request.assigned",
  "pull_request.auto_merge_disabled",
  "pull_request.auto_merge_enabled",
  "pull_request.closed",
  "pull_request.converted_to_draft",
  "pull_request.demilestoned",
  "pull_request.dequeued",
  "pull_request.edited",
  "pull_request.enqueued",
  "pull_request.labeled",
  "pull_request.locked",
  "pull_request.milestoned",
  "pull_request.opened",
  "pull_request.ready_for_review",
  "pull_request.reopened",
  "pull_request.review_request_removed",
  "pull_request.review_requested",
  "pull_request.synchronize",
  "pull_request.unassigned",
  "pull_request.unlabeled",
  "pull_request.unlocked",
  "pull_request_review",
  "pull_request_review.dismissed",
  "pull_request_review.edited",
  "pull_request_review.submitted",
  "pull_request_review_comment",
  "pull_request_review_comment.created",
  "pull_request_review_comment.deleted",
  "pull_request_review_comment.edited",
  "pull_request_review_thread",
  "pull_request_review_thread.resolved",
  "pull_request_review_thread.unresolved",
  "push",
  "registry_package",
  "registry_package.published",
  "registry_package.updated",
  "release",
  "release.created",
  "release.deleted",
  "release.edited",
  "release.prereleased",
  "release.published",
  "release.released",
  "release.unpublished",
  "repository",
  "repository.archived",
  "repository.created",
  "repository.deleted",
  "repository.edited",
  "repository.privatized",
  "repository.publicized",
  "repository.renamed",
  "repository.transferred",
  "repository.unarchived",
  "repository_advisory",
  "repository_advisory.published",
  "repository_advisory.reported",
  "repository_dispatch",
  "repository_dispatch.sample.collected",
  "repository_import",
  "repository_ruleset",
  "repository_ruleset.created",
  "repository_ruleset.deleted",
  "repository_ruleset.edited",
  "repository_vulnerability_alert",
  "repository_vulnerability_alert.create",
  "repository_vulnerability_alert.dismiss",
  "repository_vulnerability_alert.reopen",
  "repository_vulnerability_alert.resolve",
  "secret_scanning_alert",
  "secret_scanning_alert.created",
  "secret_scanning_alert.publicly_leaked",
  "secret_scanning_alert.reopened",
  "secret_scanning_alert.resolved",
  "secret_scanning_alert.validated",
  "secret_scanning_alert_location",
  "secret_scanning_alert_location.created",
  "secret_scanning_scan",
  "secret_scanning_scan.completed",
  "security_advisory",
  "security_advisory.published",
  "security_advisory.updated",
  "security_advisory.withdrawn",
  "security_and_analysis",
  "sponsorship",
  "sponsorship.cancelled",
  "sponsorship.created",
  "sponsorship.edited",
  "sponsorship.pending_cancellation",
  "sponsorship.pending_tier_change",
  "sponsorship.tier_changed",
  "star",
  "star.created",
  "star.deleted",
  "status",
  "sub_issues",
  "sub_issues.parent_issue_added",
  "sub_issues.parent_issue_removed",
  "sub_issues.sub_issue_added",
  "sub_issues.sub_issue_removed",
  "team",
  "team.added_to_repository",
  "team.created",
  "team.deleted",
  "team.edited",
  "team.removed_from_repository",
  "team_add",
  "watch",
  "watch.started",
  "workflow_dispatch",
  "workflow_job",
  "workflow_job.completed",
  "workflow_job.in_progress",
  "workflow_job.queued",
  "workflow_job.waiting",
  "workflow_run",
  "workflow_run.completed",
  "workflow_run.in_progress",
  "workflow_run.requested"
];
function handleEventHandlers(state, webhookName, handler2) {
  if (!state.hooks[webhookName]) {
    state.hooks[webhookName] = [];
  }
  state.hooks[webhookName].push(handler2);
}
function receiverOn(state, webhookNameOrNames, handler2) {
  if (Array.isArray(webhookNameOrNames)) {
    webhookNameOrNames.forEach(
      (webhookName) => receiverOn(state, webhookName, handler2)
    );
    return;
  }
  if (["*", "error"].includes(webhookNameOrNames)) {
    const webhookName = webhookNameOrNames === "*" ? "any" : webhookNameOrNames;
    const message = `Using the "${webhookNameOrNames}" event with the regular Webhooks.on() function is not supported. Please use the Webhooks.on${webhookName.charAt(0).toUpperCase() + webhookName.slice(1)}() method instead`;
    throw new Error(message);
  }
  if (!emitterEventNames.includes(webhookNameOrNames)) {
    state.log.warn(
      `"${webhookNameOrNames}" is not a known webhook name (https://developer.github.com/v3/activity/events/types/)`
    );
  }
  handleEventHandlers(state, webhookNameOrNames, handler2);
}
function receiverOnAny(state, handler2) {
  handleEventHandlers(state, "*", handler2);
}
function receiverOnError(state, handler2) {
  handleEventHandlers(state, "error", handler2);
}
function wrapErrorHandler(handler2, error) {
  let returnValue;
  try {
    returnValue = handler2(error);
  } catch (error2) {
    console.log('FATAL: Error occurred in "error" event handler');
    console.log(error2);
  }
  if (returnValue && returnValue.catch) {
    returnValue.catch((error2) => {
      console.log('FATAL: Error occurred in "error" event handler');
      console.log(error2);
    });
  }
}
function getHooks(state, eventPayloadAction, eventName) {
  const hooks = [state.hooks[eventName], state.hooks["*"]];
  if (eventPayloadAction) {
    hooks.unshift(state.hooks[`${eventName}.${eventPayloadAction}`]);
  }
  return [].concat(...hooks.filter(Boolean));
}
function receiverHandle(state, event) {
  const errorHandlers = state.hooks.error || [];
  if (event instanceof Error) {
    const error = Object.assign(new AggregateError([event], event.message), {
      event
    });
    errorHandlers.forEach((handler2) => wrapErrorHandler(handler2, error));
    return Promise.reject(error);
  }
  if (!event || !event.name) {
    const error = new Error("Event name not passed");
    throw new AggregateError([error], error.message);
  }
  if (!event.payload) {
    const error = new Error("Event name not passed");
    throw new AggregateError([error], error.message);
  }
  const hooks = getHooks(
    state,
    "action" in event.payload ? event.payload.action : null,
    event.name
  );
  if (hooks.length === 0) {
    return Promise.resolve();
  }
  const errors = [];
  const promises = hooks.map((handler2) => {
    let promise = Promise.resolve(event);
    if (state.transform) {
      promise = promise.then(state.transform);
    }
    return promise.then((event2) => {
      return handler2(event2);
    }).catch((error) => errors.push(Object.assign(error, { event })));
  });
  return Promise.all(promises).then(() => {
    if (errors.length === 0) {
      return;
    }
    const error = new AggregateError(
      errors,
      errors.map((error2) => error2.message).join("\n")
    );
    Object.assign(error, {
      event
    });
    errorHandlers.forEach((handler2) => wrapErrorHandler(handler2, error));
    throw error;
  });
}
function removeListener(state, webhookNameOrNames, handler2) {
  if (Array.isArray(webhookNameOrNames)) {
    webhookNameOrNames.forEach(
      (webhookName) => removeListener(state, webhookName, handler2)
    );
    return;
  }
  if (!state.hooks[webhookNameOrNames]) {
    return;
  }
  for (let i = state.hooks[webhookNameOrNames].length - 1; i >= 0; i--) {
    if (state.hooks[webhookNameOrNames][i] === handler2) {
      state.hooks[webhookNameOrNames].splice(i, 1);
      return;
    }
  }
}
function createEventHandler(options) {
  const state = {
    hooks: {},
    log: createLogger2(options && options.log)
  };
  if (options && options.transform) {
    state.transform = options.transform;
  }
  return {
    on: receiverOn.bind(null, state),
    onAny: receiverOnAny.bind(null, state),
    onError: receiverOnError.bind(null, state),
    removeListener: removeListener.bind(null, state),
    receive: receiverHandle.bind(null, state)
  };
}
async function verifyAndReceive(state, event) {
  const matchesSignature = await verifyWithFallback(
    state.secret,
    event.payload,
    event.signature,
    state.additionalSecrets
  ).catch(() => false);
  if (!matchesSignature) {
    const error = new Error(
      "[@octokit/webhooks] signature does not match event payload and secret"
    );
    return state.eventHandler.receive(
      Object.assign(error, { event, status: 400 })
    );
  }
  let payload;
  try {
    payload = JSON.parse(event.payload);
  } catch (error) {
    error.message = "Invalid JSON";
    error.status = 400;
    throw new AggregateError([error], error.message);
  }
  return state.eventHandler.receive({
    id: event.id,
    name: event.name,
    payload
  });
}
var textDecoder = new TextDecoder("utf-8", { fatal: false });
var decode = textDecoder.decode.bind(textDecoder);
var Webhooks = class {
  sign;
  verify;
  on;
  onAny;
  onError;
  removeListener;
  receive;
  verifyAndReceive;
  constructor(options) {
    if (!options || !options.secret) {
      throw new Error("[@octokit/webhooks] options.secret required");
    }
    const state = {
      eventHandler: createEventHandler(options),
      secret: options.secret,
      additionalSecrets: options.additionalSecrets,
      hooks: {},
      log: createLogger2(options.log)
    };
    this.sign = sign.bind(null, options.secret);
    this.verify = verify.bind(null, options.secret);
    this.on = state.eventHandler.on;
    this.onAny = state.eventHandler.onAny;
    this.onError = state.eventHandler.onError;
    this.removeListener = state.eventHandler.removeListener;
    this.receive = state.eventHandler.receive;
    this.verifyAndReceive = verifyAndReceive.bind(null, state);
  }
};

// ../node_modules/@octokit/plugin-paginate-rest/dist-bundle/index.js
var VERSION11 = "0.0.0-development";
function normalizePaginatedListResponse(response) {
  if (!response.data) {
    return {
      ...response,
      data: []
    };
  }
  const responseNeedsNormalization = "total_count" in response.data && !("url" in response.data);
  if (!responseNeedsNormalization) return response;
  const incompleteResults = response.data.incomplete_results;
  const repositorySelection = response.data.repository_selection;
  const totalCount = response.data.total_count;
  delete response.data.incomplete_results;
  delete response.data.repository_selection;
  delete response.data.total_count;
  const namespaceKey = Object.keys(response.data)[0];
  const data = response.data[namespaceKey];
  response.data = data;
  if (typeof incompleteResults !== "undefined") {
    response.data.incomplete_results = incompleteResults;
  }
  if (typeof repositorySelection !== "undefined") {
    response.data.repository_selection = repositorySelection;
  }
  response.data.total_count = totalCount;
  return response;
}
function iterator(octokit, route, parameters) {
  const options = typeof route === "function" ? route.endpoint(parameters) : octokit.request.endpoint(route, parameters);
  const requestMethod = typeof route === "function" ? route : octokit.request;
  const method = options.method;
  const headers = options.headers;
  let url = options.url;
  return {
    [Symbol.asyncIterator]: () => ({
      async next() {
        if (!url) return { done: true };
        try {
          const response = await requestMethod({ method, url, headers });
          const normalizedResponse = normalizePaginatedListResponse(response);
          url = ((normalizedResponse.headers.link || "").match(
            /<([^<>]+)>;\s*rel="next"/
          ) || [])[1];
          return { value: normalizedResponse };
        } catch (error) {
          if (error.status !== 409) throw error;
          url = "";
          return {
            value: {
              status: 200,
              headers: {},
              data: []
            }
          };
        }
      }
    })
  };
}
function paginate(octokit, route, parameters, mapFn) {
  if (typeof parameters === "function") {
    mapFn = parameters;
    parameters = void 0;
  }
  return gather(
    octokit,
    [],
    iterator(octokit, route, parameters)[Symbol.asyncIterator](),
    mapFn
  );
}
function gather(octokit, results, iterator2, mapFn) {
  return iterator2.next().then((result) => {
    if (result.done) {
      return results;
    }
    let earlyExit = false;
    function done() {
      earlyExit = true;
    }
    results = results.concat(
      mapFn ? mapFn(result.value, done) : result.value.data
    );
    if (earlyExit) {
      return results;
    }
    return gather(octokit, results, iterator2, mapFn);
  });
}
var composePaginateRest = Object.assign(paginate, {
  iterator
});
function paginateRest(octokit) {
  return {
    paginate: Object.assign(paginate.bind(null, octokit), {
      iterator: iterator.bind(null, octokit)
    })
  };
}
paginateRest.VERSION = VERSION11;

// ../node_modules/@octokit/app/dist-node/index.js
var VERSION12 = "15.1.6";
function webhooks(appOctokit, options) {
  return new Webhooks({
    secret: options.secret,
    transform: async (event) => {
      if (!("installation" in event.payload) || typeof event.payload.installation !== "object") {
        const octokit2 = new appOctokit.constructor({
          authStrategy: createUnauthenticatedAuth,
          auth: {
            reason: `"installation" key missing in webhook event payload`
          }
        });
        return {
          ...event,
          octokit: octokit2
        };
      }
      const installationId = event.payload.installation.id;
      const octokit = await appOctokit.auth({
        type: "installation",
        installationId,
        factory(auth7) {
          return new auth7.octokit.constructor({
            ...auth7.octokitOptions,
            authStrategy: createAppAuth,
            ...{
              auth: {
                ...auth7,
                installationId
              }
            }
          });
        }
      });
      octokit.hook.before("request", (options2) => {
        options2.headers["x-github-delivery"] = event.id;
      });
      return {
        ...event,
        octokit
      };
    }
  });
}
async function getInstallationOctokit(app, installationId) {
  return app.octokit.auth({
    type: "installation",
    installationId,
    factory(auth7) {
      const options = {
        ...auth7.octokitOptions,
        authStrategy: createAppAuth,
        ...{ auth: { ...auth7, installationId } }
      };
      return new auth7.octokit.constructor(options);
    }
  });
}
function eachInstallationFactory(app) {
  return Object.assign(eachInstallation.bind(null, app), {
    iterator: eachInstallationIterator.bind(null, app)
  });
}
async function eachInstallation(app, callback) {
  const i = eachInstallationIterator(app)[Symbol.asyncIterator]();
  let result = await i.next();
  while (!result.done) {
    await callback(result.value);
    result = await i.next();
  }
}
function eachInstallationIterator(app) {
  return {
    async *[Symbol.asyncIterator]() {
      const iterator2 = composePaginateRest.iterator(
        app.octokit,
        "GET /app/installations"
      );
      for await (const { data: installations } of iterator2) {
        for (const installation of installations) {
          const installationOctokit = await getInstallationOctokit(
            app,
            installation.id
          );
          yield { octokit: installationOctokit, installation };
        }
      }
    }
  };
}
function eachRepositoryFactory(app) {
  return Object.assign(eachRepository.bind(null, app), {
    iterator: eachRepositoryIterator.bind(null, app)
  });
}
async function eachRepository(app, queryOrCallback, callback) {
  const i = eachRepositoryIterator(
    app,
    callback ? queryOrCallback : void 0
  )[Symbol.asyncIterator]();
  let result = await i.next();
  while (!result.done) {
    if (callback) {
      await callback(result.value);
    } else {
      await queryOrCallback(result.value);
    }
    result = await i.next();
  }
}
function singleInstallationIterator(app, installationId) {
  return {
    async *[Symbol.asyncIterator]() {
      yield {
        octokit: await app.getInstallationOctokit(installationId)
      };
    }
  };
}
function eachRepositoryIterator(app, query) {
  return {
    async *[Symbol.asyncIterator]() {
      const iterator2 = query ? singleInstallationIterator(app, query.installationId) : app.eachInstallation.iterator();
      for await (const { octokit } of iterator2) {
        const repositoriesIterator = composePaginateRest.iterator(
          octokit,
          "GET /installation/repositories"
        );
        for await (const { data: repositories } of repositoriesIterator) {
          for (const repository of repositories) {
            yield { octokit, repository };
          }
        }
      }
    }
  };
}
function getInstallationUrlFactory(app) {
  let installationUrlBasePromise;
  return async function getInstallationUrl(options = {}) {
    if (!installationUrlBasePromise) {
      installationUrlBasePromise = getInstallationUrlBase(app);
    }
    const installationUrlBase = await installationUrlBasePromise;
    const installationUrl = new URL(installationUrlBase);
    if (options.target_id !== void 0) {
      installationUrl.pathname += "/permissions";
      installationUrl.searchParams.append(
        "target_id",
        options.target_id.toFixed()
      );
    }
    if (options.state !== void 0) {
      installationUrl.searchParams.append("state", options.state);
    }
    return installationUrl.href;
  };
}
async function getInstallationUrlBase(app) {
  const { data: appInfo } = await app.octokit.request("GET /app");
  if (!appInfo) {
    throw new Error("[@octokit/app] unable to fetch metadata for app");
  }
  return `${appInfo.html_url}/installations/new`;
}
var App = class {
  static VERSION = VERSION12;
  static defaults(defaults) {
    const AppWithDefaults = class extends this {
      constructor(...args) {
        super({
          ...defaults,
          ...args[0]
        });
      }
    };
    return AppWithDefaults;
  }
  octokit;
  // @ts-ignore calling app.webhooks will throw a helpful error when options.webhooks is not set
  webhooks;
  // @ts-ignore calling app.oauth will throw a helpful error when options.oauth is not set
  oauth;
  getInstallationOctokit;
  eachInstallation;
  eachRepository;
  getInstallationUrl;
  log;
  constructor(options) {
    const Octokit2 = options.Octokit || Octokit;
    const authOptions = Object.assign(
      {
        appId: options.appId,
        privateKey: options.privateKey
      },
      options.oauth ? {
        clientId: options.oauth.clientId,
        clientSecret: options.oauth.clientSecret
      } : {}
    );
    const octokitOptions = {
      authStrategy: createAppAuth,
      auth: authOptions
    };
    if ("log" in options && typeof options.log !== "undefined") {
      octokitOptions.log = options.log;
    }
    this.octokit = new Octokit2(octokitOptions);
    this.log = Object.assign(
      {
        debug: () => {
        },
        info: () => {
        },
        warn: console.warn.bind(console),
        error: console.error.bind(console)
      },
      options.log
    );
    if (options.webhooks) {
      this.webhooks = webhooks(this.octokit, options.webhooks);
    } else {
      Object.defineProperty(this, "webhooks", {
        get() {
          throw new Error("[@octokit/app] webhooks option not set");
        }
      });
    }
    if (options.oauth) {
      this.oauth = new OAuthApp({
        ...options.oauth,
        clientType: "github-app",
        Octokit: Octokit2
      });
    } else {
      Object.defineProperty(this, "oauth", {
        get() {
          throw new Error(
            "[@octokit/app] oauth.clientId / oauth.clientSecret options are not set"
          );
        }
      });
    }
    this.getInstallationOctokit = getInstallationOctokit.bind(
      null,
      this
    );
    this.eachInstallation = eachInstallationFactory(
      this
    );
    this.eachRepository = eachRepositoryFactory(
      this
    );
    this.getInstallationUrl = getInstallationUrlFactory(this);
  }
};

// ../packages/event-bus/dist/index.js
var InMemoryEventBus = class {
  handlers = /* @__PURE__ */ new Map();
  async publish(event) {
    console.log(`[event-bus] publish: ${event.type}`);
    const handlers = this.handlers.get(event.type) ?? [];
    await Promise.all(handlers.map((h) => Promise.resolve(h(event)).catch((err) => {
      console.error(`[event-bus] handler error for ${event.type}:`, err);
    })));
  }
  subscribe(type, handler2) {
    const existing = this.handlers.get(type) ?? [];
    this.handlers.set(type, [...existing, handler2]);
  }
};

// src/handlers/pull-request.ts
function extractRepo(payload) {
  return {
    owner: payload.repository.owner.login,
    name: payload.repository.name,
    fullName: payload.repository.full_name
  };
}
function extractPr(pr) {
  return {
    number: pr.number,
    title: pr.title,
    body: pr.body,
    base: pr.base.ref,
    head: pr.head.ref
  };
}
async function handlePullRequest(event, bus) {
  const { payload } = event;
  if (payload.action === "review_requested") {
    const requested = payload.requested_reviewer?.login ?? "";
    if (requested !== "duhon") return;
    const reviewEvent = {
      type: "review.requested",
      repo: extractRepo(payload),
      pr: extractPr(payload.pull_request),
      requestedBy: payload.sender.login,
      installationId: payload.installation.id
    };
    await bus.publish(reviewEvent);
  }
  if (payload.action === "opened") {
    const analystEvent = {
      type: "analyst.question_asked",
      repo: extractRepo(payload),
      pr: extractPr(payload.pull_request),
      commentId: 0,
      question: "",
      askedBy: payload.sender.login,
      installationId: payload.installation.id
    };
    await bus.publish(analystEvent);
  }
}
async function handleIssueComment(event, bus) {
  const { payload } = event;
  if (payload.action !== "created") return;
  if (!payload.comment.user || payload.comment.user.type === "Bot") return;
  if (!payload.issue.pull_request) return;
  if (!payload.comment.body.toLowerCase().includes("@duhon")) return;
  const mentionEvent = {
    type: "pr.mention",
    repo: {
      owner: payload.repository.owner.login,
      name: payload.repository.name,
      fullName: payload.repository.full_name
    },
    pr: {
      number: payload.issue.number,
      title: payload.issue.title,
      body: payload.issue.body ?? null,
      base: "",
      head: ""
    },
    comment: payload.comment.body,
    commentId: payload.comment.id,
    author: payload.comment.user.login,
    installationId: payload.installation.id
  };
  await bus.publish(mentionEvent);
}
async function handleReviewComment(event, bus) {
  const { payload } = event;
  if (payload.action !== "created") return;
  if (!payload.comment.user || payload.comment.user.type === "Bot") return;
  if (!payload.comment.in_reply_to_id) return;
  const pr = payload.pull_request;
  const mentionEvent = {
    type: "pr.mention",
    repo: {
      owner: payload.repository.owner.login,
      name: payload.repository.name,
      fullName: payload.repository.full_name
    },
    pr: extractPr(pr),
    comment: payload.comment.body,
    commentId: payload.comment.id,
    inReplyToId: payload.comment.in_reply_to_id ?? void 0,
    author: payload.comment.user.login,
    installationId: payload.installation.id
  };
  await bus.publish(mentionEvent);
}

// src/handlers/check-run.ts
async function handleCheckRun(event, bus) {
  const { payload } = event;
  if (payload.action !== "completed") return;
  if (payload.check_run.conclusion === "success") return;
  const pr = payload.check_run.pull_requests[0];
  if (!pr) return;
  const checkEvent = {
    type: "tests.check_run_completed",
    repo: {
      owner: payload.repository.owner.login,
      name: payload.repository.name,
      fullName: payload.repository.full_name
    },
    pr: {
      number: pr.number,
      title: "",
      body: null,
      base: pr.base.ref,
      head: pr.head.ref
    },
    checkRunId: payload.check_run.id,
    checkRunName: payload.check_run.name,
    conclusion: payload.check_run.conclusion,
    detailsUrl: payload.check_run.details_url ?? "",
    installationId: payload.installation.id
  };
  await bus.publish(checkEvent);
}

// src/router.ts
function registerWebhookHandlers(webhooks3, bus) {
  webhooks3.on("pull_request", (event) => handlePullRequest(event, bus));
  webhooks3.on("pull_request_review_comment", (event) => handleReviewComment(event, bus));
  webhooks3.on("issue_comment", (event) => handleIssueComment(event, bus));
  webhooks3.on("check_run", (event) => handleCheckRun(event, bus));
  webhooks3.onError((error) => {
    console.error("[gateway] webhook error:", error.message);
  });
}

// ../services/butler/dist/index.js
var BEDROCK_MODEL = "us.anthropic.claude-sonnet-4-6";
async function classifyIntent(comment) {
  const region = process.env.AWS_REGION ?? "us-east-1";
  const token = process.env.AWS_BEARER_TOKEN_BEDROCK;
  const url = `https://bedrock-runtime.${region}.amazonaws.com/model/${encodeURIComponent(BEDROCK_MODEL)}/converse`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      system: [{ text: `You are a dispatcher for a GitHub bot. Classify the user's intent from their PR comment.
Reply with exactly one word:
- "review" \u2014 user wants a code review of the PR
- "question" \u2014 user is asking a question about the code, the PR, or how something works
- "unknown" \u2014 anything else` }],
      messages: [{ role: "user", content: [{ text: comment }] }]
    })
  });
  if (!response.ok) {
    console.error(`[butler] bedrock error: ${response.status}`);
    return "unknown";
  }
  const data = await response.json();
  const text = data.output?.message?.content?.[0]?.text?.trim().toLowerCase() ?? "";
  console.log(`[butler] classified "${comment.slice(0, 80)}" \u2192 ${text}`);
  if (text.startsWith("review"))
    return "review";
  if (text.startsWith("question"))
    return "question";
  return "unknown";
}
function register2(bus, githubApp) {
  bus.subscribe("pr.mention", async (event) => {
    console.log(`[butler] mention in PR #${event.pr.number} by ${event.author}: ${event.comment.slice(0, 100)}`);
    if (event.inReplyToId) {
      const octokit = await githubApp.getInstallationOctokit(event.installationId);
      let originalComment;
      try {
        const { data } = await octokit.request("GET /repos/{owner}/{repo}/pulls/comments/{comment_id}", {
          owner: event.repo.owner,
          repo: event.repo.name,
          comment_id: event.inReplyToId
        });
        originalComment = {
          id: data.id,
          body: data.body,
          path: data.path,
          line: data.line ?? data.original_line ?? 0,
          side: data.side ?? "RIGHT"
        };
      } catch (err) {
        console.error(`[butler] failed to fetch original comment ${event.inReplyToId}:`, err);
        return;
      }
      const threadReplyEvent = {
        type: "review.thread_reply",
        repo: event.repo,
        pr: event.pr,
        originalComment,
        reply: {
          id: event.commentId,
          body: event.comment,
          author: event.author
        },
        installationId: event.installationId
      };
      await bus.publish(threadReplyEvent);
      return;
    }
    const intent = await classifyIntent(event.comment);
    if (intent === "review") {
      const reviewEvent = {
        type: "review.requested",
        repo: event.repo,
        pr: event.pr,
        requestedBy: event.author,
        installationId: event.installationId
      };
      await bus.publish(reviewEvent);
      return;
    }
    if (intent === "question") {
      const questionEvent = {
        type: "analyst.question_asked",
        repo: event.repo,
        pr: event.pr,
        commentId: event.commentId,
        question: event.comment,
        askedBy: event.author,
        installationId: event.installationId
      };
      await bus.publish(questionEvent);
      return;
    }
    console.log(`[butler] unknown intent, ignoring`);
  });
}

// ../services/reviewer/dist/index.js
var import_client_s3 = require("@aws-sdk/client-s3");

// ../services/reviewer/dist/knowledge/basic.js
var basic_default = `
# Basic Code Review Knowledge

A thorough review covers four dimensions. Apply all of them to every PR.

Every comment must carry a severity prefix on the first line:
- **[critical]** \u2014 blocks merge; incorrect, insecure, or will cause an outage
- **[major]** \u2014 should be fixed in this PR; real problem but not an immediate blocker
- **[minor]** \u2014 suggestion or nit; the author may address it at their discretion

**By default, only post [critical] comments. Skip [major] and [minor] unless the project configuration explicitly enables them.**

---

## 1. Correctness

The code must do what it claims to do, handle all paths, and not break under edge cases.

Critical:
- Unhandled exceptions or error paths that will crash the service
- Missing await on async calls that causes data loss or incorrect behavior
- Race conditions or unsafe shared state mutations
- Logic errors that produce wrong results on valid input

Major:
- Off-by-one errors or boundary conditions that affect real use cases
- Edge cases (empty input, zero, null) that are unhandled but don't crash
- Missing tests for new non-trivial logic

Minor:
- Tests that assert implementation details instead of behavior
- Redundant conditions or unreachable branches

---

## 2. Security

Flag anything that could be exploited or leak sensitive data.

Critical:
- Secrets, tokens, passwords, or PII written to logs or responses
- User-controlled input concatenated into shell commands, SQL, or file paths
- Missing authentication or authorization on a new endpoint or action
- Hardcoded credentials in source

Major:
- Missing input validation at a system boundary (user input, external API response)
- Internal error details (stack traces, db errors) exposed to external callers
- Insecure deserialization, path traversal, or open redirect risk

Minor:
- Sensitive config that could move to environment variables but isn't harmful yet
- Missing security headers on responses that don't handle sensitive data

---

## 3. Performance

Flag patterns that will cause problems at scale, not micro-optimizations.

Critical:
- N+1 query inside a loop over a user-facing collection with no upper bound
- Unbounded collection loaded fully into memory (missing pagination/streaming)
- Synchronous blocking I/O in a hot path that will stall the event loop

Major:
- Repeated expensive computation that could be hoisted or memoized
- Large payloads returned to clients without size limits

Minor:
- Unnecessary work that could be skipped but has negligible impact at current scale

---

## 4. Architecture

The change should fit the existing design and not introduce structural debt.

Critical:
- Business logic placed directly in a transport layer (controller, handler, route)
- Direct access to another module's internals, bypassing its public interface
- Breaking change to a public API (removed/renamed/reordered parameters) without versioning

Major:
- Duplication across multiple call sites that will need to be kept in sync
- Shared mutable state or a new singleton without clear justification
- Public interface that is easy to misuse \u2014 missing precondition validation

Minor:
- Dead code, commented-out blocks, or TODO stubs left in production code
- Magic numbers or strings that should be named constants
`.trim();

// ../services/reviewer/dist/knowledge/magento.js
var magento_default = `
# Magento 2 Knowledge Pack

## Architecture

### Dependency Injection
- Always inject dependencies via constructor, never use ObjectManager directly (except in factories and proxies)
- Use virtual types in di.xml for configuration instead of creating new classes
- Prefer interfaces over concrete classes in constructor arguments

### Plugins (Interceptors)
- Use before/after plugins instead of around when possible \u2014 around plugins are expensive and block parallelism
- Never throw exceptions in around plugins without calling $proceed
- Plugin classes must be in Plugin/ directory and follow {ClassName}Plugin naming

### Observers
- Observers must be stateless \u2014 never store state in observer properties
- Use asynchronous observers (async="true") for non-critical operations
- Never use resource models directly inside observers \u2014 can cause deadlocks

### Service Contracts
- Business logic must go through service contracts (interfaces in Api/)
- Repository pattern: use repositories for CRUD, never direct resource model access from outside module
- Data interfaces in Api/Data/ must only have getters/setters

## Database

### Queries
- Never use raw SQL \u2014 always use Magento DB adapter or ORM
- Always add indexes for columns used in WHERE/JOIN
- Avoid SELECT * \u2014 always specify columns
- Use batch processing for bulk operations, never load full collections in memory

### Schema
- Use declarative schema (db_schema.xml) for all table definitions
- Always add foreign key constraints and proper column types
- Use db_schema_whitelist.json to track schema

## Security

### Input Validation
- Never trust user input \u2014 always validate and sanitize
- Use escapeHtml() / escapeUrl() in templates, never echo raw data
- ACL resources must be defined for every admin action

### CSRF & XSS
- All forms must have CSRF validation (uiComponent forms handle this automatically)
- Use \`$block->escapeHtml()\` for all output in .phtml templates
- Never use \`$$_GET\`, \`$$_POST\` directly \u2014 use request object

## Performance

### Caching
- Tag caches properly with cache tags for correct invalidation
- Use \`Magento\\Framework\\Cache\\FrontendInterface\` not low-level cache directly
- Avoid cache operations in loops

### Collections
- Never load full collection to get count \u2014 use \`getSize()\`
- Use \`addFieldToFilter\` instead of PHP-side filtering
- Always add \`setPageSize\` to avoid loading entire tables

### Indexing
- Mutable data that's queried often should have an indexer
- Partial reindex must be supported \u2014 implement \`executeList()\` not just \`executeFull()\`

## Code Quality

### PHP Conventions
- All public methods must have return type declarations
- Use strict_types=1 in all PHP files
- No static methods except in helper/utility classes and factories
- Classes must be final unless designed for extension

### Testing
- Unit tests for business logic (no Magento framework dependencies)
- Integration tests for repository/resource model layer
- MFTF for end-to-end admin/frontend flows

### Common Anti-patterns to Flag
- \`ObjectManager::getInstance()\` outside of factories \u2014 hard to test, bypasses DI
- \`$collection->load()\` inside loops \u2014 N+1 query problem
- Direct table access bypassing repositories
- Missing \`@api\` annotation on public service contract interfaces
- \`sleep()\` or \`usleep()\` in production code
- Hardcoded store IDs or website IDs
`.trim();

// ../services/reviewer/dist/knowledge/index.js
var knowledgePacks = {
  basic: basic_default,
  magento: magento_default
};

// ../services/reviewer/dist/index.js
var s3 = new import_client_s3.S3Client({});
var MEMORY_BUCKET = process.env.BLIN_MEMORY_BUCKET;
var BEDROCK_MODEL2 = "us.anthropic.claude-sonnet-4-6";
var MAX_ITERATIONS = 20;
var DEFAULT_READ_LIMIT = 200;
var MAX_READ_LIMIT = 1e3;
var DEFAULT_CONFIG = {
  knowledge: ["basic"],
  context_files: []
};
async function callBedrock(systemPrompt, messages, tools) {
  const region = process.env.AWS_REGION ?? "us-east-1";
  const token = process.env.AWS_BEARER_TOKEN_BEDROCK;
  const url = `https://bedrock-runtime.${region}.amazonaws.com/model/${encodeURIComponent(BEDROCK_MODEL2)}/converse`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      system: [{ text: systemPrompt }],
      messages,
      toolConfig: { tools }
    })
  });
  if (!response.ok) {
    throw new Error(`Bedrock error: ${response.status} ${await response.text()}`);
  }
  const data = await response.json();
  return {
    content: data.output.message.content,
    stopReason: data.stopReason
  };
}
function processDiff(diff) {
  const lines = diff.split("\n");
  const result = [];
  const map = /* @__PURE__ */ new Map();
  let currentFile = null;
  let currentFileHunks = null;
  let rightHunk = null;
  let leftHunk = null;
  let oldLine = 0;
  let newLine = 0;
  const closeHunks = () => {
    if (currentFileHunks) {
      if (rightHunk)
        currentFileHunks.rightHunks.push(rightHunk);
      if (leftHunk)
        currentFileHunks.leftHunks.push(leftHunk);
    }
    rightHunk = null;
    leftHunk = null;
  };
  for (const line of lines) {
    if (line.startsWith("diff --git")) {
      closeHunks();
      const m = line.match(/^diff --git a\/(.+?) b\/(.+)$/);
      currentFile = m ? m[2] : null;
      if (currentFile) {
        currentFileHunks = {
          rightHunks: [],
          leftHunks: [],
          rightLines: /* @__PURE__ */ new Map(),
          leftLines: /* @__PURE__ */ new Map()
        };
        map.set(currentFile, currentFileHunks);
      } else {
        currentFileHunks = null;
      }
      result.push(line);
    } else if (line.startsWith("@@")) {
      closeHunks();
      const match = line.match(/@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
      if (match) {
        oldLine = parseInt(match[1], 10);
        newLine = parseInt(match[2], 10);
      }
      result.push(line);
    } else if (line.startsWith("+++") || line.startsWith("---")) {
      result.push(line);
    } else if (line.startsWith("+")) {
      const content = line.slice(1);
      result.push(`+[RIGHT:${newLine}] ${content}`);
      if (currentFileHunks)
        currentFileHunks.rightLines.set(newLine, content);
      if (!rightHunk)
        rightHunk = { start: newLine, end: newLine };
      else
        rightHunk.end = newLine;
      newLine++;
    } else if (line.startsWith("-")) {
      const content = line.slice(1);
      result.push(`-[LEFT:${oldLine}] ${content}`);
      if (currentFileHunks)
        currentFileHunks.leftLines.set(oldLine, content);
      if (!leftHunk)
        leftHunk = { start: oldLine, end: oldLine };
      else
        leftHunk.end = oldLine;
      oldLine++;
    } else if (line.startsWith("\\")) {
      result.push(line);
    } else if (line.startsWith(" ")) {
      const content = line.slice(1);
      result.push(` [RIGHT:${newLine}] ${content}`);
      if (currentFileHunks) {
        currentFileHunks.rightLines.set(newLine, content);
        currentFileHunks.leftLines.set(oldLine, content);
      }
      if (!rightHunk)
        rightHunk = { start: newLine, end: newLine };
      else
        rightHunk.end = newLine;
      if (!leftHunk)
        leftHunk = { start: oldLine, end: oldLine };
      else
        leftHunk.end = oldLine;
      oldLine++;
      newLine++;
    } else {
      result.push(line);
    }
  }
  closeHunks();
  return { annotated: result.join("\n"), map };
}
function validateCommentLine(map, path, side, line, startLine, anchorExcerpt) {
  const file = map.get(path);
  if (!file) {
    const known = [...map.keys()].join(", ") || "(none)";
    return `File "${path}" is not in the diff. Files in diff: ${known}`;
  }
  const hunks = side === "RIGHT" ? file.rightHunks : file.leftHunks;
  if (hunks.length === 0) {
    return `No ${side} hunks for "${path}". Try side=${side === "RIGHT" ? "LEFT" : "RIGHT"}.`;
  }
  const ranges = hunks.map((h) => `${h.start}-${h.end}`).join(", ");
  const target = hunks.find((h) => line >= h.start && line <= h.end);
  if (!target) {
    return `Line ${line} on side ${side} is not in any diff hunk for "${path}". Valid ${side} ranges: ${ranges}. Pick a line from one of those ranges.`;
  }
  if (startLine !== void 0) {
    if (startLine > line)
      return `start_line (${startLine}) must be <= line (${line})`;
    if (startLine < target.start || startLine > target.end) {
      return `start_line ${startLine} must be in the same hunk as line ${line} (hunk: ${target.start}-${target.end})`;
    }
  }
  const lineMap = side === "RIGHT" ? file.rightLines : file.leftLines;
  const anchorLine = startLine ?? line;
  const actualContent = lineMap.get(anchorLine);
  if (actualContent === void 0) {
    return `Line ${anchorLine} on side ${side} has no recorded content for "${path}".`;
  }
  const normalize = (s) => s.replace(/\s+/g, " ").trim();
  const actualNorm = normalize(actualContent);
  const expectedNorm = normalize(anchorExcerpt);
  if (actualNorm !== expectedNorm) {
    return `anchor_excerpt does not match line ${anchorLine} on side ${side} of "${path}".
  expected: ${JSON.stringify(expectedNorm)}
  actual:   ${JSON.stringify(actualNorm)}
Pick the line whose content matches the code you want to comment on.`;
  }
  return null;
}
var TOOLS = [
  {
    toolSpec: {
      name: "get_project_conventions",
      description: "Get the project conventions, coding standards, architecture rules, and accumulated memory from previous reviews of this repository. Always call this first before reviewing.",
      inputSchema: { json: { type: "object", properties: {} } }
    }
  },
  {
    toolSpec: {
      name: "save_repo_memory",
      description: `Persist accumulated knowledge about this repository to S3 for future reviews. Call this at the end of every review. Merge new facts with existing memory \u2014 never discard what was already there, only add or correct.

STRICT FORMAT \u2014 output exactly these four sections, no others:

## Architecture
Key architectural patterns, module structure, DI conventions, layer boundaries. Omit runtime versions \u2014 those are auto-detected from composer.json/package.json.

## Conventions
Coding conventions, test patterns, fixture conventions, naming rules specific to this repo. Only things not obvious from the language/framework.

## False positives \u2014 do not flag
Bullet list of finding categories that are NOT real issues in this repo. Be specific about WHY each is safe here.
Example: "- Missing setAccessible() before setValue() \u2014 repo requires PHP >=8.1 where it is optional"

## Patterns to watch
Recurring risky patterns specific to this codebase that are worth flagging when seen again. Be specific.`,
      inputSchema: {
        json: {
          type: "object",
          properties: {
            content: {
              type: "string",
              description: "Memory content following the strict four-section format described above."
            }
          },
          required: ["content"]
        }
      }
    }
  },
  {
    toolSpec: {
      name: "get_pr_description",
      description: "Get the PR title, description, and base/head branch info",
      inputSchema: { json: { type: "object", properties: {} } }
    }
  },
  {
    toolSpec: {
      name: "get_pr_diff",
      description: "Get the full diff of the pull request",
      inputSchema: { json: { type: "object", properties: {} } }
    }
  },
  {
    toolSpec: {
      name: "list_pr_files",
      description: "List all files changed in this PR with their status (added/modified/deleted)",
      inputSchema: { json: { type: "object", properties: {} } }
    }
  },
  {
    toolSpec: {
      name: "read_file",
      description: `Read a slice of a file in the repository at the PR head commit. Returns lines with explicit line numbers (matching diff RIGHT line numbers) plus a footer telling you the total line count and what is missing. Paginate with offset+limit instead of re-reading the same file.`,
      inputSchema: {
        json: {
          type: "object",
          properties: {
            path: { type: "string", description: "File path relative to repo root" },
            offset: { type: "number", description: `1-based line to start from. Default 1.` },
            limit: { type: "number", description: `Max lines to return. Default ${DEFAULT_READ_LIMIT}, max ${MAX_READ_LIMIT}.` }
          },
          required: ["path"]
        }
      }
    }
  },
  {
    toolSpec: {
      name: "create_inline_comment",
      description: "Post an inline review comment on a line or range of lines in the PR diff. Lines must be visible in the diff hunk (including unchanged context lines shown around changes). Use start_line+line to highlight a multi-line range.",
      inputSchema: {
        json: {
          type: "object",
          properties: {
            path: { type: "string", description: "File path exactly as shown in the diff" },
            line: { type: "number", description: "End line of the comment (or the only line for single-line). Must be visible in the diff hunk." },
            start_line: { type: "number", description: "Start line for a multi-line comment range. Must be in the same diff hunk as line. Omit for single-line comments." },
            side: {
              type: "string",
              enum: ["LEFT", "RIGHT"],
              description: "RIGHT for added/context lines in new file, LEFT for removed lines in old file. Default: RIGHT"
            },
            body: {
              type: "string",
              description: "Comment text. For code suggestions use: ```suggestion\\nreplacement code\\n```"
            },
            anchor_excerpt: {
              type: "string",
              description: "The exact text content (without the [RIGHT:N]/[LEFT:N] prefix or leading +/- ) of the anchor line \u2014 start_line if set, otherwise line. Used to verify you picked the right line. Whitespace is normalized."
            }
          },
          required: ["path", "line", "body", "anchor_excerpt"]
        }
      }
    }
  }
];
var SYSTEM_PROMPT = `You are a senior engineer doing a thorough code review of a pull request.

You have tools to explore the PR and post inline comments:
- get_pr_description: understand the purpose of the PR
- get_pr_diff: see what changed
- list_pr_files: see all changed files
- read_file: read a slice of any file in the repo for full context. Paginate with offset+limit when the footer says more lines exist \u2014 do NOT re-read the same file/range expecting different output
- create_inline_comment: post a comment on a specific line
- save_repo_memory: persist knowledge about this repo to S3 for future reviews

Your review process:
1. get_project_conventions \u2014 always start here; includes memory from previous reviews of this repo
2. get_pr_description \u2014 understand the purpose of the PR
3. get_pr_diff \u2014 see what changed
4. read_file as needed \u2014 get context from related files, types, interfaces
5. create_inline_comment \u2014 post comments for real issues found
6. Use \`\`\`suggestion blocks when you have a concrete fix
7. save_repo_memory \u2014 always call last; update memory with anything new learned about this repo

Severity filter \u2014 STRICT RULE:
- Post ONLY comments labelled [critical] (blocks merge, will cause crash/outage/data loss/security breach)
- NEVER post [major] or [minor] comments unless the project conventions explicitly say otherwise
- When in doubt whether something is critical or major \u2014 skip it

Rules for inline comments:
- The diff from get_pr_diff annotates every line with its exact line number: \`+[RIGHT:42]\` means added line 42 (use side=RIGHT, line=42), \`-[LEFT:41]\` means removed line 41 (use side=LEFT, line=41), \` [RIGHT:42]\` means context line 42 (use side=RIGHT, line=42)
- Always read the line number directly from the annotation \u2014 never count lines yourself
- The anchor line is the line your comment is attached to (start_line if you use a range, otherwise line). It must be the line containing the actual code you are discussing \u2014 not a docblock above it, not a closing brace below, not the first line of the hunk. Find the exact line whose content is what your comment is about, and use that line's number from its [RIGHT:N]/[LEFT:N] annotation
- You MUST pass anchor_excerpt: the exact text of the anchor line (everything after the \`[RIGHT:N]\` / \`[LEFT:N]\` prefix). The server rejects the comment if it doesn't match \u2014 this is your safety check that you picked the right line
- Prefer multi-line ranges (start_line + line) over single-line comments whenever the issue concerns more than one line. If you discuss a whole function, loop, conditional, or block \u2014 highlight the entire span, not just the first line. Single-line comments are only for issues genuinely confined to one line (a typo, a single bad call, one missing semicolon). start_line must be \u2264 line and both must be in the same diff hunk
- If the relevant code is completely outside any diff hunk (not visible in the diff at all), do NOT post an inline comment \u2014 skip it
- Comment body is rendered as GitHub markdown \u2014 write human prose, not raw diff syntax. NEVER paste \`@@ ... @@\` hunk headers, \`---\`/\`+++\` file headers, or \`[RIGHT:N]\`/\`[LEFT:N]\` annotations into the body. If you need to quote code, use a normal markdown code block

When done reviewing, say "Review complete." and stop calling tools.`;
async function loadDiffMap(ctx) {
  const { data } = await ctx.octokit.request("GET /repos/{owner}/{repo}/pulls/{pull_number}", {
    owner: ctx.owner,
    repo: ctx.repo,
    pull_number: ctx.pullNumber,
    headers: { accept: "application/vnd.github.v3.diff" }
  });
  const processed = processDiff(String(data));
  ctx.diffMap = processed.map;
  return processed;
}
async function executeTool(name, input, ctx) {
  switch (name) {
    case "get_project_conventions": {
      const readFile = async (path) => {
        try {
          const { data } = await ctx.octokit.request("GET /repos/{owner}/{repo}/contents/{path}", {
            owner: ctx.owner,
            repo: ctx.repo,
            path,
            ref: ctx.headSha
          });
          return Buffer.from(data.content, "base64").toString("utf8");
        } catch {
          return null;
        }
      };
      const blinYml = await readFile(".github/blin.yml");
      let knowledge = DEFAULT_CONFIG.knowledge;
      let contextFiles = DEFAULT_CONFIG.context_files;
      if (blinYml) {
        const knowledgeMatch = blinYml.match(/knowledge:\s*((?:\s+-\s+.+\n?)+)/);
        if (knowledgeMatch) {
          knowledge = [...knowledgeMatch[1].matchAll(/-\s+(\S+)/g)].map((m) => m[1].trim());
        }
        const contextFilesMatch = blinYml.match(/context_files:\s*((?:\s+-\s+.+\n?)+)/);
        if (contextFilesMatch) {
          contextFiles = [...contextFilesMatch[1].matchAll(/-\s+(.+)/g)].map((m) => m[1].trim());
        }
      }
      const sections = [];
      for (const name2 of knowledge) {
        if (knowledgePacks[name2]) {
          sections.push(`## Global knowledge: ${name2}
${knowledgePacks[name2]}`);
        }
      }
      const composerJson = await readFile("composer.json");
      if (composerJson) {
        try {
          const composer = JSON.parse(composerJson);
          const constraints = [];
          if (composer.require?.php)
            constraints.push(`php: ${composer.require.php}`);
          const extensions = Object.entries(composer.require ?? {}).filter(([k]) => k.startsWith("ext-")).map(([k, v]) => `${k}: ${v}`);
          if (extensions.length)
            constraints.push(...extensions);
          if (composer["require-dev"]?.php)
            constraints.push(`php (dev): ${composer["require-dev"].php}`);
          if (constraints.length) {
            sections.push(`## Project runtime constraints (composer.json)
${constraints.map((c) => `- ${c}`).join("\n")}

Do NOT flag issues that only affect versions outside these constraints.`);
          }
        } catch {
        }
      }
      const packageJson = await readFile("package.json");
      if (packageJson) {
        try {
          const pkg = JSON.parse(packageJson);
          if (pkg.engines && Object.keys(pkg.engines).length > 0) {
            const engines = Object.entries(pkg.engines).map(([k, v]) => `- ${k}: ${v}`).join("\n");
            sections.push(`## Project runtime constraints (package.json)
${engines}

Do NOT flag issues that only affect versions outside these constraints.`);
          }
        } catch {
        }
      }
      for (const path of contextFiles) {
        const content = await readFile(path);
        if (content)
          sections.push(`## ${path}
${content}`);
      }
      if (MEMORY_BUCKET) {
        try {
          const s3res = await s3.send(new import_client_s3.GetObjectCommand({
            Bucket: MEMORY_BUCKET,
            Key: `${ctx.owner}/${ctx.repo}/memory.md`
          }));
          const memory = await s3res.Body.transformToString();
          if (memory)
            sections.push(`## Repo memory (accumulated knowledge from previous reviews)
${memory}`);
        } catch {
        }
      }
      return sections.length > 0 ? sections.join("\n\n") : "No project conventions configured. Apply general best practices.";
    }
    case "get_pr_description": {
      return JSON.stringify({
        title: ctx.pr.title,
        body: ctx.pr.body ?? "(no description)",
        base: ctx.pr.base,
        head: ctx.pr.head
      });
    }
    case "get_pr_diff": {
      const { annotated } = await loadDiffMap(ctx);
      return annotated;
    }
    case "list_pr_files": {
      const { data } = await ctx.octokit.request("GET /repos/{owner}/{repo}/pulls/{pull_number}/files", {
        owner: ctx.owner,
        repo: ctx.repo,
        pull_number: ctx.pullNumber,
        per_page: 100
      });
      return JSON.stringify(data.map((f) => ({
        path: f.filename,
        status: f.status,
        additions: f.additions,
        deletions: f.deletions
      })));
    }
    case "read_file": {
      try {
        const { data } = await ctx.octokit.request("GET /repos/{owner}/{repo}/contents/{path}", {
          owner: ctx.owner,
          repo: ctx.repo,
          path: input.path,
          ref: ctx.headSha
        });
        const content = Buffer.from(data.content, "base64").toString("utf8");
        const allLines = content.split("\n");
        const totalLines = allLines.length;
        const offset = Math.max(1, Math.floor(input.offset ?? 1));
        const limit = Math.min(MAX_READ_LIMIT, Math.max(1, Math.floor(input.limit ?? DEFAULT_READ_LIMIT)));
        if (offset > totalLines) {
          return `File ${input.path} has ${totalLines} lines. offset=${offset} is past the end.`;
        }
        const endLine = Math.min(totalLines, offset + limit - 1);
        const slice = allLines.slice(offset - 1, endLine);
        const numbered = slice.map((l, i) => `${offset + i}	${l}`).join("\n");
        const footer = [`--- showing lines ${offset}-${endLine} of ${totalLines} ---`];
        if (endLine < totalLines) {
          footer.push(`To read more, call read_file again with offset=${endLine + 1}.`);
        }
        if (offset > 1) {
          footer.push(`Earlier lines (1-${offset - 1}) are not shown.`);
        }
        return `${numbered}
${footer.join(" ")}`;
      } catch (err) {
        return `Error reading file: ${err.message}`;
      }
    }
    case "create_inline_comment": {
      if (!ctx.diffMap)
        await loadDiffMap(ctx);
      const side = input.side ?? "RIGHT";
      console.log(`[reviewer][comment] === incoming call ===`);
      console.log(`[reviewer][comment] path=${input.path}`);
      console.log(`[reviewer][comment] line=${input.line} start_line=${input.start_line ?? "(none)"} side=${side}`);
      console.log(`[reviewer][comment] anchor_excerpt=${JSON.stringify(input.anchor_excerpt)}`);
      console.log(`[reviewer][comment] body=${JSON.stringify(input.body?.slice(0, 200))}${input.body?.length > 200 ? "..." : ""}`);
      const file = ctx.diffMap.get(input.path);
      if (file) {
        const lineMap = side === "RIGHT" ? file.rightLines : file.leftLines;
        const anchorLine = input.start_line ?? input.line;
        const endLine = input.line;
        console.log(`[reviewer][comment] actual line ${anchorLine}=${JSON.stringify(lineMap.get(anchorLine))}`);
        if (anchorLine !== endLine) {
          console.log(`[reviewer][comment] actual line ${endLine}=${JSON.stringify(lineMap.get(endLine))}`);
        }
      } else {
        console.log(`[reviewer][comment] file NOT in diff. known files: ${[...ctx.diffMap.keys()].join(", ")}`);
      }
      if (typeof input.anchor_excerpt !== "string" || input.anchor_excerpt.trim() === "") {
        console.warn(`[reviewer][comment] REJECTED: missing anchor_excerpt`);
        return `REJECTED: anchor_excerpt is required. Copy the exact text of the anchor line (start_line if set, otherwise line) from the diff \u2014 without the [RIGHT:N] prefix.`;
      }
      const validationError = validateCommentLine(ctx.diffMap, input.path, side, input.line, input.start_line, input.anchor_excerpt);
      if (validationError) {
        console.warn(`[reviewer][comment] REJECTED: ${validationError}`);
        return `REJECTED: ${validationError} The diff annotations show [RIGHT:N] for new-file lines and [LEFT:N] for old-file lines \u2014 copy both the number and the content exactly from there.`;
      }
      const requestBody = {
        body: input.body,
        path: input.path,
        line: input.line,
        ...input.start_line ? { start_line: input.start_line, start_side: side } : {},
        side,
        commit_id: ctx.headSha
      };
      console.log(`[reviewer][comment] POST /pulls/${ctx.pullNumber}/comments body=${JSON.stringify({ ...requestBody, body: "<omitted>" })}`);
      const res = await fetch(`https://api.github.com/repos/${ctx.owner}/${ctx.repo}/pulls/${ctx.pullNumber}/comments`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${ctx.pat}`,
          "Content-Type": "application/json",
          "Accept": "application/vnd.github.v3+json"
        },
        body: JSON.stringify(requestBody)
      });
      if (!res.ok) {
        const err = await res.text();
        console.error(`[reviewer][comment] github API failed (${res.status}): ${err}`);
        return `Failed to post comment on ${input.path}:${input.line} (side: ${side}): ${err}`;
      }
      const created = await res.json();
      console.log(`[reviewer][comment] SUCCESS id=${created.id} url=${created.html_url}`);
      console.log(`[reviewer][comment] github attached to line=${created.line} start_line=${created.start_line ?? "(none)"} side=${created.side} original_line=${created.original_line}`);
      return "Comment posted successfully";
    }
    case "save_repo_memory": {
      if (!MEMORY_BUCKET)
        return "Memory storage not configured (BLIN_MEMORY_BUCKET not set)";
      const key = `${ctx.owner}/${ctx.repo}/memory.md`;
      await s3.send(new import_client_s3.PutObjectCommand({
        Bucket: MEMORY_BUCKET,
        Key: key,
        Body: input.content,
        ContentType: "text/markdown"
      }));
      console.log(`[reviewer][memory] saved s3://${MEMORY_BUCKET}/${key}`);
      return "Memory saved successfully";
    }
    default:
      return `Unknown tool: ${name}`;
  }
}
function register3(bus, githubApp) {
  bus.subscribe("review.requested", async (event) => {
    console.log(`[reviewer] reviewing PR #${event.pr.number} in ${event.repo.fullName}`);
    const octokit = await githubApp.getInstallationOctokit(event.installationId);
    const { data: prData } = await octokit.request("GET /repos/{owner}/{repo}/pulls/{pull_number}", {
      owner: event.repo.owner,
      repo: event.repo.name,
      pull_number: event.pr.number
    });
    const ctx = {
      octokit,
      owner: event.repo.owner,
      repo: event.repo.name,
      pullNumber: event.pr.number,
      headSha: prData.head.sha,
      defaultBranch: prData.base.repo.default_branch,
      pat: process.env.GITHUB_REVIEWER_PAT,
      pr: {
        title: event.pr.title,
        body: event.pr.body,
        base: prData.base.ref,
        head: prData.head.ref
      },
      diffMap: null
    };
    const messages = [
      { role: "user", content: [{ text: `Review PR #${event.pr.number}: "${event.pr.title}" in ${event.repo.fullName}` }] }
    ];
    await runAgentLoop(`[reviewer] PR #${event.pr.number}`, SYSTEM_PROMPT, TOOLS, [
      { role: "user", content: [{ text: `Review PR #${event.pr.number}: "${event.pr.title}" in ${event.repo.fullName}` }] }
    ], ctx);
  });
  bus.subscribe("review.thread_reply", async (event) => {
    console.log(`[reviewer] thread reply in PR #${event.pr.number} by ${event.reply.author}`);
    const octokit = await githubApp.getInstallationOctokit(event.installationId);
    const pat = process.env.GITHUB_REVIEWER_PAT;
    const THREAD_SYSTEM_PROMPT = `You are a senior engineer who posted an inline code review comment. Someone has replied to your comment \u2014 read their reply, consider their argument, and respond directly in the thread.

You can use read_file to look up more context if needed.

To post your reply, call reply_to_thread with your response text.

Be concise. If their argument is valid, acknowledge it and explain if you're retracting the finding. If you still believe the issue is real, explain why clearly. Do not repeat the original finding verbatim.`;
    const THREAD_TOOLS = [
      {
        toolSpec: {
          name: "read_file",
          description: `Read a slice of a file in the repository for context.`,
          inputSchema: {
            json: {
              type: "object",
              properties: {
                path: { type: "string", description: "File path relative to repo root" },
                offset: { type: "number", description: "1-based line to start from. Default 1." },
                limit: { type: "number", description: `Max lines to return. Default ${DEFAULT_READ_LIMIT}, max ${MAX_READ_LIMIT}.` }
              },
              required: ["path"]
            }
          }
        }
      },
      {
        toolSpec: {
          name: "reply_to_thread",
          description: "Post a reply in the review thread.",
          inputSchema: {
            json: {
              type: "object",
              properties: {
                body: { type: "string", description: "Your reply text (GitHub markdown)." }
              },
              required: ["body"]
            }
          }
        }
      }
    ];
    const { data: prData } = await octokit.request("GET /repos/{owner}/{repo}/pulls/{pull_number}", {
      owner: event.repo.owner,
      repo: event.repo.name,
      pull_number: event.pr.number
    });
    const ctx = {
      octokit,
      owner: event.repo.owner,
      repo: event.repo.name,
      pullNumber: event.pr.number,
      headSha: prData.head.sha,
      defaultBranch: prData.base.repo.default_branch,
      pat,
      pr: {
        title: event.pr.title,
        body: event.pr.body,
        base: prData.base.ref,
        head: prData.head.ref
      },
      diffMap: null
    };
    const threadExecuteTool = async (name, input) => {
      if (name === "read_file")
        return executeTool("read_file", input, ctx);
      if (name === "reply_to_thread") {
        const res = await fetch(`https://api.github.com/repos/${event.repo.owner}/${event.repo.name}/pulls/comments`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${pat}`,
            "Content-Type": "application/json",
            "Accept": "application/vnd.github.v3+json"
          },
          body: JSON.stringify({
            body: input.body,
            in_reply_to: event.reply.id,
            commit_id: prData.head.sha,
            path: event.originalComment.path,
            line: event.originalComment.line,
            side: event.originalComment.side
          })
        });
        if (!res.ok) {
          const err = await res.text();
          console.error(`[reviewer][thread] reply failed (${res.status}): ${err}`);
          return `Failed to post reply: ${err}`;
        }
        console.log(`[reviewer][thread] reply posted`);
        return "Reply posted successfully";
      }
      return `Unknown tool: ${name}`;
    };
    const initialMessage = `You previously commented on \`${event.originalComment.path}\` line ${event.originalComment.line}:

> ${event.originalComment.body}

${event.reply.author} replied:

> ${event.reply.body}

Respond to their reply.`;
    await runAgentLoop(`[reviewer] thread PR #${event.pr.number}`, THREAD_SYSTEM_PROMPT, THREAD_TOOLS, [
      { role: "user", content: [{ text: initialMessage }] }
    ], ctx, threadExecuteTool);
  });
}
async function runAgentLoop(logPrefix, systemPrompt, tools, messages, ctx, toolExecutor) {
  for (let i = 0; i < MAX_ITERATIONS; i++) {
    console.log(`${logPrefix} --- iteration ${i + 1}/${MAX_ITERATIONS} ---`);
    const response = await callBedrock(systemPrompt, messages, tools);
    messages.push({ role: "assistant", content: response.content });
    for (const block of response.content) {
      if (block.text) {
        console.log(`${logPrefix} claude text: ${block.text.slice(0, 300)}${block.text.length > 300 ? "..." : ""}`);
      }
    }
    if (response.stopReason === "end_turn") {
      console.log(`${logPrefix} done`);
      break;
    }
    const toolResults = [];
    for (const block of response.content) {
      if (block.toolUse) {
        console.log(`${logPrefix} tool: ${block.toolUse.name} input=${JSON.stringify(block.toolUse.input).slice(0, 500)}`);
        const result = toolExecutor ? await toolExecutor(block.toolUse.name, block.toolUse.input) : await executeTool(block.toolUse.name, block.toolUse.input, ctx);
        console.log(`${logPrefix} tool result (first 300 chars): ${result.slice(0, 300)}${result.length > 300 ? "..." : ""}`);
        toolResults.push({
          toolResult: {
            toolUseId: block.toolUse.toolUseId,
            content: [{ text: result }]
          }
        });
      }
    }
    if (toolResults.length === 0)
      break;
    messages.push({ role: "user", content: toolResults });
  }
}

// ../services/analyst/dist/index.js
function register4(bus, githubApp) {
  bus.subscribe("analyst.question_asked", async (event) => {
    console.log(`[analyst] question in PR #${event.pr.number} from ${event.askedBy}`);
    console.log(`[analyst] would create discussion for PR #${event.pr.number} (mock)`);
  });
}

// ../services/tester/dist/index.js
function register5(bus, githubApp) {
  bus.subscribe("tests.check_run_completed", async (event) => {
    console.log(`[tester] check run failed: ${event.checkRunName} in PR #${event.pr.number}`);
    console.log(`[tester] would post CI analysis for PR #${event.pr.number} (mock)`);
  });
}

// ../services/release-manager/dist/index.js
function register6(bus, githubApp) {
  bus.subscribe("release.requested", async (event) => {
    console.log(`[release-manager] release ${event.version} requested in ${event.repo.fullName}`);
    console.log(`[release-manager] would create release ${event.version} (mock)`);
  });
}

// ../services/environment-manager/dist/index.js
function register7(bus, githubApp) {
  bus.subscribe("environment.requested", async (event) => {
    console.log(`[environment-manager] preview requested for PR #${event.pr.number}`);
    console.log(`[environment-manager] would create deployment for PR #${event.pr.number} (mock)`);
  });
}

// src/setup.ts
function createWebhooks() {
  const bus = new InMemoryEventBus();
  const rawKey = process.env.GITHUB_PRIVATE_KEY_BASE64 ? Buffer.from(process.env.GITHUB_PRIVATE_KEY_BASE64, "base64").toString("utf8") : process.env.GITHUB_PRIVATE_KEY.replace(/\\n/g, "\n");
  const githubApp = new App({
    appId: process.env.GITHUB_APP_ID,
    privateKey: rawKey,
    webhooks: { secret: process.env.GITHUB_WEBHOOK_SECRET }
  });
  const webhooks3 = new Webhooks({ secret: process.env.GITHUB_WEBHOOK_SECRET });
  registerWebhookHandlers(webhooks3, bus);
  register2(bus, githubApp);
  register3(bus, githubApp);
  register4(bus, githubApp);
  register5(bus, githubApp);
  register6(bus, githubApp);
  register7(bus, githubApp);
  return webhooks3;
}

// src/lambda.ts
var webhooks2 = createWebhooks();
var handler = async (event) => {
  if (event.requestContext?.http?.method === "GET") {
    console.log("[lambda] GET health check");
    return { statusCode: 200, body: "ok" };
  }
  const eventName = event.headers["x-github-event"];
  const deliveryId = event.headers["x-github-delivery"];
  const body = event.isBase64Encoded && event.body ? Buffer.from(event.body, "base64").toString("utf8") : event.body ?? "";
  let action;
  try {
    action = JSON.parse(body).action;
  } catch {
  }
  console.log(`[lambda] event=${eventName}${action ? `.${action}` : ""} delivery=${deliveryId}`);
  try {
    await webhooks2.verifyAndReceive({
      id: deliveryId,
      name: eventName,
      signature: event.headers["x-hub-signature-256"],
      payload: body
    });
    return { statusCode: 200, body: "ok" };
  } catch (err) {
    console.error("[lambda] error:", err.message);
    return { statusCode: 400, body: "Bad Request" };
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handler
});
/*! Bundled license information:

toad-cache/dist/toad-cache.mjs:
  (**
   * toad-cache
   *
   * @copyright 2026 Igor Savin <kibertoad@gmail.com>
   * @license MIT
   * @version 3.7.0
   *)
*/
