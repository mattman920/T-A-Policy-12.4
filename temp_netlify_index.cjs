"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
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
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/netlify/index.ts
var netlify_exports = {};
__export(netlify_exports, {
  connect: () => connect
});
module.exports = __toCommonJS(netlify_exports);

// src/connection-from-store.ts
var import_cement = require("@adviser/cement");
var import_core = require("@fireproof/core");
var ConnectionFromStore = class extends import_core.bs.ConnectionBase {
  constructor(sthis, url) {
    const logger = (0, import_core.ensureLogger)(sthis, "ConnectionFromStore", {
      url: () => url.toString(),
      this: 1,
      log: 1
    });
    super(url, logger);
    this.stores = void 0;
    this.sthis = sthis;
  }
  async onConnect() {
    this.logger.Debug().Msg("onConnect-start");
    const stores = {
      base: this.url
      // data: this.urlData,
      // meta: this.urlMeta,
    };
    const rName = this.url.getParamResult("name");
    if (rName.isErr()) {
      throw this.logger.Error().Err(rName).Msg("missing Parameter").AsError();
    }
    const storeRuntime = import_core.bs.toStoreRuntime({ stores }, this.sthis);
    const loader = {
      name: rName.Ok(),
      ebOpts: {
        logger: this.logger,
        store: { stores },
        storeRuntime
      },
      sthis: this.sthis
    };
    this.stores = {
      data: await storeRuntime.makeDataStore(loader),
      meta: await storeRuntime.makeMetaStore(loader)
    };
    this.logger.Debug().Msg("onConnect-done");
    return;
  }
};
function connectionFactory(sthis, iurl) {
  return new ConnectionFromStore(sthis, import_cement.URI.from(iurl));
}
function makeKeyBagUrlExtractable(sthis) {
  let base = sthis.env.get("FP_KEYBAG_URL");
  if (!base) {
    if ((0, import_cement.runtimeFn)().isBrowser) {
      base = "indexdb://fp-keybag";
    } else {
      base = "file://./dist/kb-dir-partykit";
    }
  }
  const kbUrl = import_cement.BuildURI.from(base);
  kbUrl.defParam("extractKey", "_deprecated_internal_api");
  sthis.env.set("FP_KEYBAG_URL", kbUrl.toString());
  sthis.logger.Debug().Url(kbUrl, "keyBagUrl").Msg("Make keybag url extractable");
}

// src/netlify/gateway.ts
var import_cement2 = require("@adviser/cement");
var import_core2 = require("@fireproof/core");
var NetlifyGateway = class {
  constructor(sthis) {
    this.sthis = (0, import_core2.ensureSuperLog)(sthis, "NetlifyGateway");
    this.logger = this.sthis.logger;
  }
  async buildUrl(baseUrl, key) {
    return import_cement2.Result.Ok(baseUrl.build().setParam("key", key).URI());
  }
  async destroy(url) {
    const { store } = (0, import_core2.getStore)(url, this.sthis, (...args) => args.join("/"));
    if (store !== "meta") {
      return import_cement2.Result.Ok(void 0);
    }
    const rName = url.getParamResult("name");
    if (rName.isErr()) {
      return import_cement2.Result.Err(rName.Err());
    }
    let name = rName.Ok();
    const index = url.getParam("index");
    if (index) {
      name += `-${index}`;
    }
    name += ".fp";
    const remoteBaseUrl = url.getParam("remoteBaseUrl");
    if (!remoteBaseUrl) {
      return import_cement2.Result.Err(new Error("Remote base URL not found in the URI"));
    }
    const fetchUrl = import_cement2.BuildURI.from(remoteBaseUrl).setParam("meta", name).URI();
    const response = await fetch(fetchUrl.asURL(), { method: "DELETE" });
    if (!response.ok) {
      return this.logger.Error().Str("status", response.statusText).Msg("Failed to destroy meta database").ResultError();
    }
    return import_cement2.Result.Ok(void 0);
  }
  async start(uri) {
    const protocol = uri.host.startsWith("localhost") ? "http" : "https";
    const host = uri.host;
    const path = "/fireproof";
    const urlString = `${protocol}://${host}${path}`;
    const baseUrl = import_cement2.BuildURI.from(urlString).URI();
    const ret = uri.build().defParam("version", "v0.1-netlify").defParam("remoteBaseUrl", baseUrl.toString()).URI();
    return import_cement2.Result.Ok(ret);
  }
  async close() {
    return import_cement2.Result.Ok(void 0);
  }
  async put(url, body) {
    const { store } = (0, import_core2.getStore)(url, this.sthis, (...args) => args.join("/"));
    const rParams = url.getParamsResult("key", "name");
    if (rParams.isErr()) {
      return this.logger.Error().Url(url).Err(rParams).Msg("Put Error").ResultError();
    }
    const { key } = rParams.Ok();
    let { name } = rParams.Ok();
    const index = url.getParam("index");
    if (index) {
      name += `-${index}`;
    }
    name += ".fp";
    const remoteBaseUrl = url.getParam("remoteBaseUrl");
    if (!remoteBaseUrl) {
      return import_cement2.Result.Err(new Error("Remote base URL not found in the URI"));
    }
    const fetchUrl = import_cement2.BuildURI.from(remoteBaseUrl);
    switch (store) {
      case "meta":
        fetchUrl.setParam("meta", name);
        break;
      default:
        fetchUrl.setParam("car", key);
        break;
    }
    if (store === "meta") {
      const bodyRes = await import_core2.bs.addCryptoKeyToGatewayMetaPayload(url, this.sthis, body);
      if (bodyRes.isErr()) {
        return import_cement2.Result.Err(bodyRes.Err());
      }
      body = bodyRes.Ok();
    }
    const done = await fetch(fetchUrl.asURL(), { method: "PUT", body });
    if (!done.ok) {
      return this.logger.Error().Url(fetchUrl.URI()).Int("status", done.status).Str("statusText", done.statusText).Msg(`failed to upload ${store}`).ResultError();
    }
    return import_cement2.Result.Ok(void 0);
  }
  async get(url) {
    const { store } = (0, import_core2.getStore)(url, this.sthis, (...args) => args.join("/"));
    const rParams = url.getParamsResult("key", "name", "remoteBaseUrl");
    if (rParams.isErr()) {
      return import_cement2.Result.Err(rParams.Err());
    }
    const { key, remoteBaseUrl } = rParams.Ok();
    let { name } = rParams.Ok();
    const index = url.getParam("index");
    if (index) {
      name += `-${index}`;
    }
    name += ".fp";
    const fetchUrl = import_cement2.BuildURI.from(remoteBaseUrl);
    switch (store) {
      case "meta":
        fetchUrl.setParam("meta", name);
        break;
      default:
        fetchUrl.setParam("car", key);
        break;
    }
    const rresponse = await (0, import_cement2.exception2Result)(() => {
      return fetch(fetchUrl.URI().asURL());
    });
    if (rresponse.isErr()) {
      return this.logger.Error().Url(fetchUrl).Err(rresponse).Msg("Failed to fetch").ResultError();
    }
    const response = rresponse.Ok();
    if (!response.ok) {
      return import_cement2.Result.Err(new import_core2.NotFoundError(`${store} not found: ${url}`));
    }
    const data = new Uint8Array(await response.arrayBuffer());
    if (store === "meta") {
      const res = await import_core2.bs.setCryptoKeyFromGatewayMetaPayload(url, this.sthis, data);
      if (res.isErr()) {
        return this.logger.Error().Url(url).Err(res).Msg("Failed to set crypto key").ResultError();
      }
    }
    return import_cement2.Result.Ok(data);
  }
  async delete(url) {
    const { store } = (0, import_core2.getStore)(url, this.sthis, (...args) => args.join("/"));
    const rParams = url.getParamsResult("key", "name", "remoteBaseUrl");
    if (rParams.isErr()) {
      return import_cement2.Result.Err(rParams.Err());
    }
    const { key, remoteBaseUrl } = rParams.Ok();
    let { name } = rParams.Ok();
    const index = url.getParam("index");
    if (index) {
      name += `-${index}`;
    }
    name += ".fp";
    const fetchUrl = import_cement2.BuildURI.from(remoteBaseUrl);
    switch (store) {
      case "meta":
        fetchUrl.setParam("meta", name);
        break;
      default:
        if (!key) {
          return import_cement2.Result.Err(new Error("Key not found in the URI"));
        }
        fetchUrl.setParam("car", key);
        break;
    }
    const response = await fetch(fetchUrl.URI().asURL(), { method: "DELETE" });
    if (!response.ok) {
      return import_cement2.Result.Err(new Error(`Failed to delete car: ${response.statusText}`));
    }
    return import_cement2.Result.Ok(void 0);
  }
  async subscribe(url, callback) {
    url = url.build().setParam("key", "main").defParam("interval", "100").defParam("maxInterval", "3000").URI();
    let lastData = void 0;
    const initInterval = parseInt(url.getParam("interval") || "100", 10);
    const maxInterval = parseInt(url.getParam("maxInterval") || "3000", 10);
    let interval = initInterval;
    const fetchData = async () => {
      const result = await this.get(url);
      if (result.isOk()) {
        const data = result.Ok();
        if (!lastData || !data.every((value, index) => lastData && value === lastData[index])) {
          lastData = data;
          callback(data);
          interval = initInterval;
        } else {
          interval = Math.min(interval * 2, maxInterval);
        }
      }
      timeoutId = setTimeout(fetchData, interval);
    };
    let timeoutId = setTimeout(fetchData, interval);
    return import_cement2.Result.Ok(() => {
      clearTimeout(timeoutId);
    });
  }
};
var NetlifyTestStore = class {
  constructor(sthis, gw) {
    this.sthis = (0, import_core2.ensureSuperLog)(sthis, "NetlifyTestStore");
    this.logger = this.sthis.logger;
    this.gateway = gw;
  }
  async get(iurl, key) {
    const url = iurl.build().setParam("key", key).URI();
    const buffer = await this.gateway.get(url);
    return buffer.Ok();
  }
};
var onceRegisterNetlifyStoreProtocol = new import_cement2.KeyedResolvOnce();
function registerNetlifyStoreProtocol(protocol = "netlify:", overrideBaseURL) {
  return onceRegisterNetlifyStoreProtocol.get(protocol).once(() => {
    import_cement2.URI.protocolHasHostpart(protocol);
    return import_core2.bs.registerStoreProtocol({
      protocol,
      overrideBaseURL,
      gateway: async (sthis) => {
        return new NetlifyGateway(sthis);
      },
      test: async (sthis) => {
        const gateway = new NetlifyGateway(sthis);
        return new NetlifyTestStore(sthis, gateway);
      }
    });
  });
}

// src/netlify/index.ts
var import_cement3 = require("@adviser/cement");
if (!(0, import_cement3.runtimeFn)().isBrowser) {
  const url = import_cement3.BuildURI.from(process.env.FP_KEYBAG_URL || "file://./dist/kb-dir-netlify");
  url.setParam("extractKey", "_deprecated_internal_api");
  process.env.FP_KEYBAG_URL = url.toString();
}
registerNetlifyStoreProtocol();
var connectionCache = new import_cement3.KeyedResolvOnce();
var connect = (db, remoteDbName = "", url = "netlify://localhost:8888?protocol=ws") => {
  const { sthis, blockstore, name: dbName } = db;
  if (!dbName) {
    throw new Error("dbName is required");
  }
  const urlObj = import_cement3.BuildURI.from(url);
  const existingName = urlObj.getParam("name");
  urlObj.defParam("name", remoteDbName || existingName || dbName);
  urlObj.defParam("localName", dbName);
  urlObj.defParam("storekey", `@${dbName}:data@`);
  return connectionCache.get(urlObj.toString()).once(() => {
    makeKeyBagUrlExtractable(sthis);
    const connection = connectionFactory(sthis, urlObj);
    connection.connect_X(blockstore);
    return connection;
  });
};
//# sourceMappingURL=index.cjs.map