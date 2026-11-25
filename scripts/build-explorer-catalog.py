"""Build the local explorer data from pinned CC BY-SA 4.0 sources."""
import csv
import io
import json
import sys
from pathlib import Path
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parents[1]
HYG = 'https://raw.githubusercontent.com/astronexus/HYG-Database/c7f7f883fe678cc7680169a50ccd7dcc49b060ce/hyg/CURRENT/hygdata_v41.csv'
STELLARIUM = 'https://raw.githubusercontent.com/Stellarium/stellarium/e233fa9b3d21e2cafe9c168e6710b627532a7dd4/skycultures/modern/index.json'

# Standard Chinese names of the modern IAU constellations, by IAU abbreviation.
ZH = dict(pair.split(':') for pair in '''And:仙女 Ant:唧筒 Aps:天燕 Aqr:宝瓶 Aql:天鹰 Ara:天坛 Ari:白羊 Aur:御夫 Boo:牧夫 Cae:雕具 Cam:鹿豹 Cnc:巨蟹 CVn:猎犬 CMa:大犬 CMi:小犬 Cap:摩羯 Car:船底 Cas:仙后 Cen:半人马 Cep:仙王 Cet:鲸鱼 Cha:蝘蜓 Cir:圆规 Col:天鸽 Com:后发 CrA:南冕 CrB:北冕 Crv:乌鸦 Crt:巨爵 Cru:南十字 Cyg:天鹅 Del:海豚 Dor:剑鱼 Dra:天龙 Equ:小马 Eri:波江 For:天炉 Gem:双子 Gru:天鹤 Her:武仙 Hor:时钟 Hya:长蛇 Hyi:水蛇 Ind:印第安 Lac:蝎虎 Leo:狮子 LMi:小狮 Lep:天兔 Lib:天秤 Lup:豺狼 Lyn:天猫 Lyr:天琴 Men:山案 Mic:显微镜 Mon:麒麟 Mus:苍蝇 Nor:矩尺 Oct:南极 Oph:蛇夫 Ori:猎户 Pav:孔雀 Peg:飞马 Per:英仙 Phe:凤凰 Pic:绘架 Psc:双鱼 PsA:南鱼 Pup:船尾 Pyx:罗盘 Ret:网罟 Sge:天箭 Sgr:人马 Sco:天蝎 Scl:玉夫 Sct:盾牌 Ser:巨蛇 Sex:六分仪 Tau:金牛 Tel:望远镜 Tri:三角 TrA:南三角 Tuc:杜鹃 UMa:大熊 UMi:小熊 Vel:船帆 Vir:室女 Vol:飞鱼 Vul:狐狸'''.split())
FEATURED = {
    'hip-70890': '比邻星', 'hip-71683': '南门二 A', 'hip-71681': '南门二 B',
    'hip-87937': '巴纳德星', 'hyg-118720': '沃尔夫359', 'hip-54035': '拉兰德21185',
    'hip-32349': '天狼星', 'hip-16537': '天苑四', 'hip-37279': '南河三',
    'hip-91262': '织女星', 'hip-11767': '北极星', 'hip-27989': '参宿四', 'hip-24436': '参宿七',
}


def source(url, index):
    if len(sys.argv) == 3:
        return Path(sys.argv[index]).read_text(encoding='utf-8-sig')
    with urlopen(url, timeout=60) as response:
        return response.read().decode('utf-8-sig')


def dump(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    def compact(value):
        return json.dumps(value, ensure_ascii=False, separators=(',', ':'), allow_nan=False)
    text = ('[\n' + ',\n'.join(map(compact, data)) + '\n]') if isinstance(data, list) else json.dumps(data, ensure_ascii=False, indent=2, allow_nan=False)
    path.write_text(text + '\n', encoding='utf-8', newline='\n')


def main():
    stars = {}
    for row in csv.DictReader(io.StringIO(source(HYG, 1))):
        if not (0 < float(row['dist']) < 100000) or not row['mag'] or not row['absmag']:
            continue  # No legitimate 3D position for HYG's missing-parallax sentinel.
        ident = f"hip-{row['hip']}" if row['hip'] else f"hyg-{row['id']}"
        name = row['proper'] or ' '.join(row['bf'].split()) or row['gl'] or ident.upper().replace('-', ' ')
        values = [ident, name, *(float(row[axis]) for axis in 'xyz'), float(row['mag']), float(row['absmag'])]
        if row['ci']:
            values.append(float(row['ci']))
        if ident in stars:
            raise ValueError(f'Duplicate star identifier: {ident}')
        stars[ident] = (float(row['dist']), values)

    constellations = []
    endpoints = set()
    skipped = set()
    culture = json.loads(source(STELLARIUM, 2))
    for shape in culture['constellations']:
        ident = shape['id'].split()[-1]
        lines = []
        seen = set()
        for line in shape['lines']:
            for a, b in zip(line, line[1:]):
                edge = (f'hip-{a}', f'hip-{b}')
                missing = set(edge) - stars.keys()
                if missing:
                    skipped.update(missing)
                    continue
                key = tuple(sorted(edge))
                if a != b and key not in seen:
                    seen.add(key)
                    lines.append(edge)
                    endpoints.update(edge)
        if not lines:
            raise ValueError(f'No usable lines: {ident}')
        constellations.append({'id': ident, 'name': shape['common_name']['native'], 'zh': ZH[ident] + '座', 'lines': lines})
    assert len(constellations) == len({row['id'] for row in constellations}) == len(ZH) == 88
    constellations.sort(key=lambda item: item['name'])
    selected = [row for ident, (dist, row) in stars.items()
                if row[5] <= 6.5 or dist <= 3 or ident in endpoints or ident in FEATURED]
    selected.sort(key=lambda row: (row[5], row[0]))
    featured = [{'id': ident, 'name': stars[ident][1][1], 'zh': zh, 'kind': 'star', 'position': stars[ident][1][2:5]}
                for ident, zh in FEATURED.items()]
    dump(ROOT / 'public' / 'explorer' / 'stars.json', selected)
    dump(ROOT / 'src' / 'explorer' / 'catalog-index.json', {'constellations': constellations, 'featured': featured})
    print(f'{len(selected)} stars, {len(constellations)} constellations, {sum(len(row["lines"]) for row in constellations)} edges')
    print('Skipped unavailable distances:', ', '.join(sorted(skipped)))


if __name__ == '__main__':
    main()
