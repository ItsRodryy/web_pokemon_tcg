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
- Git: lee sin pedir permiso (`status`, `diff`, `log`, `show`, `blame`, `branch --list`, `remote -v`). Antes de cualquier operación que cambie algo (`add`, `commit`, `push`, `pull`, `fetch`, `checkout`, `switch`, `restore`, `reset`, `stash`, `merge`, `rebase`, `tag`, crear o borrar ramas, `config`, `init`, `clone`, `clean` o publicación), di exactamente qué vas a hacer, pide permiso y espera. El permiso vale solo para esa operación.
- Al terminar: qué se hizo, cómo se verificó y qué queda. Sin volcados de consola.

## Proyecto

- Plataformas: Windows, navegadores de ordenador y móvil.
- Tecnologías: HTML, CSS y JavaScript sin framework; Python 3.9 o posterior para herramientas locales.
- Trabaja solo dentro de D:/Proyectos/personal/web_pokemon_tcg; no muevas ni renombres la carpeta sin que el usuario lo pida.
- Sin precios, filtros u ordenación por precio ni herramientas de valoración.
- Solo cartas en japonés, español y coreano. Las dudas de identificación o variante se conservan como pendientes.
- Se conservan imagenes_cartas (japones, español, coreano, pendientes), herramientas, catalogo_cartas y catalogo_cartas.html; minúsculas y barrabajas; imágenes numeradas con nombre, edición y número.
- Imágenes: las 21 fotos propias (15 nuevas y 6 anteriores) se conservan completas, sin cruz ni cambio de fondo (encuadre solo en la cuadrícula; el detalle las muestra enteras); el resto, escaneos exactos del idioma y la edición sin modificar sus bytes, con esquinas redondeadas por CSS. Sustituir una imagen no añade fichas ni ejemplares.
- El nombre junto a la Poké Ball es el username del perfil de Supabase del usuario conectado; sin sesión, rodrytela. Foto de perfil: solo los 8 avatares predefinidos. Descubrir lista a quien eligió aparecer. Nunca simular persistencia solo en el navegador.
- Nuevas cartas: solo identidades existentes en referencias (idioma, expansión y número); autocompletado de expansiones y Pokémon, categoría y tipo desplegables, rareza de la fuente; sin variante ni motivos pendientes en el formulario. Tipos con el vocabulario de TCGdex en español.
- Licencia MIT para el código (LICENSE y THIRD_PARTY_NOTICES); fotos propias con derechos reservados; el pie de la web cita licencias, marcas y privacidad.
- D:/Proyectos/iovi/vision_driver solo se lee como referencia de estilo; nunca se ejecuta ni modifica.
- C:/Users/adria/Desktop/credenciales_web_pokemon_tcg.md se mantiene por petición del usuario; es privado y nunca entra en Git ni en la web.
- Comunica en castellano claro; explica los términos técnicos cuando haga falta.
- Distingue lo comprobado de lo supuesto, lo propuesto y lo pendiente.
- No digas que algo compila, funciona o está validado sin haberlo comprobado.
- Archivos y carpetas nuevos en minúsculas con guion bajo; respeta los nombres obligatorios y los existentes.
- Commits y push solo como ItsRodryy (nunca 2DAM-adrianrod493), mensaje «vX.Y.Z - Descripción» y sin firma de IA.
- Al acabar cada tarea, añade una fila en ai_workspace/registro_trabajo.md.
- Intocable sin orden expresa: fotografías originales del escritorio (se pueden leer si el usuario las señala; nunca modificar, mover ni borrar); cualquier ruta fuera de este proyecto salvo las excepciones anteriores.

## Verificación

Proporcional al riesgo: en cambios pequeños, solo lo afectado; todo en cambios grandes y al cerrar.

- `python herramientas/actualizar_catalogo.py (tras editar datos.json)`
- `python herramientas/validar_catalogo.py`
- `node --check catalogo_cartas/catalogo.js (y cuenta.js, registro.js)`
- `node herramientas/comprobacion/probar_interfaz.cjs, probar_oauth.cjs, probar_colecciones.cjs y probar_permisos.cjs (simuladas; no equivalen a Google real)`
- `En navegador: búsqueda, idiomas, filtros, ordenación, detalle, cinco columnas en escritorio y sin desbordamiento en móvil.`

## Estado, planes y memoria

- Estado: `ai_workspace/ESTADO.md`. Si existe `PLAN_ACTUAL.md`, léelo antes de retomar.
- Skills: `crear-plan` planifica y para; `ejecutar-plan` ejecuta (la orden aprueba el plan);
  `cerrar` verifica, compacta y archiva, o deja el traspaso si solo se pausa; `error` diagnostica;
  `progreso` (= `estado`) retoma y da el avance (`ai_workspace/progreso.md`). Mensajes: según
  `ai_workspace/contexto/personas.md`; nada está enviado sin confirmarlo el usuario.
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
