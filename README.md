# Avisos Abiertos · Última Milla

MVP público bajo MIT, preparado en VM para Sites y autoalojamiento. **Build listo para revisión; Site y DNS no publicados por esta entrega.** Iniciativa https://www.ultimamilla.com.ar/.

UI móvil en `/`; REST `/api/v1`; OpenAPI `/api/v1/openapi.json`; MCP stateless `POST /mcp`. D1 guarda avisos y hashes de credenciales; R2 guarda fotos privadas. No hay feed global ni importación del piloto C3. No requiere IA ni servicios pagos para el flujo básico; el hosting sí requiere disponibilidad y cuotas de D1/R2/Workers.

## Ejecutar en una VM

Node 22+; `npm ci`, `npm run typecheck`, `npm run build`, `npm test`. Build ESM `dist/server/index.js` exporta `default.fetch`. Activos `dist/client`. Esquema `db/schema.ts`; migraciones Drizzle `drizzle/`, schema-only, inspeccionadas. `npm run db:generate` solo cuando cambie el esquema. No cambiar migraciones aplicadas.

Para Cloudflare propio: instalar Wrangler, crear una base D1 y un bucket R2 **privado**, configurar `DB`, `EVIDENCE` y assets `ASSETS` con directorio `dist/client`, `main=dist/server/index.js`, fecha de compatibilidad 2026-08-06. Aplicar cada archivo SQL antes del Worker; `wrangler d1 migrations apply` requiere configurar `migrations_dir="drizzle"`. En Sites el helper oficial administra recursos; `.openai/hosting.json` contiene solo bindings lógicos y el Site autorizado. El padre coordina helper, publicación y DNS. No usar el manifiesto de C3.

Por defecto `TRUST_SITES_IDENTITY` está ausente y las cabeceras de identidad se ignoran. El padre debe configurar el valor `sites-dispatcher` exclusivamente en el entorno protegido Sites antes de habilitar herramientas MCP privadas. Autoalojamiento no debe confiar en cabeceras `oai-authenticated-user-*` enviadas por Internet: eliminarlas en el proxy salvo identidad verificada por un gateway confiable. REST funciona con credenciales propias sin OAuth. MCP con datos privados necesita identidad de gateway confiable; sin Sites no se anuncia integración OAuth operativa.

## REST sin cuenta ChatGPT

Todos los POST llevan `X-Avisos-Client: 1`; browser: mismo origen. No hay CORS abierto. JSON como máximo 16.000 bytes. Pedir sesión `POST /api/v1/session`; devuelve una credencial aleatoria de 32 bytes, válida una hora, almacenada como SHA-256. Crear con Bearer de sesión, una **nueva credencial aleatoria por aviso** y clave de idempotencia. Guardar ambas antes del intento permite repetir sin pérdida. El hash de entrada incluye credencial; misma clave con otro contenido devuelve 409. La clave está aislada por sesión y nunca permite recuperar avisos de otra sesión.

```bash
BASE=https://tu-host
SESSION=$(curl -s -X POST "$BASE/api/v1/session" -H 'X-Avisos-Client: 1' -d '{}' | jq -r .credential)
TOKEN=$(openssl rand -hex 32)
# Crear el JSON sin incluir tokens en URLs. Estas variables solo viven en tu terminal.
jq -n --arg credential "$TOKEN" '{place:"Lugar de prueba",department:"Maipú",description:"Observación de prueba",occurredAt:"2026-10-05T12:00:00-03:00",credential:$credential,idempotencyKey:"ejemplo-1"}' > aviso.json
curl -s -X POST "$BASE/api/v1/notices" -H 'X-Avisos-Client: 1' -H "Authorization: Bearer $SESSION" -H 'Content-Type: application/json' --data-binary @aviso.json
# Usar el id devuelto y el TOKEN del aviso, nunca el de sesión:
curl -s "$BASE/api/v1/notices/ID" -H "Authorization: Bearer $TOKEN"
curl -s -X POST "$BASE/api/v1/notices/ID/evidence" -H 'X-Avisos-Client: 1' -H "Authorization: Bearer $TOKEN" -H 'Content-Type: image/png' --data-binary @foto.png
rm aviso.json
```

El archivo temporal contiene la credencial: no subirlo a repositorios. En producción, los clientes y proxies deben evitar registrar Authorization/cuerpos; no hay analytics ni logs de credenciales en la aplicación. Seguimiento UI por fragmento `/#ID:TOKEN`, limpiado inmediatamente y guardado en almacenamiento del dispositivo. El fragmento no viaja al servidor. Solo se guarda allí la credencial: datos y fotos siguen en D1/R2. Este dispositivo puede recuperar el aviso; otro necesita credencial/enlace. Pérdida de credencial de aviso anónimo no tiene recuperación administrativa en este MVP.

Límites: 30 sesiones por IP/hora (si no hay IP de gateway, cupo compartido); 5 creaciones por sesión o identidad/hora; 3 fotos por aviso; 3 MiB por foto; 25 millones de píxeles declarados por foto. JSON MCP máximo 4.250.000 bytes para base64. Cuotas de hosting pueden ser inferiores. No hay captcha ni defensa distribuida frente a múltiples IP; monitorear consumo antes de ampliar audiencia. Los contadores son persistentes y atómicos; configurar mantenimiento periódico para eliminar sesiones vencidas y contadores de ventanas antiguas. No hay borrado ni retención automática de avisos en esta versión; definir política antes de uso sostenido.

Fotos: verifica firma, tamaño y estructura acotada, dimensiones y SHA-256; PNG valida CRC, IHDR, orden, IEND y PLTE consistente obligatorio para indexados; JPEG valida marcadores, segmentos, frame, scan y cierre. **No decodifica exhaustivamente ni inspecciona contenido/malware ni elimina EXIF**. Rechaza GIF/WebP/SVG. Fotos se descargan como adjunto con permisos del aviso y `no-store`, sin URLs R2 públicas. El browser mantiene el formulario ante errores; si falló una foto después de crear, informa registro exitoso y permite reintentar el adjunto.

## MCP y permisos

Discovery `initialize`, `ping`, `tools/list` sin datos privados. Operaciones `channels`, `context_search`, `create_notice`, `read_notice`, `add_evidence`, `prepare_referral`, `add_receipt` comparten el servicio REST. Creación requiere identidad Sites; lectura/modificación requiere además propiedad del aviso o su credencial Bearer. No hay listar avisos. Bypass no genera identidad. En MCP se puede omitir credencial en creación: se devuelve una aleatoria una sola vez; para reintento idempotente proporcionar la misma credencial desde el inicio. Las fotos MCP son base64 y privadas. La identidad no puede apropiarse de avisos anónimos por conocer su id.

Sites administra OAuth y la conexión de su plugin. Clientes externos solo son compatibles cuando completan el OAuth soportado por Sites y el gateway entrega identidad; **conexión externa y OAuth extremo a extremo aún no comprobados en esta entrega sin publicar**. No se implementa OAuth propio. REST curl con credenciales por objeto sí está implementado y probado en VM. La cabecera de identidad en pruebas simula la frontera confiable, no acredita una conexión real de cliente.

## Derivación manual y constancias

Catálogo revisado el 2026-10-05: Ambiente Mendoza desde https://www.mendoza.gob.ar/energiayambiente/ a https://ticketsform.mendoza.gov.ar/ticketsform/servlet/responderformulario?PORTAL_AMBIENTE (opción anónima sin seguimiento oficial); DIRCAS desde https://dircas.cloud.irrigacion.gov.ar/ a https://reclamos.irrigacion.gov.ar/autogestion/web/site/login (cuenta requerida; agua potable/saneamiento). La persona elige competencia; no se deriva automáticamente por palabras clave. No se encontraron APIs oficiales de escritura documentadas, lo cual no prueba que no existan.

`registrado`: guardado interno. `preparado`: texto creado y enlace disponible, sin envío. `constancia_aportada`: referencia declarada por usuario, sin verificación institucional. Ninguna ruta envía mensajes ni llama a organismos. Las pruebas usan información sintética.

## Proyección documental publicable

Hoy hay **cero documentos aprobados**. La búsqueda responde sin antecedentes; no importa los 99 pasajes ni los 100 activos privados ni providers C3. Contrato `src/documents.ts`: URL HTTPS, hash de fuente, fechas de decisión/publicación/hecho separadas y anulables, cobertura, localizador, rol territorial y revisión aprobada con condiciones de reutilización. `reviewBatch` genera recibo de lote con IDs; el responsable debe comprobar el hash contra la fuente y conservar recibo antes de insertar documentos revisados en la tabla pública mediante herramienta administrativa offline. No hay endpoint de ingesta ni aprobación pública. La búsqueda solo lee esa tabla, devuelve citas y máximo 20 coincidencias textuales; no hay vectores, correlaciones, culpables ni probabilidades. El contrato está preparado, no se presenta como pipeline editorial automático.

## Entrega

`delivery/receipt.json`, lista de SHA-256 y archivo comprimido de fuente/build. Los hashes finales del paquete se calculan después de comprimir; no incluir el paquete dentro de sí mismo. Dependencias de desarrollo no se empaquetan; `package-lock.json` permite reproducir. LICENSE del proyecto MIT; dependencias conservan sus licencias en npm.

WebMCP complementario: feature-detect `document.modelContext?.registerTool`, herramientas para crear el aviso visible, leer el comprobante y preparar derivación, registradas una vez con AbortSignal. Reutiliza API/credenciales y actualiza la pantalla antes del JSON de resultado. No autentica ni reemplaza `/mcp`. API browser experimental; no comprobado en un navegador compatible en esta VM. UI y GPS opt-in requieren revisión visual final; pruebas de integración se ejecutaron en workerd/Miniflare con D1 y R2 persistentes locales, no sobre recursos reales Sites aún sin publicar.
