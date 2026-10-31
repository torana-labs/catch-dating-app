/* Local synthetic spreadsheet rehearsal. Never initializes Firebase Admin. */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const http = require('node:http');
const root = path.resolve(process.env.CATCH_DEMO_SOURCE_ROOT || path.join(__dirname, '../../..'));
const from = name => require(path.join(root, 'functions/lib', name));
const {Timestamp} = require(path.join(root, 'functions/node_modules/firebase-admin')).firestore;
const {AudienceTestStore} = from('organizers/organizerAudienceTestStore');
const {importEventAttendeesHandler} = from('events/eventAttendees');
const {projectEventAttendeeToOrganizerAudience} = from('organizers/organizerAudienceProjection');
const organizerId = 'demo-saket-import', eventId = 'demo-rsvp-spreadsheet';
class ImportStore extends AudienceTestStore {
  batch() {
    const writes = [];
    return {
      set: (ref, data, options) => writes.push(() => this.write(ref, data, options?.merge === true)),
      delete: ref => writes.push(() => { delete this.docs[ref.path]; }),
      create: (ref, data) => writes.push(() => {
        assert.equal(this.docs[ref.path], undefined, 'Duplicate batch create');
        this.write(ref, data);
      }),
      commit: async () => { writes.forEach(write => write()); },
    };
  }
}
const store = new ImportStore({
  [`organizers/${organizerId}`]: {ownerUserId:'demo-host', hostUserIds:['demo-host'], hostProfiles:[], name:'Saket Run Club',imageUrl:null},
  [`events/${eventId}`]: {organizerId,status:'active',name:'RSVP Escape — spreadsheet demo',eventFormat:{activityKind:'singlesMixer'}},
});
const deps = {firestore:()=>store.asFirestore(),timestamp:()=>Timestamp.fromMillis(Date.parse('2026-09-21T10:00:00Z')),checkRateLimit:async()=>{},identitySecret:()=> 'LOCAL-SYNTHETIC-ONLY-'.repeat(4)};
const entities = prefix => Object.entries(store.docs).filter(([key])=>key.startsWith(prefix+'/')).map(([key,value])=>({id:key.split('/').at(-1),...value}));
async function importRows(payload, project = projectEventAttendeeToOrganizerAudience) {
  if(payload.eventId !== eventId) throw Error('Synthetic demo event only');
  const before = new Map(entities('eventAttendees').map(row=>[row.id,row]));
  const receipt = await importEventAttendeesHandler({auth:{uid:'demo-host',token:{}},data:payload},deps);
  // Retry projection after a committed roster receipt; production receipts make it idempotent.
  // Ignore rows since superseded by another import when replaying an older receipt.
  for(const row of entities('eventAttendees').filter(row=>row.importId===receipt.importId)) {
    await project(row.id,before.get(row.id),row,receipt.importId,deps);
  }
  return {receipt,attendees:entities('eventAttendees'),contactCount:entities('organizerContacts').length};
}
async function verify() {
  const rows=[
    {rowId:'2',displayName:'Maya Demo',phone:'+12025550101',email:'maya@example.com',status:'registered',revenueAmountMinor:150000,revenueCurrency:'INR',revenueSource:'hostImport'},
    {rowId:'3',displayName:'Arjun Demo',phone:'+12025550102',email:'arjun@example.com',status:'registered',revenueAmountMinor:150000,revenueCurrency:'INR',revenueSource:'hostImport'},
    {rowId:'4',displayName:'Asha Demo',phone:'+12025550103',email:'asha@example.com',status:'waitlisted'},
  ];
  const payload={eventId,importKey:'rsvp-synthetic-import-v1',fileName:'rsvp-synthetic-bookings.xlsx',format:'xlsx',rows};
  const first=await importRows(payload), second=await importRows(payload);
  assert.equal(first.receipt.createdCount,3);
  assert.equal(first.contactCount,3);
  assert.equal(second.receipt.replayed,true);
  assert.equal(second.attendees.length,3);
  assert.equal(first.attendees.filter(row=>row.status==='registered').length,2);
  assert.equal(first.attendees.filter(row=>row.status==='waitlisted').length,1);
  assert.equal(first.attendees.reduce((sum,row)=>sum+(row.revenueAmountMinor||0),0),300000);
  assert.equal(first.attendees.find(row=>row.status==='waitlisted').revenueAmountMinor,null);
  assert.equal(entities('payments').length,0);
  await assert.rejects(importRows({...payload,eventId:'not-this-demo'}),/Synthetic demo/);
  await assert.rejects(importRows({...payload,rows:[...rows,{...rows[0],rowId:'5'}]}),/already used/);
  const corrected = {...payload,importKey:'rsvp-synthetic-import-v2',rows:[
    {...rows[0],email:'maya.corrected@example.com',status:'waitlisted'},rows[1],rows[2],
  ]};
  await assert.rejects(importRows(corrected,async()=>{throw Error('Injected projection interruption');}),/Injected/);
  const recovered=await importRows(corrected);
  assert.equal(recovered.receipt.replayed,true);
  assert.equal(recovered.attendees.length,3);
  assert.equal(recovered.contactCount,3);
  const maya=entities('organizerContacts').find(row=>row.email==='maya.corrected@example.com');
  assert.ok(maya,'Corrected email reaches CRM on retry');
  assert.equal(store.docs[`organizerContactTraits/${maya.id}`].expectedEventCount,0);
  const afterCorrection=JSON.stringify(entities('organizerAudienceSummaries'));
  await importRows(corrected);
  assert.equal(JSON.stringify(entities('organizerAudienceSummaries')),afterCorrection);
  await importRows(payload);
  assert.equal(store.docs[`organizerContactTraits/${maya.id}`].expectedEventCount,0,'Old replay cannot revert latest traits');
  console.log('Verified 3 attendees and CRM people, source revenue, idempotent replay, corrected-email evidence cleanup, changed-import traits, projection retry recovery, and no Catch payments.');
}
if(process.argv.includes('--verify')) {
  verify().catch(error=>{console.error(error);process.exitCode=1;});
} else {
  const workbookPath=process.argv[2];
  if(!workbookPath || path.extname(workbookPath)!=='.xlsx') throw Error('Pass a synthetic XLSX file path, or --verify.');
  const workbook=fs.readFileSync(workbookPath);
  if(workbook.length>5*1024*1024) throw Error('Demo workbook exceeds 5 MB');
  http.createServer(async(req,res)=>{
    const origin=req.headers.origin;
    if(origin && !/^http:\/\/(127\.0\.0\.1|localhost):8791$/.test(origin)){res.writeHead(403);res.end();return;}
    if(origin)res.setHeader('Access-Control-Allow-Origin',origin);
    res.setHeader('Access-Control-Allow-Headers','Content-Type');
    if(req.method==='OPTIONS'){res.writeHead(204);res.end();return;}
    res.setHeader('Content-Type','application/json');
    try {
      if(req.method==='GET' && req.url==='/workbook'){
        res.end(JSON.stringify({fileName:path.basename(workbookPath),base64:workbook.toString('base64'),eventId}));return;
      }
      if(req.method!=='POST' || req.url!=='/import') throw Error('Unsupported local demo operation');
      let body='';for await(const chunk of req){body+=chunk;if(body.length>500000)throw Error('Request too large');}
      res.end(JSON.stringify(await importRows(JSON.parse(body))));
    } catch(error) {res.writeHead(400);res.end(JSON.stringify({error:error.message}));}
  }).listen(8792,'127.0.0.1',()=>console.log('Synthetic import API: http://127.0.0.1:8792'));
}
