---
name: cerrar
description: Cierra o pausa el trabajo. Verifica, actualiza el estado y archiva el plan si terminó, o deja el traspaso para retomarlo si no.
---

1. Si se cambió código, ejecuta la verificación de `AGENTS.md`. Si falla, no cierres: deja el plan
   `EN CURSO` o `BLOQUEADO` e informa del fallo.
2. Si se cambió código y Graphify está activo: `graphify update .`
3. Reescribe `ai_workspace/ESTADO.md`, corto: qué se hizo, qué se verificó (con resultados), qué
   queda y el siguiente paso.
4. En `ai_workspace/archivo/CHANGELOG.md` añade solo hitos que expliquen decisiones o regresiones.
5. Plan terminado y verificado:
   `powershell -NoProfile -File ai_workspace/tools/planes.ps1 -Accion Archivar -Estado COMPLETADO`
   Si queda trabajo (pausa o cambio de agente), actualiza sus bloques y el siguiente paso y no lo
   archives.
6. Informa en pocas líneas: hecho, verificado y pendiente.
