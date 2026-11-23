/**
 * Thin GitHub REST client for the private data repository: read a file, write a file, list errors clearly.
 * It does not know about encryption or merging; github-sync.js decides what to read and write.
 */
import {b64,decode,encode,unb64} from "./crypto.js";

let ctx=()=>({repo:"",branch:"main",token:null});
/** Tell the client where to find the current repo, branch and token (called once by github-sync.js). */
export const configure=fn=>{ctx=fn;};

export const gh=(p,o={})=>{const {repo,token}=ctx();
 return fetch(`https://api.github.com/repos/${repo}${p}`,{cache:"no-store",...o,headers:{Authorization:"Bearer "+token,Accept:"application/vnd.github+json","X-GitHub-Api-Version":"2022-11-28",...(o.body?{"Content-Type":"application/json"}:{})}});};
export async function fail(r){let m="";try{m=(await r.json()).message}catch{}
 return new Error(r.status===401?"GitHub rejected the token (wrong or expired)":`${m||"GitHub error"} (HTTP ${r.status}) - check the repo name and that the token has Contents: Read and write`);}
/** Read a file. Returns {sha,text} or null when it does not exist. */
export async function getFile(path){
 const r=await gh(`/contents/${path}?ref=${encodeURIComponent(ctx().branch)}`);if(r.status===404)return null;if(!r.ok)throw await fail(r);
 const j=await r.json();let c=j.content;
 if(!c){const b=await gh(`/git/blobs/${j.sha}`);if(!b.ok)throw await fail(b);c=(await b.json()).content;}
 return {sha:j.sha,text:decode(unb64(c))};
}
/** Create or update a file. Returns {sha} or {conflict:true} when the file changed on GitHub meanwhile. */
export async function putFile(path,text,sha,msg){
 const r=await gh(`/contents/${path}`,{method:"PUT",body:JSON.stringify({message:msg,branch:ctx().branch,content:b64(encode(text)),...(sha?{sha}:{})})});
 if(r.status===409)return {conflict:true};
 if(r.status===422){const m=String((await r.clone().json().catch(()=>({}))).message||"");if(/sha|does not match|already exists/i.test(m))return {conflict:true};throw await fail(r);} // other 422 = a real problem (bad branch, empty repo...), not a conflict
 if(!r.ok)throw await fail(r);return {sha:(await r.json()).content.sha};
}
