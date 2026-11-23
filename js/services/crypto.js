/**
 * Encryption helpers: AES-256-GCM with a key derived from the passphrase (PBKDF2, 200,000 rounds).
 * The passphrase lives only in memory (or, if the user ticks "remember", in this browser's storage).
 */
const E=new TextEncoder(),D=new TextDecoder();
let pass=null;
const keys=new Map();

export const b64=u=>{let s="";for(let i=0;i<u.length;i+=0x8000)s+=String.fromCharCode(...u.subarray(i,i+0x8000));return btoa(s);};
export const unb64=s=>Uint8Array.from(atob(s.replace(/\s/g,"")),c=>c.charCodeAt(0));
export const rnd=()=>b64(crypto.getRandomValues(new Uint8Array(16)));
export const encode=text=>E.encode(text);
export const decode=bytes=>D.decode(bytes);

/** Set (or clear, with null) the passphrase. Also drops any cached keys. */
export function setPassphrase(p){pass=p;keys.clear();}
export const getPassphrase=()=>pass;

async function keyFor(salt){
 if(!keys.has(salt)){const base=await crypto.subtle.importKey("raw",E.encode(pass),"PBKDF2",false,["deriveKey"]);
  keys.set(salt,await crypto.subtle.deriveKey({name:"PBKDF2",salt:unb64(salt),iterations:200000,hash:"SHA-256"},base,{name:"AES-GCM",length:256},false,["encrypt","decrypt"]));}
 return keys.get(salt);
}
/** Encrypt text. Returns {salt, iv, data} (all base64). */
export async function seal(text,salt){const iv=crypto.getRandomValues(new Uint8Array(12));
 return {salt,iv:b64(iv),data:b64(new Uint8Array(await crypto.subtle.encrypt({name:"AES-GCM",iv},await keyFor(salt),E.encode(text))))};}
/** Decrypt what seal() produced. Throws a readable error for a wrong passphrase or damaged data. */
export async function open(e){try{return D.decode(await crypto.subtle.decrypt({name:"AES-GCM",iv:unb64(e.iv)},await keyFor(e.salt),unb64(e.data)));}
 catch{throw new Error("Wrong passphrase, or the data is damaged");}}
