"""Comprueba datos, imagenes, enlaces locales y estructura sin modificar archivos.

Uso: python herramientas/validar_catalogo.py
Requiere Python 3.9 o posterior; no necesita paquetes adicionales.
"""
import json
import math
import re
import sys
from collections import Counter
from pathlib import Path
from urllib.parse import urlsplit

BASE = Path(__file__).resolve().parents[1]


def validar():
    errores = []
    def comprobar(condicion, mensaje):
        if not condicion:
            errores.append(mensaje)
    catalogo = {'imagenes_cartas', 'herramientas', 'catalogo_cartas', 'catalogo_cartas.html'}
    infraestructura = {'plantilla_ai_workspace', 'ai_workspace', '.agents', '.claude', '.codex', 'AGENTS.md', 'CLAUDE.md', 'graphify-out', '.git', '.gitignore', '.nojekyll', 'index.html'}
    presentes = {p.name for p in BASE.iterdir()}
    comprobar(catalogo <= presentes <= catalogo | infraestructura, 'Faltan archivos del catalogo o hay elementos ajenos al proyecto.')
    idiomas = {'japones', 'español', 'coreano', 'pendientes'}
    comprobar({p.name for p in (BASE / 'imagenes_cartas').iterdir()} == idiomas, 'Subcarpetas de imagenes incorrectas.')
    cartas = json.loads((BASE / 'catalogo_cartas/datos.json').read_text(encoding='utf-8'))
    js = (BASE / 'catalogo_cartas/datos.js').read_text(encoding='utf-8')
    comprobar(js.startswith('window.CATALOGO_DATA = '), 'Cabecera de datos.js incorrecta.')
    comprobar(json.loads(js.removeprefix('window.CATALOGO_DATA = ').strip().removesuffix(';')) == cartas, 'datos.js no coincide con datos.json; ejecuta actualizar_catalogo.py.')
    ids = [c['id'] for c in cartas]
    comprobar(len(ids) == len(set(ids)), 'Fichas con id duplicado.')
    imagenes = set()
    for c in cartas:
        ruta = (BASE / c['imagen']).resolve()
        comprobar(ruta.is_relative_to(BASE / 'imagenes_cartas') and ruta.is_file() and ruta.stat().st_size > 1000, f"Imagen ausente o invalida: {c['id']}")
        comprobar(ruta not in imagenes, f"Imagen compartida entre fichas distintas: {c['id']}")
        imagenes.add(ruta)
        carpeta = 'pendientes' if c['pendiente'] else c['idioma']
        comprobar(ruta.parent.name == carpeta, f"Carpeta incorrecta: {c['id']}")
        comprobar(isinstance(c['cantidad'], int) and c['cantidad'] > 0, f"Cantidad invalida: {c['id']}")
        comprobar(c['idioma'] in {'japones', 'español', 'coreano'}, f"Idioma no admitido: {c['id']}")
        if c.get('encuadre') is not None:
            r = c['encuadre']
            campos = {'x', 'y', 'ancho', 'alto', 'ancho_original', 'alto_original'}
            valido = isinstance(r, dict) and campos <= r.keys() and all(type(r[k]) in (int, float) and math.isfinite(r[k]) for k in campos)
            comprobar(valido, f"Encuadre invalido: {c['id']}")
            if valido:
                comprobar(r['ancho'] > 0 and r['alto'] > 0 and r['x'] >= 0 and r['y'] >= 0 and r['x'] + r['ancho'] <= r['ancho_original'] and r['y'] + r['alto'] <= r['alto_original'], f"Encuadre fuera de la foto: {c['id']}")
        if c['imagen_origen'] in {'catalogo', 'referencia_web'}:
            comprobar(c.get('imagen_fuente', '').startswith('https://') and c.get('imagen_url', '').startswith('https://'), f"Falta procedencia de imagen: {c['id']}")
    reales = {p.resolve() for p in (BASE / 'imagenes_cartas').rglob('*') if p.is_file()}
    comprobar(reales == imagenes, 'Hay imagenes sobrantes o referencias ausentes.')
    html = (BASE / 'catalogo_cartas.html').read_text(encoding='utf-8')
    for referencia in re.findall(r'(?:src|href)="([^"]+)"', html):
        if not referencia.startswith(('https:', 'http:', '#')):
            comprobar((BASE / urlsplit(referencia).path).is_file(), 'Enlace local ausente: ' + referencia)
    for ruta in BASE.rglob('*'):
        relativa = ruta.relative_to(BASE)
        if relativa.parts[0] in infraestructura or 'plantilla_ai_workspace' in relativa.parts:
            continue
        if relativa.parts[:2] == ('herramientas', 'comprobacion') and ('node_modules' in relativa.parts or any(p.startswith('perfil_') for p in relativa.parts[2:])):
            continue
        comprobar(bool(re.fullmatch(r'[a-z0-9_ñ]+(?:\.[a-z0-9]+)?', ruta.name)), 'Nombre fuera de la convencion: ' + str(ruta.relative_to(BASE)))
        comprobar(ruta.suffix.lower() not in {'.xlsx', '.xls', '.xlsm', '.csv', '.mov', '.mp4', '.heic', '.zip'}, 'Archivo sobrante: ' + str(ruta.relative_to(BASE)))
    if errores:
        print('\n'.join('ERROR: ' + e for e in errores))
        return 1
    print(json.dumps({'resultado': 'correcto', 'fichas': len(cartas), 'ejemplares_provisionales': sum(c['cantidad'] for c in cartas), 'imagenes': len(imagenes), 'idiomas': dict(Counter(c['idioma'] for c in cartas))}, ensure_ascii=True))
    return 0


if __name__ == '__main__':
    sys.exit(validar())
