#!/usr/bin/env python3
"""Refresh Night Atlas's offline post-flyby state vectors from NASA/JPL Horizons."""

import csv
from datetime import datetime, timezone
import json
import math
from pathlib import Path
import re
from urllib.parse import urlencode
from urllib.request import urlopen

API = 'https://ssd.jpl.nasa.gov/api/horizons.api'
RIGHTS = 'https://ssd.jpl.nasa.gov/faq.html'
PHOTO = 'https://science.nasa.gov/mission/voyager/voyager-1s-pale-blue-dot/'
END_YEAR = 2035
MISSIONS = {
    'voyager-1': ('-31', 1990),
    'voyager-2': ('-32', 1990),
    'new-horizons': ('-98', 2020),
}
PHOTO_TIME = datetime(1990, 2, 14, 4, 48, tzinfo=timezone.utc)


def iso(epoch):
    return epoch.isoformat(timespec='seconds').replace('+00:00', 'Z')


def query(target, epochs, **times):
    url = API + '?' + urlencode(dict(
        format='json', COMMAND=target, OBJ_DATA='NO', CENTER='500@10',
        EPHEM_TYPE='VECTORS', REF_SYSTEM='ICRF', REF_PLANE='FRAME',
        VEC_CORR='NONE', OUT_UNITS='AU-D', VEC_TABLE='2', CSV_FORMAT='YES',
        TIME_TYPE='UT', TIME_DIGITS='SECONDS', **times,
    ))
    with urlopen(url, timeout=60) as response:
        result = json.load(response)
    text = result.get('result', '')
    metadata = re.search(r'^Target body name: .*?\(' + target + r'\)\s+\{source: ([^}]+)\}', text, re.M)
    if (result.get('error') or not metadata or '$$SOE' not in text or '$$EOE' not in text
            or not re.search(r'^Center body name: Sun \(10\)', text, re.M)
            or not re.search(r'^Reference frame\s*: ICRF\b', text, re.M)
            or not re.search(r'^Output units\s*: AU-D\b', text, re.M)
            or not re.search(r'^Output type\s*: GEOMETRIC cartesian states', text, re.M)
            or not re.search(r'^Start time\s*: .* UT\b', text, re.M)):
        raise ValueError(result.get('error') or text or 'Missing Horizons result')
    rows = list(csv.reader(text.split('$$SOE', 1)[1].split('$$EOE', 1)[0].strip().splitlines()))
    if len(rows) != len(epochs):
        raise ValueError(f'{target}: expected {len(epochs)} states, found {len(rows)}')
    samples = []
    for row, epoch in zip(rows, epochs, strict=True):
        time = datetime.strptime(row[1].strip(), 'A.D. %Y-%b-%d %H:%M:%S.%f').replace(tzinfo=timezone.utc)
        values = [float(value) for value in row[2:8]]
        if time != epoch or len(values) != 6 or not all(map(math.isfinite, values)):
            raise ValueError(f'{target}: unexpected state {row} for {iso(epoch)}')
        samples.append([iso(epoch), *values])
    return {'query': url, 'solution': metadata[1], 'samples': samples}


def main():
    missions = {}
    for name, (target, start_year) in MISSIONS.items():
        epochs = [datetime(y, 1, 1, tzinfo=timezone.utc) for y in range(start_year, END_YEAR + 1)]
        missions[name] = query(target, epochs, START_TIME=f'{start_year}-01-01',
                               STOP_TIME=f'{END_YEAR}-01-01', STEP_SIZE="'1 y'")
    photo = query('-31', [PHOTO_TIME], TLIST=PHOTO_TIME.strftime("'%Y-%m-%d %H:%M:%S'"), TLIST_TYPE='CAL')
    if photo['solution'] != missions['voyager-1']['solution']:
        raise ValueError('Voyager 1 trajectory changed between requests; regenerate the dataset')
    bundle = {
        'source': 'NASA/JPL Solar System Dynamics – Horizons',
        'retrieved': datetime.now(timezone.utc).date().isoformat(),
        'rights': f'Public domain ephemeris data per {RIGHTS}; no endorsement implied.',
        'frame': 'Sun center, ICRF equatorial, geometric, UTC; positions in AU and velocities in AU/day.',
        'historical': {'photoSource': PHOTO, **photo},
        'missions': missions,
    }
    # Keep one state per line without losing the source's precision.
    body = re.sub(r'\[\n\s+("\d{4}-[^\n]+)\n((?:\s+[-+\de.]+,?\n){6})\s+\]',
                  lambda match: '[' + match[1] + ' ' + ' '.join(match[2].split()) + ']',
                  json.dumps(bundle, indent=2, ensure_ascii=False))
    output = Path(__file__).resolve().parents[1] / 'src' / 'explorer' / 'spacecraft-snapshots.json'
    output.write_text(body + '\n', encoding='utf-8', newline='\n')
    print(f'Wrote {sum(len(entry["samples"]) for entry in missions.values()) + 1} states to {output.name}')


if __name__ == '__main__':
    main()
