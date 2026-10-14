# web_pokemon_tcg

Catálogo de la colección Pokémon TCG de Adrián Rodríguez: agrupa las copias por carta, idioma, edición y variante, con búsqueda, filtros, fotografías y datos. Publicado en GitHub Pages con edición privada desde el móvil (Google y Supabase).

Autoría: Adrián Rodríguez. Ninguna IA figura como autora ni firma nada.

## Forma de trabajar

- Responde en español, breve y directo. Durante el trabajo da un aviso breve cada 30–45 segundos, nunca más de 60 en silencio: qué has comprobado, qué haces y qué falta.
- Antes de cada tarea, indica el modelo en uso y el esfuerzo que recomiendas.
- No expongas el enfoque salvo al planificar. Si una duda cambia el resultado, pregunta (cinco como
  máximo, juntas) y espera; después trabaja sin paradas salvo un bloqueo real. Sin dudas, actúa.
- El chat prevalece sobre estos documentos. Si el usuario decide algo nuevo o cambia algo escrito,
  actualiza el documento afectado en el mismo trabajo, sin esperar a que lo pida.
- Comprueba rutas y datos reales antes de usarlos; no inventes. Di lo que no hayas podido comprobar.
- Git en solo lectura. Antes de cada operación que escriba (stage, commit, push, ramas, configuración o publicación) pregunta y espera permiso; vale solo para esa acción y esta sesión.
- Al terminar: qué se hizo, cómo se verificó y qué queda. Sin volcados de consola.

## Proyecto

- Plataformas: Windows, navegadores de ordenador y móvil.
- Tecnologías: HTML, CSS y JavaScript sin framework; Python 3.9 o posterior para herramientas locales.
- Trabaja solo dentro de C:/Users/adria/Desktop/cartas_pokemon; web_pokemon_tcg es el nombre del proyecto, no permiso para mover o renombrar la carpeta.
- Sin precios, filtros u ordenación por precio ni herramientas de valoración.
- Solo cartas en japonés, español y coreano. Las dudas de identificación o variante se conservan como pendientes.
- Se conservan imagenes_cartas (japones, español, coreano, pendientes), herramientas, catalogo_cartas y catalogo_cartas.html; minúsculas y barrabajas; imágenes numeradas con nombre, edición y número.
- Imágenes: las 15 fotos propias se conservan completas y sin cambiar el fondo (encuadre solo en la cuadrícula; el detalle las muestra enteras); el resto, escaneos exactos del idioma y la edición sin modificar sus bytes; si falta uno, referencia tachada con aviso visible. Sustituir una imagen no añade fichas ni ejemplares.
- Publicado en GitHub Pages (ItsRodryy/web_pokemon_tcg) con el Supabase exclusivo jrdgqdczplvehzzyhgqx y Google; edición solo para el Google verificado de adrianrodry55@gmail.com. Sin servicios de pago. Las pruebas simuladas no confirman sesión, perfil ni edición reales.
- El nombre junto a la Poké Ball es el username del perfil de Supabase del usuario conectado; sin sesión, rodrytela. Nunca simular persistencia solo en el navegador.
- Nuevas cartas: solo identidades existentes en referencias (idioma, expansión y número); autocompletado de expansiones y Pokémon, categoría y tipo desplegables, rareza de la fuente; sin variante ni motivos pendientes en el formulario. Tipos con el vocabulario de TCGdex en español.
- D:/Proyectos/vision_driver solo se lee para estilo (radios de 8/12/16 px en la interfaz monocroma); no se ejecuta ni modifica nada allí.
- C:/Users/adria/Desktop/credenciales_web_pokemon_tcg.md se mantiene por petición del usuario; es privado y nunca entra en Git ni en la web.
- Intocable sin orden expresa: fotografías originales del escritorio (se pueden leer si el usuario las señala; nunca modificar, mover ni borrar); cualquier ruta fuera de este proyecto salvo las excepciones anteriores.

## Verificación

Proporcional al riesgo: en cambios pequeños, solo lo afectado; todo en cambios grandes y al cerrar.

- `python herramientas/actualizar_catalogo.py (tras editar datos.json)`
- `python herramientas/validar_catalogo.py`
- `node --check catalogo_cartas/catalogo.js (y cuenta.js, registro.js)`
- `node herramientas/comprobacion/probar_interfaz.cjs, probar_oauth.cjs y probar_permisos.cjs (simuladas; no equivalen a Google real)`
- `En navegador: búsqueda, idiomas, filtros, ordenación, detalle, cinco columnas en escritorio y sin desbordamiento en móvil.`

## Estado, planes y memoria

- Estado: `ai_workspace/ESTADO.md`. Si existe `PLAN_ACTUAL.md`, léelo antes de retomar.
- Skills: `crear-plan` planifica y para; `ejecutar-plan` ejecuta (la orden aprueba el plan);
  `cerrar` verifica, compacta y archiva, o deja el traspaso si solo se pausa; `error` diagnostica.
- `ai_workspace/` guarda solo documentos breves y vigentes: ni copias de código, ni binarios, ni
  informes viejos, ni traspasos duplicados. Los temporales van fuera del proyecto. Los límites de
  tamaño están en `ai_workspace/configuracion.json`.
- Graphify: antes de abrir archivos grandes, `graphify explain <símbolo>` o `graphify affected <símbolo>`. `cerrar` lo actualiza.

## Documentación bajo demanda

Rutas dentro de `ai_workspace/`.

| Si vas a… | Lee |
|---|---|
| cambiar datos, imágenes, herramientas o comportamiento del catálogo | `contexto/arquitectura.md` |
| crear o cambiar interfaz | `contexto/estilo.md` |
