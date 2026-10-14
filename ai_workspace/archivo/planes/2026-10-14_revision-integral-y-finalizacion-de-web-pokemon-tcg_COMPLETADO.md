# Revisión integral y finalización de web_pokemon_tcg

> **Estado:** COMPLETADO

Revisión independiente de Claude (14 de octubre de 2026) sobre todo el trabajo de Codex. La orden del usuario autoriza planificar y ejecutar los cambios locales; Git/GitHub siguen en solo lectura y cada escritura requiere permiso concreto.

## Objetivo

Dejar el catálogo local coherente, verificado y listo para publicar: datos sin vocabularios duplicados, formulario que solo registra cartas reales con categoría, tipo y rareza normalizados, salida de sesión robusta, índice de referencias ligero para móvil, Graphify limpio y documentación fiel al estado real.

## Decisiones e intocables

- Autor Adrián Rodríguez. Raíz C:/Users/adria/Desktop/cartas_pokemon; no mover ni renombrar.
- Solo este proyecto. Vision Driver en lectura. Originales del escritorio intocables. Sin precios.
- 177 fichas y 178 ejemplares; 15 fotos protegidas idénticas a Git; 6 imágenes faltantes señaladas.
- Vocabulario de tipos: el de TCGdex en español, que ya usa el formulario (Agua, Dragón, Fuego, Hada, Incolora, Lucha, Metálica, Oscura, Planta, Psíquico, Rayo, más Entrenador y Energía).
- Rareza: se guarda la de la fuente; la interfaz traduce valores en inglés y agrupa equivalentes en el filtro.
- SQL de Supabase sin cambios: ya aplicado y correcto; la validación de identidad sigue en el formulario, protegida por RLS de administrador.

## Hallazgos de la auditoría (contrastados con código, datos y fuentes)

1. Datos: tipos duplicados por sinónimos (Incoloro/Incolora, Oscuridad/Oscura, Metálico/Metálica) que duplican opciones del filtro; rarezas promo/Promo y Uncommon/U con etiquetas repetidas.
2. Nueve fichas con tipo «Por confirmar» cuyo tipo sí consta en TCGdex (edición inglesa equivalente): c063, c064, c068, c069, c071, c073, c089, c095, c096.
3. Formulario: TCGdex en japonés/coreano devuelve categoría, tipo y rareza en inglés; la rareza se guardaba en inglés («Common», «None»). Alias coreanos de una sílaba excluidos de la búsqueda. Al editar una ficha existente, categoría y tipo parecían editables pero se ignoraban.
4. Sesión: «Cerrar sesión» no hacía nada si había otra operación en curso; si signOut lanzaba excepción no se aplicaba la salida local.
5. Interfaz: en móvil el buscador (15 px) y los desplegables (13 px) provocan zoom en iOS, contra la guía de 16 px; un selector móvil dejó de aplicarse al botón de cuenta. El detalle llamaba «Foto propia» a las 6 referencias faltantes y mostraba la variante técnica «registro_catalogo». «Sobre los datos» describía la política de imágenes antigua.
6. Índice: referencias.js pesa 11,4 MB y carga campos que el formulario no usa. completar_referencias.py no era idempotente al repetirse.
7. Graphify incluía el SDK minificado y los índices generados (ruido: nodos «P», «t», «n»).
8. Comprobado sin fallo: SQL/RLS, 15 fotos protegidas iguales a Git, extensiones y formatos de imagen, escaneos faltantes realmente inexistentes en TCGdex español, duplicados SV4K (son cartas distintas por idioma), hooks compatibles con Windows.

## Bloques

1. [HECHO] Traspaso de Codex y auditoría independiente (hallazgos arriba).
2. [HECHO] Datos: normalizar tipos y rarezas triviales, resolver los 9 tipos con fuente y regenerar datos.js. Añadido en revisión visual: expansiones 30C y MEP con dos nombres unificadas.
3. [HECHO] Catálogo y detalle: filtro de rareza agrupado, normalización de datos remotos antiguos, etiquetas de imagen, variante y texto «Sobre los datos».
4. [HECHO] Formulario: rareza y clasificación normalizadas, alias coreanos, campos bloqueados al editar, índice compacto.
5. [HECHO] Sesión: salida siempre disponible y salida local ante excepciones.
6. [HECHO] CSS móvil a 16 px en campos y selector del botón de cuenta.
7. [HECHO] Herramientas: índice web compacto regenerable sin descargas, completar_referencias idempotente, validación de vocabulario de tipos y .graphifyignore.
8. [HECHO] Pruebas: ampliar probar_interfaz (filtros sin duplicados, salida con operación en curso, etiquetas) y ejecutar las tres suites, validación, sintaxis y capturas de escritorio y móvil.
9. [HECHO] Documentación y cierre: ESTADO, arquitectura, estilo, CHANGELOG, traspaso consumido, Graphify actualizado.
10. [HECHO] Publicación: con permiso expreso (stage, commit f326fe3 y push), Pages sirve v=20261014_4 y la web anónima carga sin errores.

## Resultado de la ejecución

Bloques 1–10 hechos y verificados el 14/10/2026 (detalle en ai_workspace/ESTADO.md). Fuera del plan queda la comprobación con la cuenta Google real, que solo puede hacer el usuario.

## Pruebas y aceptación

- validar_catalogo.py correcto con 177 fichas, 178 ejemplares y tipos dentro del vocabulario.
- node --check de catalogo.js, cuenta.js y registro.js.
- probar_interfaz, probar_oauth y probar_permisos correctos (simuladas: no equivalen a Google real).
- Capturas revisadas: cinco columnas en escritorio, sin desbordamiento a 390 px.
- Sin precios ni secretos; 15 fotos protegidas idénticas a Git.

## Pendiente que requiere al usuario

- Permiso para stage, commit y push de este cambio; después, comprobar Pages.
- Con la cuenta real: entrar, cambiar nombre, recargar y verlo en otro dispositivo; cerrar sesión y recargar; sincronizar las 177 cartas iniciales; editar una cantidad.
- Seis escaneos exactos inexistentes en las fuentes consultadas (c089, c095, c096, c100, c101, c111): fotografiarlas o esperar a la fuente.

## Riesgos y vuelta atrás

Cambios locales sin commit. No usar reset, clean, checkout ni restore. Las versiones anteriores siguen en Git para consulta.
