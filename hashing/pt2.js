#!/usr/bin/env gjs

String.prototype.format = imports.format.format;

const GLib = imports.gi.GLib;
const ByteArray = imports.byteArray;

imports.searchPath.unshift('.');
imports.searchPath.unshift('../eclipse60@blackjackshellac.ca');

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

function hash_hex(buff) {
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

let input_string=ARGV.length === 0 ? new Date().toString() : ARGV.join(' ');
print("'"+input_string+"'");

let input_data = ByteArray.fromString(input_string);

let digest=FastSha256.sha256(input_data);
// for (let i=0; i < digest.length; i++) {
//   print("i=%d %02x".format(i, digest[i])); //i="+i+" "+hex);
// }

print("digest="+digest);

function perf_test(desc, input_data, loops, callback) {
  print("\nloops="+loops);
  let z;
  let start=new Date();
  print(desc+": "+callback(input_data));
  loops--;
  for (let i=0; i < loops; i++) {
    z=callback(input_data);
  }
  let end=new Date();
  let ms=(end-start);
  let rate=Math.floor(loops/ms*1000);
  let data_len=input_data.length*loops;
  let mbps = (data_len/ms*1000/1024/1024).toFixed(2);
  print(desc+": ms="+ms+" msg rate="+rate+"/sec "+" data rate="+mbps+" MB/s");
}

let count=0;
let loops=100000;
perf_test("fast_sha256+hash_hex", input_data, loops, (data) => {
  let digest=FastSha256.sha256(data);
  return hash_hex(digest);
});

perf_test("fast_sha256+base64", input_data, loops, (data) => {
  let digest=FastSha256.sha256(data);
  return Base64.bytesToBase64(digest);
});

//let hh=Sha256.hash(input_data);
perf_test("sha256.hash.hex", input_data, loops, (data) => {
  count+=1;
  let digest=Sha256.hash(data);
  return hash_hex(digest);
});

perf_test("sha256.hash.base64", input_data, loops, (data) => {
  count+=1;
  let digest=Sha256.hash(data);
  return Base64.bytesToBase64(digest);
});

print(input_data);
//bash -c "echo -n 'this is a test' | sha256sum"


let cmd="bash -c 'echo -n \"%s\" | sha256sum -'".format(input_string);
print(cmd);
let [ ok, stdout, stderr, status] = GLib.spawn_command_line_sync(cmd);
if (ok) {
  print(ByteArray.toString(stdout));
} else {
  print(ByteArray.toString(stderr));
}
//print(count);
//print(Sha256.profile());
