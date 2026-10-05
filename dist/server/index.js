// src/channels.ts
var channels = [{ id: "ambiente", name: "Ambiente Mendoza", scope: "Contaminaci\xF3n, residuos y efluentes; elegir seg\xFAn competencia.", url: "https://ticketsform.mendoza.gov.ar/ticketsform/servlet/responderformulario?PORTAL_AMBIENTE", source: "https://www.mendoza.gob.ar/energiayambiente/", reviewed: "2026-10-05", manualDelivery: true, anonymous: "Admite opci\xF3n an\xF3nima, sin seguimiento oficial en esa opci\xF3n.", officialWriteAPI: "No se encontr\xF3 una API oficial de escritura documentada; esto no acredita que no exista." }, { id: "dircas", name: "DIRCAS \xB7 agua potable y saneamiento", scope: "Agua potable y saneamiento. Requiere cuenta. No es destino autom\xE1tico para todo vertido o residuo.", url: "https://reclamos.irrigacion.gov.ar/autogestion/web/site/login", source: "https://dircas.cloud.irrigacion.gov.ar/", reviewed: "2026-10-05", manualDelivery: true, anonymous: "Requiere cuenta institucional.", officialWriteAPI: "No se encontr\xF3 una API oficial de escritura documentada; esto no acredita que no exista." }];

// src/images.ts
function imageType(b) {
  const fail = () => {
    throw new Error("Foto inv\xE1lida: usar PNG o JPEG con estructura completa.");
  };
  if (b.length < 20) return fail();
  if ([137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => b[i] === v)) {
    const d = new DataView(b.buffer, b.byteOffset, b.byteLength);
    let p = 8, ihdr = false, idat = false, end = false, palette = false, color = -1, depth = 0, afterIDAT = false;
    while (p + 12 <= b.length) {
      let n = d.getUint32(p);
      if (n > 3 * 1024 * 1024 || p + n + 12 > b.length) return fail();
      let t = String.fromCharCode(...b.slice(p + 4, p + 8));
      let crc = 4294967295;
      for (let i = p + 4; i < p + 8 + n; i++) {
        crc ^= b[i];
        for (let j = 0; j < 8; j++) crc = crc >>> 1 ^ (crc & 1 ? 3988292384 : 0);
      }
      if ((crc ^ 4294967295) >>> 0 !== d.getUint32(p + 8 + n)) return fail();
      if (!ihdr && t !== "IHDR") return fail();
      if (t === "IHDR") {
        if (ihdr || n !== 13) return fail();
        ihdr = true;
        const w = d.getUint32(p + 8), h = d.getUint32(p + 12);
        depth = b[p + 16];
        color = b[p + 17];
        const ds = { 0: [1, 2, 4, 8, 16], 2: [8, 16], 3: [1, 2, 4, 8], 4: [8, 16], 6: [8, 16] };
        if (!w || !h || w * h > 25e6 || !ds[color]?.includes(depth) || b[p + 18] || b[p + 19] || b[p + 20] > 1) return fail();
      } else if (t === "PLTE") {
        if (palette || idat || color === 0 || color === 4 || !n || n % 3 || n > 768 || color === 3 && n / 3 > 2 ** depth) return fail();
        palette = true;
      } else if (t === "IDAT") {
        if (afterIDAT || color === 3 && !palette) return fail();
        idat = true;
      } else if (t === "IEND") {
        if (n || !idat || p + 12 !== b.length) return fail();
        end = true;
      } else {
        if (idat) afterIDAT = true;
        if (t.charCodeAt(0) < 97) return fail();
      }
      p += n + 12;
    }
    if (!end || p !== b.length) return fail();
    return "image/png";
  }
  if (b[0] === 255 && b[1] === 216 && b.at(-2) === 255 && b.at(-1) === 217) {
    let p = 2, frame = false, scan = false;
    while (p < b.length - 2) {
      if (b[p++] !== 255) return fail();
      while (b[p] === 255) p++;
      let m = b[p++];
      if (m === 0 || m === 216 || m === 217) return fail();
      if (m === 1 || m >= 208 && m <= 215) continue;
      if (p + 2 > b.length) return fail();
      let n = b[p] << 8 | b[p + 1];
      if (n < 2 || p + n > b.length) return fail();
      if ([192, 193, 194].includes(m)) {
        if (n < 8 || frame) return fail();
        const h = b[p + 3] << 8 | b[p + 4], w = b[p + 5] << 8 | b[p + 6];
        if (!w || !h || w * h > 25e6) return fail();
        frame = true;
      }
      if (m === 218) {
        if (!frame || n < 6) return fail();
        scan = true;
        p += n;
        while (p < b.length - 2) {
          if (b[p] === 255) {
            if (b[p + 1] === 0 || b[p + 1] >= 208 && b[p + 1] <= 215) {
              p += 2;
              continue;
            }
            break;
          }
          p++;
        }
        continue;
      }
      p += n;
    }
    if (frame && scan && p === b.length - 2) return "image/jpeg";
  }
  return fail();
}

// src/worker.ts
var Fault = class extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
  status;
};
var json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer" } });
var hash = async (s) => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", typeof s === "string" ? new TextEncoder().encode(s) : s))).map((x) => x.toString(16).padStart(2, "0")).join("");
var secret = () => Array.from(crypto.getRandomValues(new Uint8Array(32))).map((x) => x.toString(16).padStart(2, "0")).join("");
var bearer = (r) => r.headers.get("authorization")?.match(/^Bearer ([a-f0-9]{64})$/)?.[1];
async function body(r, max = 16e3) {
  const bytes = await bounded(r, max);
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new Fault(400, "JSON inv\xE1lido");
  }
}
async function bounded(r, max) {
  if (Number(r.headers.get("content-length")) > max) throw new Fault(413, "Archivo o solicitud demasiado grande");
  const reader = r.body?.getReader();
  if (!reader) throw new Fault(400, "Falta contenido");
  let n = 0, chunks = [];
  while (true) {
    const v = await reader.read();
    if (v.done) break;
    n += v.value.length;
    if (n > max) {
      await reader.cancel();
      throw new Fault(413, "Archivo o solicitud demasiado grande");
    }
    chunks.push(v.value);
  }
  let b = new Uint8Array(n), p = 0;
  for (const c of chunks) {
    b.set(c, p);
    p += c.length;
  }
  return b;
}
function clean(x, max) {
  if (typeof x !== "string" || !x.trim() || x.length > max) throw new Fault(400, "Campo requerido o demasiado largo");
  return x.trim();
}
function input(x) {
  const place = clean(x.place, 240), department = clean(x.department, 80), description = clean(x.description, 4e3), occurredAt = clean(x.occurredAt, 40);
  if (!/^\d{4}-\d\d-\d\dT/.test(occurredAt) || !Number.isFinite(Date.parse(occurredAt))) throw new Fault(400, "Fecha inv\xE1lida");
  let location = null;
  if (x.location) {
    const { latitude, longitude, accuracy } = x.location;
    if (![latitude, longitude, accuracy].every(Number.isFinite) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180 || accuracy < 0 || accuracy > 1e5) throw new Fault(400, "Ubicaci\xF3n inv\xE1lida");
    location = { latitude, longitude, accuracy };
  }
  return { place, department, description, occurredAt, location };
}
async function rate(e, key, max) {
  const r = await e.DB.prepare("INSERT INTO limits(key,count) VALUES(?,1) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count").bind(key).first();
  if (!r || r.count > max) throw new Fault(429, "L\xEDmite temporal alcanzado. Intent\xE1 m\xE1s tarde.");
}
async function own(r, e, id) {
  const row = await e.DB.prepare("SELECT * FROM notices WHERE id=?").bind(id).first();
  const t = bearer(r), identity = e.TRUST_SITES_IDENTITY === "sites-dispatcher" ? r.headers.get("oai-authenticated-user-id") : null;
  if (!row || !(t && await hash(t) === row.secret || identity && identity === row.owner)) throw new Fault(404, "Aviso no disponible con esta credencial");
  return row;
}
async function view(e, row) {
  const { results } = await e.DB.prepare("SELECT id,hash,type,bytes FROM evidence WHERE notice=?").bind(row.id).all();
  return { id: row.id, created: row.created, ...JSON.parse(row.data), status: row.reference ? "constancia_aportada" : row.prepared ? "preparado" : "registrado", prepared: row.prepared ? JSON.parse(row.prepared) : null, reference: row.reference ? JSON.parse(row.reference) : null, evidence: results, officialReceipt: false };
}
async function operate(name, a, r, e, mcp = false) {
  if (name === "channels") return channels;
  if (name === "context_search") {
    const query = clean(a.query, 240);
    const count = await e.DB.prepare("SELECT COUNT(*) AS count FROM documents").first();
    const { results } = await e.DB.prepare("SELECT id,metadata,text FROM documents WHERE instr(lower(text),lower(?))>0 LIMIT 20").bind(query).all();
    return { documents: results.map((d) => ({ id: d.id, citation: JSON.parse(d.metadata), excerpt: d.text.slice(0, 1200) })), approvedDocuments: count?.count ?? 0, message: count?.count ? "Coincidencias documentales; no acreditan responsabilidad ni probabilidad." : "Sin antecedentes publicados. El piloto interno no integra esta proyecci\xF3n p\xFAblica." };
  }
  const owner = e.TRUST_SITES_IDENTITY === "sites-dispatcher" ? r.headers.get("oai-authenticated-user-id") : null;
  if (mcp && !owner) throw new Fault(401, "Se requiere identidad gestionada por Sites para herramientas con datos privados");
  if (name === "create_notice") {
    const data = input(a), t = a.credential ?? (mcp ? secret() : null);
    if (!/^[a-f0-9]{64}$/.test(t ?? "")) throw new Fault(400, "Se requiere credencial aleatoria de 32 bytes");
    const session = mcp ? await hash("owner:" + owner) : bearer(r) ? await hash(bearer(r)) : "";
    if (!mcp) {
      const s = await e.DB.prepare("SELECT * FROM sessions WHERE hash=? AND expires>?").bind(session, Date.now()).first();
      if (!s) throw new Fault(401, "Sesi\xF3n inv\xE1lida o vencida");
    }
    const key = clean(a.idempotencyKey, 100), idem = await hash(session + ":" + key), digest = await hash(JSON.stringify(data) + await hash(t));
    const previous = await e.DB.prepare("SELECT * FROM notices WHERE idem=?").bind(idem).first();
    if (previous) {
      if (previous.digest !== digest) throw new Fault(409, "Clave de idempotencia usada con otro contenido");
      return { notice: await view(e, previous), credential: t, replayed: true };
    }
    await rate(e, "create:" + session + ":" + Math.floor(Date.now() / 36e5), 5);
    const id = crypto.randomUUID(), created = (/* @__PURE__ */ new Date()).toISOString();
    await e.DB.prepare("INSERT OR IGNORE INTO notices(id,secret,owner,session,idem,digest,data,created) VALUES(?,?,?,?,?,?,?,?)").bind(id, await hash(t), owner ?? null, session, idem, digest, JSON.stringify(data), created).run();
    const row2 = await e.DB.prepare("SELECT * FROM notices WHERE idem=?").bind(idem).first();
    if (row2.digest !== digest) throw new Fault(409, "Conflicto de idempotencia");
    return { notice: await view(e, row2), credential: t };
  }
  const row = await own(r, e, clean(a.id, 60));
  if (name === "read_notice") return view(e, row);
  if (name === "prepare_referral") {
    const channel = channels.find((c) => c.id === a.channelId);
    if (!channel) throw new Fault(400, "Eleg\xED un canal del cat\xE1logo");
    const d = JSON.parse(row.data);
    const prepared = { channelId: channel.id, url: channel.url, at: (/* @__PURE__ */ new Date()).toISOString(), text: `Observaci\xF3n ambiental
Lugar: ${d.place}, ${d.department}, Mendoza
Fecha del hecho declarada: ${d.occurredAt}
${d.description}
Comprobante interno: ${row.id}
No acredita recepci\xF3n oficial.`, delivery: "manual", sent: false };
    await e.DB.prepare("UPDATE notices SET prepared=? WHERE id=?").bind(JSON.stringify(prepared), row.id).run();
    return prepared;
  }
  if (name === "add_receipt") {
    const reference = { reference: clean(a.reference, 500), at: (/* @__PURE__ */ new Date()).toISOString(), declaredByUser: true, institutionallyVerified: false };
    await e.DB.prepare("UPDATE notices SET reference=? WHERE id=?").bind(JSON.stringify(reference), row.id).run();
    return reference;
  }
  if (name === "add_evidence") {
    let bytes;
    if (mcp) {
      const b64 = clean(a.base64, 4194304);
      try {
        bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      } catch {
        throw new Fault(400, "Base64 inv\xE1lido");
      }
    } else bytes = await bounded(r, 3145728);
    if (bytes.length > 3145728) throw new Fault(413, "M\xE1ximo 3 MiB");
    let type;
    try {
      type = imageType(bytes);
    } catch (err) {
      throw new Fault(400, err.message);
    }
    if (!mcp && r.headers.get("content-type") !== type) throw new Fault(400, "Tipo declarado incompatible");
    const reserved = await e.DB.prepare("UPDATE notices SET attachments=attachments+1 WHERE id=? AND attachments<3 RETURNING id").bind(row.id).first();
    if (!reserved) throw new Fault(409, "M\xE1ximo tres fotos por aviso");
    const id = crypto.randomUUID(), digest = await hash(bytes);
    try {
      await e.EVIDENCE.put(id, bytes, { httpMetadata: { contentType: type } });
      await e.DB.prepare("INSERT INTO evidence(id,notice,hash,type,bytes) VALUES(?,?,?,?,?)").bind(id, row.id, digest, type, bytes.length).run();
    } catch {
      await e.EVIDENCE.delete(id);
      await e.DB.prepare("UPDATE notices SET attachments=attachments-1 WHERE id=?").bind(row.id).run();
      throw new Fault(503, "No se pudo guardar la foto. Intent\xE1 nuevamente.");
    }
    return { id, hash: digest, type, bytes: bytes.length };
  }
  throw new Fault(404, "Operaci\xF3n no disponible");
}
var schemas = { channels: {}, context_search: { query: { type: "string" } }, create_notice: { place: { type: "string" }, department: { type: "string" }, description: { type: "string" }, occurredAt: { type: "string" }, location: { type: "object", properties: { latitude: { type: "number" }, longitude: { type: "number" }, accuracy: { type: "number" } }, required: ["latitude", "longitude", "accuracy"] }, credential: { type: "string" }, idempotencyKey: { type: "string" } }, read_notice: { id: { type: "string" } }, add_evidence: { id: { type: "string" }, base64: { type: "string" } }, prepare_referral: { id: { type: "string" }, channelId: { type: "string" } }, add_receipt: { id: { type: "string" }, reference: { type: "string" } } };
var required = { channels: [], context_search: ["query"], create_notice: ["place", "department", "description", "occurredAt", "idempotencyKey"], read_notice: ["id"], add_evidence: ["id", "base64"], prepare_referral: ["id", "channelId"], add_receipt: ["id", "reference"] };
async function fetchHandler(r, e) {
  try {
    const u = new URL(r.url), p = u.pathname;
    if (r.method !== "GET" && r.method !== "HEAD") {
      const origin = r.headers.get("origin");
      if (origin && origin !== u.origin) throw new Fault(403, "Origen no autorizado");
      if (r.headers.get("sec-fetch-site") === "cross-site") throw new Fault(403, "Origen no autorizado");
      if (p !== "/mcp" && r.headers.get("x-avisos-client") !== "1") throw new Fault(403, "Falta cabecera de protecci\xF3n");
    }
    if (p === "/api/v1/session" && r.method === "POST") {
      const ip = r.headers.get("cf-connecting-ip");
      await rate(e, "session:" + await hash(ip ?? "unknown") + ":" + Math.floor(Date.now() / 36e5), 30);
      const token = secret();
      await e.DB.prepare("INSERT INTO sessions(hash,expires) VALUES(?,?)").bind(await hash(token), Date.now() + 36e5).run();
      return json({ credential: token, expiresIn: 3600 }, 201);
    }
    if (p === "/api/v1/channels" && r.method === "GET") return json(channels);
    if (p === "/api/v1/context/search" && r.method === "GET") return json(await operate("context_search", { query: u.searchParams.get("q") }, r, e));
    if (p === "/api/v1/notices" && r.method === "POST") return json(await operate("create_notice", await body(r), r, e), 201);
    const match = p.match(/^\/api\/v1\/notices\/([^/]+)(?:\/(evidence|referral|receipt)(?:\/([^/]+))?)?$/);
    if (match) {
      const [, id, action, attachment] = match;
      if (!action && r.method === "GET") return json(await operate("read_notice", { id }, r, e));
      if (action === "evidence" && attachment && r.method === "GET") {
        await own(r, e, id);
        const row = await e.DB.prepare("SELECT * FROM evidence WHERE id=? AND notice=?").bind(attachment, id).first();
        if (!row) throw new Fault(404, "Foto no disponible");
        const object = await e.EVIDENCE.get(attachment);
        if (!object) throw new Fault(404, "Foto no disponible");
        return new Response(object.body, { headers: { "Content-Type": row.type, "Cache-Control": "no-store", "Content-Disposition": "attachment", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer" } });
      }
      if (r.method === "POST" && !attachment) {
        if (action === "evidence") return json(await operate("add_evidence", { id }, r, e), 201);
        if (action === "referral" || action === "receipt") return json(await operate(action === "referral" ? "prepare_referral" : "add_receipt", { ...await body(r), id }, r, e));
      }
    }
    if (p === "/mcp" && r.method === "POST") {
      const b = await body(r, 425e4);
      if (b.jsonrpc !== "2.0") throw new Fault(400, "JSON-RPC inv\xE1lido");
      if (b.method === "notifications/initialized") return new Response(null, { status: 202 });
      let result;
      if (b.method === "initialize") result = { protocolVersion: "2025-03-26", capabilities: { tools: {} }, serverInfo: { name: "avisos-abiertos", version: "1.0.0" } };
      else if (b.method === "ping") result = {};
      else if (b.method === "tools/list") result = { tools: Object.entries(schemas).map(([name, properties]) => ({ name, description: name === "context_search" ? "Buscar proyecci\xF3n documental publicable; actualmente vac\xEDa." : name, inputSchema: { type: "object", properties, required: required[name] }, annotations: { readOnlyHint: ["channels", "context_search", "read_notice"].includes(name), destructiveHint: false, openWorldHint: false } })) };
      else if (b.method === "tools/call") {
        if (!schemas[b.params?.name]) return json({ jsonrpc: "2.0", id: b.id, error: { code: -32601, message: "Herramienta desconocida" } });
        try {
          const value = await operate(b.params.name, b.params.arguments ?? {}, r, e, true);
          result = { content: [{ type: "text", text: JSON.stringify(value) }], isError: false };
        } catch (err) {
          if (err instanceof Fault && (err.status === 401 || err.status === 404)) throw err;
          result = { content: [{ type: "text", text: err.message }], isError: true };
        }
      } else return json({ jsonrpc: "2.0", id: b.id, error: { code: -32601, message: "M\xE9todo desconocido" } });
      return json({ jsonrpc: "2.0", id: b.id, result });
    }
    if (p === "/api/v1/openapi.json") return e.ASSETS ? e.ASSETS.fetch(new Request(new URL("/openapi.json", u))) : json({ error: "Build incompleto" }, 503);
    if (p.startsWith("/api/") || p === "/mcp") throw new Fault(404, "Ruta o m\xE9todo no disponible");
    const response = e.ASSETS ? await e.ASSETS.fetch(r) : new Response("Activos no configurados", { status: 503 });
    const headers = new Headers(response.headers);
    headers.set("Referrer-Policy", "no-referrer");
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' blob:; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
    return new Response(response.body, { status: response.status, headers });
  } catch (err) {
    return json({ error: err instanceof Fault ? err.message : "Servicio temporalmente no disponible; conserv\xE1 los datos e intent\xE1 nuevamente" }, err instanceof Fault ? err.status : 503);
  }
}
var worker_default = { fetch: fetchHandler };
export {
  worker_default as default,
  hash
};
