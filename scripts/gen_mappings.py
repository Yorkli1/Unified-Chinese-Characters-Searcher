#!/usr/bin/env python3
"""Generate s2t.json and t2s.json character mapping files for the plugin."""

import json, os, urllib.request

st_url = "https://raw.githubusercontent.com/BYVoid/OpenCC/master/data/dictionary/STCharacters.txt"
ts_url = "https://raw.githubusercontent.com/BYVoid/OpenCC/master/data/dictionary/TSCharacters.txt"

def parse_dict(url):
    data = urllib.request.urlopen(url).read().decode('utf-8')
    mapping = {}
    for line in data.split('\n'):
        line = line.strip()
        if not line or line.startswith('#'):
            continue
        parts = line.split('\t')
        if len(parts) >= 2:
            key = parts[0]
            values = parts[1].split(' ') if ' ' in parts[1] else [parts[1]]
            if len(key) == 1 and values[0] and len(values[0]) == 1:
                mapping[key] = values[0]
    return mapping

os.chdir(os.path.dirname(os.path.abspath(__file__)))

print("Downloading STCharacters.txt (simplified→traditional)...")
st = parse_dict(st_url)
print(f"  Got {len(st)} mappings")

print("Downloading TSCharacters.txt (traditional→simplified)...")
ts = parse_dict(ts_url)
print(f"  Got {len(ts)} mappings")

os.makedirs('../data', exist_ok=True)

with open('../data/s2t.json', 'w', encoding='utf-8') as f:
    json.dump(st, f, ensure_ascii=False, separators=(',', ':'))

with open('../data/t2s.json', 'w', encoding='utf-8') as f:
    json.dump(ts, f, ensure_ascii=False, separators=(',', ':'))

print(f"\nFiles written:")
print(f"  data/s2t.json: {len(st)} entries")
print(f"  data/t2s.json: {len(ts)} entries")

# Verify
for s in ['剑', '龍', '門', '愛', '國', '馬', '長', '發', '雲']:
    t = st.get(s, '?')
    s2 = ts.get(t, '?')
    print(f"  {s} → {t} → {s2}")
