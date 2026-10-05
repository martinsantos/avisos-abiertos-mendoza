# Avisos Abiertos · Última Milla

Infraestructura abierta para registrar avisos ambientales del territorio,
consultar antecedentes publicados y preparar su derivación a canales
institucionales. Primera jurisdicción: Mendoza, Argentina.

Una iniciativa de [Última Milla S.A.](https://www.ultimamilla.com.ar/).
Código bajo licencia MIT. C3/SITREP será uno de sus consumidores; el servicio
también debe poder ser utilizado por personas, municipios y otras aplicaciones.

**Estado: preparación del MVP en Cloud.** Este repositorio inicial contiene el
alcance y la licencia. Aún no hay una API pública desplegada ni dominio activado.
El código ejecutable, pruebas, migraciones y guía de despliegue se incorporarán
desde la entrega Cloud revisada. No se anuncia una fecha de disponibilidad.

## Primera entrega

- UI móvil mínima: lugar o ubicación elegida, observación, fecha y foto opcional.
- Registro persistente, comprobante interno y consulta del seguimiento con
  permisos sobre el aviso y sus adjuntos.
- API REST versionada, documentación OpenAPI y ejemplos para aplicaciones.
- Endpoint MCP remoto para conectar herramientas y asistentes al mismo contrato.
- Catálogo de canales ambientales de Mendoza, preparación de una derivación y
  registro de una constancia institucional aportada.
- Ingesta incremental de documentos públicos con fuente, hash, cobertura,
  localizador y fechas diferenciadas; consulta de antecedentes con citas.

El registro de un aviso aquí genera un comprobante del servicio. La recepción
por un organismo se acredita por su constancia correspondiente. Los antecedentes
aportan contexto y comprobaciones; una coincidencia de nombre o lugar no
acredita responsabilidad por un hecho actual.

## Acceso y reutilización

El servicio apunta a acceso gratuito, código reutilizable y autoalojamiento.
El flujo básico no exige un servicio de IA pago. La documentación de despliegue
deberá declarar recursos, límites y requisitos reales de cada integración.

Los avisos, contactos y fotos tienen permisos propios. El código abierto y el
catálogo público no convierten los expedientes internos ni las evidencias de
usuarios en datos abiertos. Una publicación documental será una selección
revisada, con procedencia y condiciones de reutilización explícitas.

## Dirección propuesta

`avisos.ultimamilla.com.ar`, con la UI en `/`, REST bajo `/api/v1` y MCP en `/mcp`.
Es una propuesta de dirección: todavía no está configurada ni sirve endpoints.
El servicio llevará la marca Última Milla y se enlazará desde la web de la
empresa cuando tenga una URL operativa.

## Licencia

[MIT](LICENSE), copyright 2026 Última Milla S.A. Las dependencias conservan sus
licencias y avisos; los documentos de terceros conservan su procedencia y
condiciones. Esta licencia de código no otorga derechos sobre datos ajenos.
