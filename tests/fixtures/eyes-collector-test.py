import sys
sys.dont_write_bytecode = True
import importlib.util,tempfile,json
from pathlib import Path
spec=importlib.util.spec_from_file_location('c','frontend/public/ai-eyes-tool/v4/scripts/collect_sample.py');c=importlib.util.module_from_spec(spec);spec.loader.exec_module(c)
with tempfile.TemporaryDirectory() as d:
 p=Path(d)/'sessions';p.mkdir();f=p/'test.jsonl'
 events=[{'type':'session_meta','payload':{'id':'old','source':'cli'}},{'type':'event_msg','timestamp':'2026-09-18T01:00:00Z','payload':{'type':'user_message','message':'帮我把这个标题再具体一点'}},{'type':'event_msg','timestamp':'2026-09-18T01:01:00Z','payload':{'type':'user_message','message':'帮我把这个标题再具体一点'}},{'type':'event_msg','timestamp':'2020-01-01T01:00:00Z','payload':{'type':'user_message','message':'时间外应忽略'}}]
 f.write_text('\n'.join(json.dumps(x) for x in events));before=f.read_bytes();out=c.collect(d,c.stamp('2026-09-17T00:00:00Z'),c.stamp('2026-09-19T00:00:00Z'),'current');assert len(out['sessions'][0]['messages'])==1;assert before==f.read_bytes();print('collector range / dedup / read-only fixture passed')

assert "sk-test" not in c.clean("请查看 sk-test-placeholder")
assert "ghp_test" not in c.clean("请查看 ghp_test_placeholder")
