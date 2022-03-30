#!/usr/bin/env gjs

const GLib = imports.gi.GLib;
const ByteArray = imports.byteArray;

imports.searchPath.unshift('.');
imports.searchPath.unshift('../eclipse60@blackjackshellac.ca/');
var FastSha256 = imports.fast_sha256;
var Base64 = imports.base64;
var Sha256 = imports.sha256;

function bufferToHex (buffer) {
  return [...new Uint8Array (buffer)]
    .map (b => b.toString (16).padStart (2, "0"))
    .join ("");
}

const byteToHex = [];

for (let n = 0; n <= 0xff; ++n) {
    const hexOctet = n.toString(16).padStart(2, "0");
    byteToHex.push(hexOctet);
}

function hex(buff)
{
  //const buff = arrayBuffer; //new Uint8Array(arrayBuffer);
  //const hexOctets = []; // new Array(buff.length) is even faster (preallocates necessary array size), then use hexOctets[i] instead of .push()
  const hexOctets = new Array(buff.length);

    for (let i = 0; i < buff.length; ++i) {
    hexOctets[i] = byteToHex[buff[i]]
        //hexOctets.push(byteToHex[buff[i]]);
  }

    return hexOctets.join("");
}

const byteToHash = {};
for (let n = 0; n <= 0xff; ++n) {
    const hexOctet = n.toString(16).padStart(2, "0");
    byteToHash[n]=hexOctet;
}

function hash_hex(buff)
{
  const hexOctets = new Array(buff.length);

    for (let i = 0; i < buff.length; ++i) {
    hexOctets[i] = byteToHash[buff[i]]
  }
    return hexOctets.join("");
}

function base64ToHex(str) {
  const raw = ByteArray.fromString(str); //atob(str);
  let result = '';
  for (let i = 0; i < raw.length; i++) {
    const hex = raw.charCodeAt(i).toString(16);
    result += (hex.length === 2 ? hex : '0' + hex);
  }
  return result.toUpperCase();
}

let now=ARGV.length === 0 ? new Date().toString() : ARGV.join(' ');
print(now);

now=ByteArray.fromString(now);
function perf_test(desc, h, loops, callback) {
  print("\nloops="+loops);
  let z;
  let start=new Date();
  print(desc+": "+callback(h));
  for (let i=0; i < loops; i++) {
    z=callback(h);
  }
  let end=new Date();
  let ms=(end-start);
  let rate=Math.floor(loops/ms*1000);
  print(desc+": ms="+ms+" rate="+rate+"/sec");
}

let count=0;
let loops=100000;
let hh=FastSha256.sha256(now);
perf_test("fast_sha256+hash_hex", hh, loops, (uint8array) => {
  count += 1;
  hh=FastSha256.sha256(now);
  return hash_hex(hh);
});

print(count);
//perf_test("sha256.hash.hex", Sha256.hash(now), loops, (uint8array) => {
//  let hh=Sha256.hash(now);
//  return hash_hex(hh);
//});

