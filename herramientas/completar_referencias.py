"""Completa las referencias fisicas JA/KR con el indice publico de Daldagury.

Solo conserva identidad y catalogacion. Nunca guarda precios ni ofertas.
Ejecutar despues de actualizar_referencias.py.
"""
import json
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed

sys.dont_write_bytecode = True  # Sin __pycache__ dentro del proyecto.
from actualizar_referencias import obtener, escribir, BASE  # noqa: E402


def descargar_set(par):
    idioma, s = par
    url = f'https://api.daldagury.com/tcg/sets/{s["setId"]}/cards?page=1&limit=500'
    detalle = json.loads(obtener(url))['resultData']
    cartas = detalle.get('data', [])
    pagina = 1
    while len(cartas) < detalle.get('totalCount', 0):
        pagina += 1
        siguiente = json.loads(obtener(url.replace('page=1&', f'page={pagina}&')))['resultData']['data']
        if not siguiente:
            raise ValueError('Respuesta incompleta')
        cartas.extend(siguiente)
    return {
        'id': f'dalda:{idioma}:{s["setId"]}', 'api_id': s['setId'],
        'idioma': 'japones' if idioma == 'ja' else 'coreano', 'idioma_api': idioma,
        'nombre': (s.get('setNameJa') if idioma == 'ja' else s.get('setNameKo')) or s.get('setNameKo') or s.get('setNameEn') or s['setCode'],
        'codigo': s.get('setCode') or '', 'codigo_impreso': bool(s.get('setCode')),
        'fecha': s.get('releasedAt') or '', 'total': s.get('cardCount') or 0,
        'fuente': s.get('sourceUrl') or f'https://daldagury.com/tcg/pokemon?set={s["setId"]}',
        'proveedor': 'daldagury',
        'cartas': [{'id': 'dalda:' + c['cardId'], 'numero': c['cardNumber'],
                    'numero_completo': c.get('numberInSet') or c['cardNumber'],
                    'nombre': c.get('nameJa') or c.get('nameKo') or '',
                    'imagen': c.get('thumbnailUrl') or '',
                    'tipo_fuente': c.get('cardType') or '', 'categoria_fuente': c.get('superType') or '',
                    'rareza': c.get('lowestRarity') if c.get('printCount') == 1 else '',
                    'impresiones': c.get('printCount') or 1,
                    'fuente': f'https://daldagury.com/tcg/pokemon/card/{c["cardId"]}'} for c in cartas]
    }


def actualizar():
    destino = BASE / 'catalogo_cartas/referencias.json'
    datos = json.loads(destino.read_text(encoding='utf-8'))
    tareas = []
    for idioma, region in [('ko', 'KR'), ('ja', 'JP')]:
        sets = json.loads(obtener('https://api.daldagury.com/tcg/pokemon/sets?region=' + region))['resultData']
        tareas.extend((idioma, s) for s in sets)
    resultados, fallos = [], []
    with ThreadPoolExecutor(max_workers=6) as pool:
        futures = {pool.submit(descargar_set, t): t for t in tareas}
        for i, f in enumerate(as_completed(futures), 1):
            try:
                resultados.append(f.result())
            except Exception as e:
                fallos.append({'idioma': futures[f][0], 'id': futures[f][1]['setId'], 'error': type(e).__name__})
            if i % 100 == 0:
                print(f'Expansiones revisadas: {i}/{len(tareas)}', flush=True)
    correcciones = json.loads((BASE / 'catalogo_cartas/correcciones_referencias.json').read_text(encoding='utf-8'))
    for s in resultados:
        s.update(correcciones['expansiones'].get(s['id'], {}))
    # Unificar solo cuando el codigo identifica un unico producto por idioma.
    base = [s for s in datos['expansiones'] if s.get('proveedor') != 'daldagury']
    # Repetible: deshacer una fusion anterior antes de volver a combinar.
    for s in base:
        s['cartas'] = [c for c in s['cartas'] if not c['id'].startswith('dalda:')]
        for c in s['cartas']:
            c.pop('dalda_id', None)
            c.pop('fuente_imagen', None)
        for clave in ('fuente_complementaria', 'alias', 'codigo_fuente'):
            s.pop(clave, None)
    usados = set()
    for s in base:
        coincidencias = [r for r in resultados if r['idioma'] == s['idioma'] and r['codigo'].lower() == s['codigo'].lower() and s['codigo']]
        if len(coincidencias) != 1:
            continue
        r = coincidencias[0]
        if r['id'] in usados:
            continue
        usados.add(r['id'])
        por_numero = {c['numero'].lower().lstrip('0'): c for c in s['cartas']}
        for c in r['cartas']:
            antigua = por_numero.get(c['numero'].lower().lstrip('0'))
            if antigua:
                antigua['dalda_id'] = c['id'].split(':')[1]
                antigua['fuente_imagen'] = c['fuente']
            else:
                s['cartas'].append(c)
        s['fuente_complementaria'] = r['fuente']
        s['alias'] = [r['nombre'], r['codigo']]
        if r.get('codigo_fuente'):
            s['codigo_fuente'] = r['codigo_fuente']
    datos['expansiones'] = base + [r for r in resultados if r['id'] not in usados]
    datos['expansiones'].sort(key=lambda s: (s['idioma'], s['fecha'], s['id']))
    datos['fuentes'] = list(dict.fromkeys(datos['fuentes'] + ['https://daldagury.com/tcg/pokemon']))
    datos['fallos_daldagury'] = fallos
    escribir(datos)
    print(json.dumps({'expansiones': len(datos['expansiones']),
                      'cartas': sum(len(s['cartas']) for s in datos['expansiones']), 'fallos': len(fallos)}, ensure_ascii=True))


if __name__ == '__main__':
    actualizar()
