# Estado

Actualizado el 14 de octubre de 2026.

## Hecho

- Publicado el commit f326fe3 en https://itsrodryy.github.io/web_pokemon_tcg/ (`v=20261014_4`). Comprobado en la web, de forma anónima: 177 cartas, 178 ejemplares, imágenes cargando, «Entrar con Google», nombre rodrytela, sin errores de JavaScript ni de red.
- Inventario: 177 fichas, 178 ejemplares (JP 63, ES 62, KR 52). 156 escaneos originales, 15 fotos propias idénticas a Git y 6 referencias tachadas. Los escaneos coreanos llevan la marca de agua oficial «Pokémon Card Game».
- Revisión integral de Claude sobre lo de Codex: datos con un solo vocabulario de tipos y expansiones, filtros sin duplicados, formulario con rareza normalizada, salida de sesión siempre disponible, campos móviles a 16 px, índice web de 4,2 MB y validación ampliada (detalle en CHANGELOG).
- AI Workspace actualizado a la plantilla 2.0.0 (skills autónomas, AGENTS generado, límites con `planes.ps1 -Accion Medir`, hooks portables). Retirados gestionados.json y el traspaso consumido de Codex.

## Verificación (14/10/2026, en local)

- validar_catalogo.py, node --check y las tres pruebas simuladas (interfaz, OAuth con SDK real y transporte falso, permisos con PGlite): correctas.
- Capturas revisadas en escritorio (cinco columnas) y a 390 px (sin desbordamiento).
- No verificado: nada con la cuenta Google real ni contra el Supabase real.

## Pendiente real

- Con la cuenta real (única comprobación que falta; no se puede hacer sin su sesión de Google): entrar, cambiar el nombre y verlo en otro dispositivo; cerrar sesión y recargar; sincronizar las 177 cartas; editar una cantidad.
- Seis escaneos inexistentes en las fuentes: c089, c095, c096 (MEP 089/099/100), c100 (MEP 022), c101 (SVP 208), c111 (30C clásica 123/172).
- Ejecución automática de los hooks sin comprobar; el de Codex requiere confiarlo en `/hooks`.

## Siguiente paso

Que el usuario haga la comprobación real con su cuenta en la web publicada y avise de lo que falle.
