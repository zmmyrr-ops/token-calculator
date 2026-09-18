#!/usr/bin/env python3
"""Credentials are read from a private file, never a CLI argument. No response body logging."""
import argparse,json,os,re,time,urllib.request,urllib.error
from pathlib import Path
from urllib.parse import urlparse

def send(config,action,data=None):
    base=config['base'].rstrip('/')
    parsed=urlparse(base)
    if parsed.scheme!='https' or parsed.hostname!='ruming.top' or parsed.port or parsed.username or parsed.query or parsed.fragment or parsed.path not in ['/api/v1/ai-eyes','/staging/api/v1/ai-eyes']:
        raise ValueError('Only the official HTTPS API is allowed')
    if not re.fullmatch(r'[A-Za-z0-9_-]{24}',config['run_id']):raise ValueError('Invalid run')
    request=urllib.request.Request(base+'/runs/'+config['run_id']+'/'+action,headers={'Authorization':'Bearer '+config['submit_token'],'Content-Type':'application/json'},data=None if data is None else json.dumps(data,ensure_ascii=False).encode())
    class NoRedirect(urllib.request.HTTPRedirectHandler):
        def redirect_request(self,*args,**kwargs):return None
    for attempt in range(4):
        try:
            with urllib.request.build_opener(NoRedirect).open(request,timeout=20) as response:return json.load(response)
        except urllib.error.HTTPError as e:
            if e.code<500 or attempt==3:raise ValueError('API status '+str(e.code)) from None
        except (urllib.error.URLError,TimeoutError):
            if attempt==3:raise ValueError('Network failure') from None
        time.sleep([1,3,9][attempt])

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--config',required=True);p.add_argument('--action',choices=['execution','progress','result','failure'],required=True);p.add_argument('--data');p.add_argument('--output');a=p.parse_args()
    config=json.loads(Path(a.config).read_text());data=json.loads(Path(a.data).read_text()) if a.data else None
    if a.action=='result':
        from validate_match import validate
        validate(data)
    result=send(config,a.action,data)
    if a.output:
        fd=os.open(a.output,os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600)
        with os.fdopen(fd,'w') as f:json.dump(result,f,ensure_ascii=False)
    print(json.dumps({'ok':True}))
