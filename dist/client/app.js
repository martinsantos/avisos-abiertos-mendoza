// src/client.ts
var $ = (id) => document.getElementById(id);
var random = () => Array.from(crypto.getRandomValues(new Uint8Array(32))).map((x) => x.toString(16).padStart(2, "0")).join("");
var current;
var location = null;
var session = null;
var draftSecret = random();
var idem = crypto.randomUUID();
var departments = ["Capital", "General Alvear", "Godoy Cruz", "Guaymall\xE9n", "Jun\xEDn", "La Paz", "Las Heras", "Lavalle", "Luj\xE1n de Cuyo", "Maip\xFA", "Malarg\xFCe", "Rivadavia", "San Carlos", "San Mart\xEDn", "San Rafael", "Santa Rosa", "Tunuy\xE1n", "Tupungato"];
for (const d of departments) $("form").department.add(new Option(d, d));
var now = /* @__PURE__ */ new Date();
$("form").occurredAt.value = new Date(now.getTime() - now.getTimezoneOffset() * 6e4).toISOString().slice(0, 16);
async function api(path, { token, method = "GET", data, bytes, type } = {}) {
  const headers = {};
  if (method !== "GET") headers["X-Avisos-Client"] = "1";
  if (token) headers.Authorization = "Bearer " + token;
  if (data) headers["Content-Type"] = "application/json";
  if (bytes) headers["Content-Type"] = type;
  const r = await fetch("/api/v1" + path, { method, headers, body: bytes ?? (data ? JSON.stringify(data) : void 0), cache: "no-store" });
  const v = await r.json();
  if (!r.ok) throw Error(v.error ?? "No se pudo completar");
  return v;
}
function run(fn) {
  return async (e) => {
    e?.preventDefault();
    $("message").textContent = "";
    const b = e?.currentTarget;
    if (b?.tagName === "BUTTON") b.disabled = true;
    try {
      await fn();
    } catch (err) {
      $("message").textContent = err.message;
    } finally {
      if (b?.tagName === "BUTTON") b.disabled = false;
    }
  };
}
async function attach(file) {
  if (!file) return;
  if (file.size > 3145728) throw Error("Foto demasiado grande: m\xE1ximo 3 MiB.");
  await api("/notices/" + current.id + "/evidence", { method: "POST", token: current.token, bytes: file, type: file.type });
}
async function reload() {
  const v = await api("/notices/" + current.id, { token: current.token });
  $("notice").hidden = false;
  $("credential").value = current.token;
  $("detail").textContent = `${v.id}
Estado: ${v.status.replaceAll("_", " ")}
Registrado: ${new Date(v.created).toLocaleString("es-AR")}
${v.place}, ${v.department}
${v.description}`;
  $("evidence").replaceChildren();
  for (const a of v.evidence) {
    const b = document.createElement("button");
    b.textContent = "Descargar foto " + a.id.slice(0, 8);
    b.className = "secondary";
    b.onclick = run(async () => {
      const r = await fetch(`/api/v1/notices/${current.id}/evidence/${a.id}`, { headers: { Authorization: "Bearer " + current.token } });
      if (!r.ok) throw Error("Foto no disponible");
      const url = URL.createObjectURL(await r.blob()), link = document.createElement("a");
      link.href = url;
      link.download = a.id + (a.type === "image/png" ? ".png" : ".jpg");
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1e3);
    });
    $("evidence").append(b);
  }
  $("prepared").hidden = !v.prepared;
  $("prepared").value = v.prepared?.text ?? "";
  $("open").hidden = !v.prepared;
  if (v.prepared) $("open").href = v.prepared.url;
  else $("open").removeAttribute("href");
  $("reference").value = v.reference?.reference ?? "";
}
$("gps").onclick = run(async () => {
  if (!navigator.geolocation) throw Error("GPS no disponible");
  location = await new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition((p) => resolve({ latitude: p.coords.latitude, longitude: p.coords.longitude, accuracy: p.coords.accuracy }), () => reject(Error("No se pudo obtener la ubicaci\xF3n. Pod\xE9s escribir el lugar.")), { enableHighAccuracy: true, timeout: 15e3 }));
  $("precision").textContent = `Ubicaci\xF3n elegida: ${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)} \xB7 precisi\xF3n aproximada ${Math.round(location.accuracy)} m`;
  $("form").place.value ||= `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`;
});
$("form").onsubmit = run(async () => {
  const button = $("submit");
  button.disabled = true;
  try {
    if (!session) session = (await api("/session", { method: "POST", data: {} })).credential;
    const f = $("form");
    const result = await api("/notices", { method: "POST", token: session, data: { place: f.place.value, department: f.department.value, description: f.description.value, occurredAt: new Date(f.occurredAt.value).toISOString(), location, credential: draftSecret, idempotencyKey: idem } });
    current = { id: result.notice.id, token: result.credential };
    localStorage.setItem("avisos-current", JSON.stringify(current));
    await reload();
    try {
      await attach($("photo").files[0]);
      await reload();
      $("message").textContent = "Aviso registrado. No fue enviado al organismo.";
    } catch (err) {
      $("message").textContent = "Aviso registrado; foto pendiente: " + err.message;
    }
    $("notice").scrollIntoView({ behavior: "smooth" });
  } finally {
    button.disabled = false;
  }
});
$("reload").onclick = run(reload);
$("show").onclick = () => {
  $("credential").type = $("credential").type === "password" ? "text" : "password";
};
$("copy").onclick = run(async () => {
  await navigator.clipboard.writeText(locationOrigin() + "/#" + current.id + ":" + current.token);
  $("message").textContent = "Enlace privado copiado.";
});
function locationOrigin() {
  return window.location.origin;
}
$("attach").onclick = run(async () => {
  if (!$("extra").files[0]) throw Error("Eleg\xED una foto");
  await attach($("extra").files[0]);
  await reload();
});
$("prepare").onclick = run(async () => {
  await api("/notices/" + current.id + "/referral", { method: "POST", token: current.token, data: { channelId: $("channel").value } });
  await reload();
});
$("receipt").onclick = run(async () => {
  await api("/notices/" + current.id + "/receipt", { method: "POST", token: current.token, data: { reference: $("reference").value } });
  await reload();
});
(async () => {
  try {
    const channels = await api("/channels");
    for (const c of channels) $("channel").add(new Option(c.name, c.id));
    $("channel").onchange = () => {
      $("scope").textContent = channels.find((c) => c.id === $("channel").value).scope + " " + channels.find((c) => c.id === $("channel").value).anonymous;
    };
    $("channel").onchange();
    if (window.location.hash) {
      const [id, token] = window.location.hash.slice(1).split(":");
      history.replaceState(null, "", window.location.pathname);
      if (/^[a-f0-9-]{36}$/.test(id) && /^[a-f0-9]{64}$/.test(token)) {
        current = { id, token };
        localStorage.setItem("avisos-current", JSON.stringify(current));
      }
    } else {
      try {
        current = JSON.parse(localStorage.getItem("avisos-current") ?? "null");
      } catch {
      }
    }
    if (current) await reload();
  } catch (err) {
    $("message").textContent = err.message;
  }
})();
$("new").onclick = () => {
  draftSecret = random();
  idem = crypto.randomUUID();
  $("form").reset();
  const now2 = /* @__PURE__ */ new Date();
  $("form").occurredAt.value = new Date(now2.getTime() - now2.getTimezoneOffset() * 6e4).toISOString().slice(0, 16);
  $("prepared").hidden = true;
  $("prepared").value = "";
  $("open").hidden = true;
  $("open").removeAttribute("href");
  $("reference").value = "";
  $("detail").textContent = "";
  $("credential").value = "";
  $("credential").type = "password";
  $("evidence").replaceChildren();
  location = null;
  $("precision").textContent = "La ubicaci\xF3n se consulta solo si la autoriz\xE1s.";
  current = null;
  localStorage.removeItem("avisos-current");
  $("notice").hidden = true;
  $("message").textContent = "Guard\xE1 el enlace del aviso anterior antes de registrar otro.";
  $("form").scrollIntoView();
};
if (document.modelContext?.registerTool) {
  const controller = new AbortController();
  const register = (name, description, properties, required, execute) => document.modelContext.registerTool({ name, description, inputSchema: { type: "object", properties, required }, execute: async (args) => {
    try {
      const result = await execute(args);
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    } catch (err) {
      $("message").textContent = err.message;
      return { content: [{ type: "text", text: JSON.stringify({ error: err.message }) }], isError: true };
    }
  } }, { signal: controller.signal });
  register("crear_aviso_visible", "Completar y guardar el formulario visible; no env\xEDa al organismo", { place: { type: "string" }, department: { type: "string" }, description: { type: "string" }, occurredAt: { type: "string" } }, ["place", "department", "description", "occurredAt"], async (a) => {
    const f = $("form");
    for (const k of ["place", "department", "description", "occurredAt"]) f.elements[k].value = a[k];
    if (!f.reportValidity()) throw Error("Revis\xE1 los campos del formulario");
    if (!session) session = (await api("/session", { method: "POST", data: {} })).credential;
    const v = await api("/notices", { method: "POST", token: session, data: { place: f.place.value, department: f.department.value, description: f.description.value, occurredAt: new Date(f.occurredAt.value).toISOString(), location, credential: draftSecret, idempotencyKey: idem } });
    current = { id: v.notice.id, token: v.credential };
    localStorage.setItem("avisos-current", JSON.stringify(current));
    await reload();
    return { id: current.id, status: "registrado", officialReceipt: false };
  });
  register("leer_comprobante_visible", "Actualizar el aviso que est\xE1 abierto en este dispositivo", {}, [], async () => {
    if (!current) throw Error("No hay aviso abierto");
    await reload();
    return await api("/notices/" + current.id, { token: current.token });
  });
  register("preparar_derivacion_visible", "Preparar texto del aviso abierto para el canal elegido; no enviar", { channelId: { type: "string", enum: ["ambiente", "dircas"] } }, ["channelId"], async (a) => {
    if (!current) throw Error("No hay aviso abierto");
    $("channel").value = a.channelId;
    const v = await api("/notices/" + current.id + "/referral", { method: "POST", token: current.token, data: { channelId: a.channelId } });
    await reload();
    return v;
  });
  window.addEventListener("pagehide", () => controller.abort(), { once: true });
}
