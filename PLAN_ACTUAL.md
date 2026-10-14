# Vista móvil, edición lateral, perfiles, Descubrir y licencia

> **Estado:** EN CURSO

## Objetivo

Mejorar la web y abrirla a más usuarios sin subidas de contenido ajeno: filas de 3 cartas en móvil y vista de lista, edición junto al detalle con aviso de cambios, cierre de sesión que nunca se atasca, avatares predefinidos, «Descubrir» con colecciones de otros usuarios, esquinas redondeadas en escaneos, licencia y créditos, y mover el proyecto a `D:\Proyectos\web_pokemon_tcg`.

## Decisiones confirmadas (usuario, 14/10/2026)

- Cualquiera con Google puede entrar y añadir cartas a su propia colección. Cada usuario edita solo la suya; el propietario sigue siendo administrador (oculta perfiles) y conserva su colección actual.
- Cada usuario elige aparecer en Descubrir (por defecto sí al añadir su primera carta). Descubrir y las colecciones son públicos, también sin sesión.
- **Sin subidas de usuarios**: ni fotos de cartas ni de perfil (por contenido inapropiado). Sus cartas usan el escaneo enlazado desde el índice; el avatar se elige entre 8 predefinidos.
- Las 6 cartas con cruz (c089, c095, c096, c100, c101, c111) son fotos propias: quitar la cruz, tratarlas como fotos propias protegidas (21 en total), sin redondear y sin buscar escaneos.
- Esquinas redondeadas en todos los escaneos; las fotos propias, como están.
- Licencia MIT para el código y la plantilla; fotos propias con todos los derechos reservados; pie de página con créditos, marcas y privacidad.
- Mover y renombrar al final; Graphify y vision_driver fuera de alcance.
- Historial de Git: solo contiene datos de prueba falsos (token `firma_de_prueba`, tu correo ya público en AGENTS.md y la ruta `C:\Users\adria`). Sin riesgo real: no se reescribe.

## Intocables

Sin Git ni publicación sin permiso expreso por operación. Sin precios. Originales del escritorio y las 21 fotos propias intactas (hash). Sin secretos ni service_role en el repositorio.

## Diseño de datos (Supabase)

- `tcg_cards` y sus políticas no cambian (colección del propietario, 177 fichas).
- Nueva `tcg_user_cards(owner_id, idioma, catalogo_id, cantidad, created_at, updated_at)`, clave `(owner_id, idioma, catalogo_id)`. Sin texto libre: nombre, número e imagen salen del índice, así nadie inyecta texto. Comprobaciones de formato, cantidad 1–9999 y límite de 500 cartas por usuario (trigger). Cada fila pesa unos 150 B: 1.000 usuarios ocupan unos 75 MB de los 500 MB gratuitos. Storage solo guarda las fotos del propietario.
- `tcg_profiles`: columnas `avatar` (a1–a8, por defecto a1) y `visible` (bool); `oculto` solo lo cambia el administrador mediante función. Lectura pública de filas ajenas solo vía `tcg_descubrir()` (id, username, avatar, nº de cartas; solo visibles y no ocultos). Lectura anónima de `tcg_user_cards` solo de perfiles visibles; escritura y borrado solo del propietario de la fila.
- Funciones: `tcg_descubrir()`, `tcg_ocultar(uid, bool)` (administrador) y `tcg_borrar_mis_datos()` (borra perfil y cartas del usuario).
- Archivo nuevo repetible `herramientas/configurar_supabase_v2.sql`; el cliente oculta Descubrir si las tablas aún no existen.
- Índice web: añadir `serie` por expansión y una referencia compacta de imagen por carta (TCGdex `…/high.webp`, Daldagury `_medium.webp`). Sin imagen disponible: marcador neutro, nunca tachado. Estimado +0,15 MB comprimido.

## Archivos y símbolos

catalogo_cartas.html; catalogo.css y controles.css; catalogo.js (`thumbnail`, `render`, `openDetail`, `replaceRemote`); cuenta.js (`signOut`, `signedUser`, `openEditor`, `fillEditor`, submit de `card-form`); registro.js; datos.json; herramientas (actualizar_imagenes.py, actualizar_referencias.py, validar_catalogo.py, configurar_supabase_v2.sql); comprobacion/*; avatares nuevos en `catalogo_cartas/avatares/`; LICENSE y THIRD_PARTY_NOTICES; AGENTS.md y contexto.

## Bloques

1. [HECHO] Datos: quitar la cruz a las 6 fotos propias, protegerlas por hash y actualizar el validador. Esquinas redondeadas elípticas en escaneos (cuadrícula, detalle y lista), sin tocar fotos propias.
2. [HECHO] Vista: 3 columnas en móvil con tipografía ajustada y selector Cuadrícula/Lista (guardado en el navegador). Lista = fila ancha con imagen. Comprobar a 390 y 360 px y en escritorio.
3. [HECHO] Detalle y editor lado a lado (apilados en pantalla estrecha). Aviso «Seguir editando · Descartar · Guardar» al cerrar con X, Esc o clic fuera, también en Tu cuenta.
4. [HECHO] Sesión: cierre con límite de 3 s y salida local garantizada; prueba con servidor que no responde. Diagnóstico visible en Tu cuenta (correo, ¿administrador?, error) para saber por qué no aparece «Sincronizar las 177 cartas».
5. [HECHO] Ocho avatares SVG minimalistas gris/negro/blanco (Pikachu, Charmander, Bulbasaur, Squirtle, Eevee, Gengar, Mewtwo, Snorlax), elegibles en Tu cuenta y visibles en la cabecera. Sin subida de foto.
6. [HECHO] SQL v2 y pruebas con PGlite (RLS, límites, visibilidad, ocultación, borrado).
7. [HECHO] Descubrir: botón en la cabecera, lista con avatar, nombre y nº de cartas, vista de solo lectura de otra colección, «Mi colección», interruptor de visibilidad, ocultar (administrador) y «Borrar mis datos». Formulario simplificado para usuarios (solo cantidad).
8. [HECHO] LICENSE MIT, THIRD_PARTY_NOTICES, pie de página con créditos, marcas y aviso de privacidad. Verificar la licencia real de cada fuente (TCGdex, PokeAPI, Daldagury, supabase-js) antes de citarla.
9. [HECHO] Verificación completa y capturas móvil y PC; actualizar AGENTS.md, ESTADO y CHANGELOG (edición abierta a usuarios, 21 fotos propias, sin subidas).
10. [ ] Publicar solo tras tu permiso y tras ejecutar tú el SQL; después comprobar Pages y la web real.
11. [ ] Mover la carpeta a `D:\Proyectos\web_pokemon_tcg` copiando y verificando antes de borrar el origen; actualizar rutas del proyecto; reabrir la sesión allí.

## Pruebas y aceptación

validar_catalogo.py, node --check y las tres suites ampliadas (3 columnas, lista, edición lateral, descarte, cierre sin respuesta, Descubrir, límites, permisos). Capturas revisadas en móvil y PC. Sin precios ni secretos. Las 21 fotos propias idénticas a Git. Las pruebas son simuladas; no sustituyen la comprobación con cuentas reales.

## Pasos tuyos (te guío cuando llegue cada uno)

1. Ejecutar `configurar_supabase_v2.sql` en el SQL Editor de tu Supabase.
2. Google Cloud, proyecto web-pokemon-tcg → Google Auth Platform → Audience → **Publish app**. Basta con los permisos básicos (correo y perfil); sin verificación.
3. Con tu cuenta y con otra: entrar, elegir avatar, añadir cartas, aparecer en Descubrir, ocultarte y cerrar sesión.

## Riesgos y vuelta atrás

- El plan gratuito de Supabase se pausa tras 7 días sin actividad: avísame si quieres una tarea semanal gratuita que lo evite.
- Los escaneos coreanos enlazados dependen de Daldagury; si bloquea el acceso, la carta muestra un marcador.
- Moderación: nombres de usuario libres; el administrador puede ocultarlos.
- Vuelta atrás: commits previos (`1faef40`); el SQL nuevo solo añade, no borra.
- El permiso de publicar no se hereda: cada commit y push se pregunta.
