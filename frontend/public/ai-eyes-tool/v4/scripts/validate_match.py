import json,re
from pathlib import Path
CAT=json.loads((Path(__file__).resolve().parent.parent/'persona_catalog.json').read_text())
IDS={x['id'] for x in CAT['items']}
def validate(data):
    required={'schema_version','catalog_version','persona_id','alternative_persona_id','match_notes','sample_scope'}
    if set(data)!=required or data['schema_version']!='4' or data['catalog_version']!=CAT['version']:raise ValueError('Invalid schema')
    if data['persona_id'] not in IDS or data['alternative_persona_id'] not in IDS|{None} or data['persona_id']==data['alternative_persona_id']:raise ValueError('Invalid type')
    if data['sample_scope'] not in ['limited','multiple_sessions']:raise ValueError('Invalid sample scope')
    if not isinstance(data['match_notes'],list) or len(data['match_notes'])>2:raise ValueError('Invalid notes')
    for note in data['match_notes']:
        if not isinstance(note,str) or len(note)>48 or re.search(r'https?:|@|[\\/\r\n]|\d{7,}',note):raise ValueError('Unsafe note')
    return data
