export function buildVersion(build){
  const match=/^(\d+\.\d+\.\d+)/.exec(String(build||''));
  return match?'v'+match[1]:null;
}
export function syncBuildLabels(doc=globalThis.document){
  if(!doc)return null;
  const version=buildVersion(doc.documentElement?.dataset?.build);
  if(!version)return null;
  for(const el of doc.querySelectorAll('[data-build-label]'))
    if(el.textContent!==version)el.textContent=version;
  return version;
}
