const {test}=require('node:test');
const assert=require('node:assert/strict');
const { hashPassword,verifyPassword,newRefreshToken,hashRefreshToken,refreshExpiresAt,issueAccessToken,verifyAccessToken }=require('../dist/modules/auth/security/auth-crypto.js');
const settings={secret:'01234567890123456789012345678901',issuer:'dashboard-3d',audience:'dashboard-3d-web'};
const oid1='0123456789abcdef01234567',oid2='0123456789abcdef01234568';
test('scrypt hash never stores original password and uses random salt',async()=>{
 const p='  🔐  MậtKhẩu_2026!';const a=await hashPassword(p),b=await hashPassword(p);
 assert.notEqual(a,b);assert.equal(a.includes(p),false);assert.equal(await verifyPassword(p,a),true);
 assert.equal(await verifyPassword(p.trim(),a),false);assert.equal(await verifyPassword('wrong',a),false);
});
test('malformed stored hash fails safely',async()=>{for(const invalid of ['','plaintext','scrypt-v1$x$y','scrypt-v1$%%%$%%%'])assert.equal(await verifyPassword('correct',invalid),false);});
test('refresh token is random and is only persisted as a SHA-256 digest',()=>{
 const a=newRefreshToken(),b=newRefreshToken();assert.notEqual(a,b);assert.equal(Buffer.from(a,'base64url').length,32);
 assert.match(hashRefreshToken(a),/^[a-f0-9]{64}$/);assert.notEqual(hashRefreshToken(a),hashRefreshToken(b));
 assert.equal(refreshExpiresAt(new Date('2026-01-01T00:00:00Z')).toISOString(),'2026-01-08T00:00:00.000Z');
});
test('access token has strict TTL, audience, issuer and signature',()=>{
 const {accessToken,expiresIn}=issueAccessToken(oid1,oid2,settings,1_700_000_000);
 assert.equal(expiresIn,900);assert.equal(verifyAccessToken(accessToken,settings,1_700_000_899)?.sub,oid1);
 assert.equal(verifyAccessToken(accessToken,settings,1_700_000_900),null);
 assert.equal(verifyAccessToken(accessToken,{...settings,audience:'other'},1_700_000_100),null);
 assert.equal(verifyAccessToken(accessToken,{...settings,secret:'other-secret-of-at-least-32-characters'},1_700_000_100),null);
 const pieces=accessToken.split('.');const header=Buffer.from(JSON.stringify({alg:'none',typ:'JWT'})).toString('base64url');
 assert.equal(verifyAccessToken([header,...pieces.slice(1)].join('.'),settings,1_700_000_100),null);
 assert.equal(verifyAccessToken(accessToken+'x',settings,1_700_000_100),null);
});
test('secret shorter than 32 bytes is rejected',()=>assert.throws(()=>issueAccessToken(oid1,oid2,{...settings,secret:'short'},1_700_000_000)));
