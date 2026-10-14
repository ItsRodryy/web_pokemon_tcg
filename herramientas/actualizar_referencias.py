"""Descarga referencias de TCGdex y nombres de Pokemon sin datos de mercado.

Uso: python herramientas/actualizar_referencias.py
     python herramientas/actualizar_referencias.py --solo-web  (regenera referencias.js sin descargar)
referencias.json conserva el indice completo; referencias.js solo lo que usa el formulario.
"""
import csv
import io
import json
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.parse import quote

BASE = Path(__file__).resolve().parents[1]
IDIOMAS = {'es': 'español', 'ja': 'japones', 'ko': 'coreano'}


def obtener(url):
    for intento in range(3):
        try:
            with urlopen(Request(url, headers={'User-Agent': 'web_pokemon_tcg/1.0'}), timeout=25) as r:
                return r.read().decode('utf-8-sig')
        except Exception:
            if intento == 2:
                raise
            time.sleep(0.3)


CAMPOS_EXPANSION = ('id', 'idioma', 'idioma_api', 'nombre', 'codigo', 'fecha', 'total')
OPCIONALES_EXPANSION = ('api_id', 'alias')
CAMPOS_CARTA = ('id', 'numero', 'nombre')
OPCIONALES_CARTA = ('numero_completo', 'rareza')


def datos_web(datos):
    """Version reducida para el navegador: identidad, numero, nombre y rareza."""
    def reducir(item, campos, opcionales):
        return {**{k: item.get(k, '') for k in campos}, **{k: item[k] for k in opcionales if item.get(k)}}
    return {
        'actualizado': datos['actualizado'], 'fuentes': datos['fuentes'],
        'expansiones': [
            {**reducir(s, CAMPOS_EXPANSION, OPCIONALES_EXPANSION),
             'cartas': [reducir(c, CAMPOS_CARTA, OPCIONALES_CARTA) for c in s['cartas']]}
            for s in datos['expansiones']],
        'pokemon': datos['pokemon'], 'tipos': datos['tipos'], 'categorias': datos['categorias'],
    }


def texto_web(datos):
    return 'window.TCG_REFERENCIAS = ' + json.dumps(datos_web(datos), ensure_ascii=False, separators=(',', ':')) + ';\n'


def escribir(datos):
    destino = BASE / 'catalogo_cartas/referencias.json'
    destino.write_text(json.dumps(datos, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')
    destino.with_suffix('.js').write_text(texto_web(datos), encoding='utf-8')


def expansion(par):
    idioma, breve = par
    url = f'https://api.tcgdex.net/v2/{idioma}/sets/{quote(breve["id"], safe="")}'
    detalle = json.loads(obtener(url))
    codigo = detalle.get('abbreviation', {}).get('official')
    # Los identificadores de API de sets antiguos no equivalen a un codigo impreso.
    if not codigo and idioma in {'ja', 'ko'} and breve['id'].lower().startswith(('sv', 's', 'm')):
        codigo = breve['id']
    return {
        'id': f'{idioma}:{breve["id"]}', 'api_id': breve['id'], 'idioma': IDIOMAS[idioma],
        'idioma_api': idioma, 'nombre': detalle['name'], 'codigo': codigo or '',
        'codigo_impreso': bool(codigo),
        'fecha': detalle.get('releaseDate', ''), 'total': detalle.get('cardCount', {}).get('official', 0),
        'fuente': url,
        'serie': detalle.get('serie', {}).get('id', ''),
        'cartas': [{'id': c['id'], 'numero': c['localId'], 'nombre': c['name'],
                    'imagen': c.get('image', '')} for c in detalle.get('cards', [])]
    }


def actualizar():
    tareas = []
    for idioma in IDIOMAS:
        lista = json.loads(obtener(f'https://api.tcgdex.net/v2/{idioma}/sets'))
        tareas.extend((idioma, s) for s in lista)
    sets, fallos = [], []
    with ThreadPoolExecutor(max_workers=6) as pool:
        futures = {pool.submit(expansion, t): t for t in tareas}
        for f in as_completed(futures):
            try:
                resultado = f.result()
                if resultado['serie'] != 'tcgp':
                    sets.append(resultado)
            except Exception as e:
                fallos.append({'idioma': futures[f][0], 'id': futures[f][1]['id'], 'error': type(e).__name__})
    texto = obtener('https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/pokemon_species_names.csv')
    especies = {}
    for row in csv.DictReader(io.StringIO(texto)):
        idioma = int(row['local_language_id'])
        if idioma not in {1, 2, 3, 7, 9, 11}:
            continue
        numero = int(row['pokemon_species_id'])
        item = especies.setdefault(numero, {'id': numero, 'nombre': '', 'alias': []})
        if row['name'] not in item['alias']:
            item['alias'].append(row['name'])
        if idioma == 7 or not item['nombre']:
            item['nombre'] = row['name']
    tipos = json.loads(obtener('https://api.tcgdex.net/v2/es/types'))
    datos = {'actualizado': '2026-10-14', 'fuentes': ['https://tcgdex.dev/', 'https://github.com/PokeAPI/pokeapi'],
             'expansiones': sorted(sets, key=lambda s: (s['idioma'], s['fecha'], s['id'])),
             'pokemon': sorted(especies.values(), key=lambda p: p['id']), 'tipos': tipos,
             'categorias': [
                 {'valor': 'Pokémon', 'grupo': 'Pokémon', 'subtipo': ''},
                 {'valor': 'Objeto', 'grupo': 'Entrenador', 'subtipo': 'Objeto'},
                 {'valor': 'Herramienta Pokémon', 'grupo': 'Entrenador', 'subtipo': 'Herramienta'},
                 {'valor': 'Partidario', 'grupo': 'Entrenador', 'subtipo': 'Partidario'},
                 {'valor': 'Estadio', 'grupo': 'Entrenador', 'subtipo': 'Estadio'},
                 {'valor': 'Entrenador', 'grupo': 'Entrenador', 'subtipo': ''},
                 {'valor': 'Energía básica', 'grupo': 'Energía', 'subtipo': 'Básica'},
                 {'valor': 'Energía especial', 'grupo': 'Energía', 'subtipo': 'Especial'}],
             'fallos': fallos}
    escribir(datos)
    print(json.dumps({'expansiones': len(sets), 'cartas': sum(len(s['cartas']) for s in sets),
                      'pokemon': len(especies), 'fallos': fallos}, ensure_ascii=True), flush=True)


def solo_web():
    datos = json.loads((BASE / 'catalogo_cartas/referencias.json').read_text(encoding='utf-8'))
    (BASE / 'catalogo_cartas/referencias.js').write_text(texto_web(datos), encoding='utf-8')
    print(json.dumps({'expansiones': len(datos['expansiones']), 'referencias_js': 'regenerado'}, ensure_ascii=True))


if __name__ == '__main__':
    if '--solo-web' in sys.argv[1:]:
        solo_web()
    else:
        actualizar()
