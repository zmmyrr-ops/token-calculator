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

sys.path.insert(0, 'frontend/public/ai-eyes-tool/v4/scripts')
import collect_claude_sample as cc
with tempfile.TemporaryDirectory() as d:
 p=Path(d)/'projects'/'project';p.mkdir(parents=True)
 def event(text,**extra):
  return dict(type='user',sessionId='old',timestamp='2026-09-18T01:00:00Z',message={'role':'user','content':text},**extra)
 events=[event('请先整理计划再开始实现'),event('请先整理计划再开始实现'),event([{'type':'tool_result','content':'不能采集工具输出'}]),event('子代理消息',isSidechain=True),event('系统注入',isMeta=True),{**event('范围外消息'),'timestamp':'2020-01-01T00:00:00Z'},event([{'type':'text','text':'请用中文说明这次修改'}])]
 f=p/'old.jsonl';f.write_text('\n'.join(json.dumps(x) for x in events));before=f.read_bytes()
 (p/'current.jsonl').write_text(json.dumps({**event('当前会话不要采集'),'sessionId':'current'}))
 (p/'execution.jsonl').write_text('\n'.join(json.dumps(event(t)) for t in ['不应进入样本','AI_EYES_EXECUTION_V4']))
 (p/'subagents').mkdir();(p/'subagents'/'agent.jsonl').write_text(json.dumps(event('嵌套代理不采集')))
 out=cc.collect(d,c.stamp('2026-09-17T00:00:00Z'),c.stamp('2026-09-19T00:00:00Z'),'current')
 assert len(out['sessions'])==1
 assert set(out['sessions'][0]['messages'])=={'请先整理计划再开始实现','请用中文说明这次修改'}
 assert f.read_bytes()==before
 print('Claude adapter range / current / tool / subagent / marker / dedup / read-only passed')
