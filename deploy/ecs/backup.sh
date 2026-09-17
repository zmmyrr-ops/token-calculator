#!/usr/bin/env bash
set -euo pipefail
app_env=${1:?environment required}
[[ "$app_env" == production || "$app_env" == staging ]] || exit 2
root=/opt/mendao
container=$(docker compose -p "mendao-$app_env" --env-file "$root/$app_env/release.env" -f "$root/compose.yaml" ps -q backend)
[[ -n "$container" ]] || exit 1
docker exec "$container" node --input-type=module -e '
import {DatabaseSync,backup} from "node:sqlite";
import {mkdirSync,chmodSync,readdirSync,statSync,unlinkSync} from "node:fs";
const dir="/app/storage/backups"; mkdirSync(dir,{recursive:true,mode:0o700});
const db=new DatabaseSync("/app/storage/mendao.sqlite");
const target=dir+"/"+new Date().toISOString().replace(/:/g,"-")+".sqlite";
await backup(db,target); db.close(); chmodSync(target,0o600);
const check=new DatabaseSync(target,{readOnly:true});
if(check.prepare("PRAGMA integrity_check").get().integrity_check!=="ok") throw Error("Backup validation failed");
check.close();
for(const name of readdirSync(dir)) if(name.endsWith(".sqlite") && Date.now()-statSync(dir+"/"+name).mtimeMs>14*86400000) unlinkSync(dir+"/"+name);
console.log("Verified database backup created");'
