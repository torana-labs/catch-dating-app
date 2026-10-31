/* Local-only synthetic fixture. Uses normal handlers against an in-memory store.
 * It never initializes Firebase Admin or writes a real account. */
const path = require('node:path');
const fs = require('node:fs');
const root = path.resolve(__dirname, '../../..');
const from = name => require(path.join(root, 'functions/lib', name));
const {Timestamp} = require(path.join(root, 'functions/node_modules/firebase-admin')).firestore;
const {AudienceTestStore} = from('organizers/organizerAudienceTestStore');
const forms = from('organizers/organizerForms');
const responses = from('organizers/organizerFormResponses');
const operations = from('organizers/organizerFormOperations');
const applications = from('organizers/organizerApplications');
const {projectApplicationPurposeResponse} = from('organizers/organizerFormAutomations');
const {genericFormApplicationId} = from('organizers/organizerApplicationAccess');
const {convertOrganizerFormResponseHandler} = from('organizers/organizerFormConversions');
const {projectEventAttendeeToOrganizerAudience} = from('organizers/organizerAudienceProjection');
(async () => {
 const {buildRsvpFormDefinition, cities} = await import('./form_definition.mjs');
 const definition = buildRsvpFormDefinition();
 const organizerId='demo-saket', eventId='rsvp-demo-mumbai';
 let clock = Date.parse('2026-09-21T10:00:00Z');
 const store = new AudienceTestStore({[`organizers/${organizerId}`]: {
  ownerUserId:'demo-host',hostUserIds:['demo-host'],hostProfiles:[],name:'Saket Run Club',imageUrl:null,
 },[`events/${eventId}`]: {organizerId,status:'active',name:'RSVP Escape — Mumbai demo',eventFormat:{activityKind:'singlesMixer'}}});
 const deps = {firestore:()=>store.asFirestore(),timestamp:()=>Timestamp.fromMillis(clock),
  checkRateLimit:async()=>{}, identitySecret:()=> 'LOCAL-SYNTHETIC-ONLY-'.repeat(4),
  publicFormId:()=> 'demo_public_rsvp_1234567890123456',
  storageBucket:()=>({file:()=>({getSignedUrl:async()=>['https://example.com/synthetic-photo.png']})})};
 const host = data=>({auth:{uid:'demo-host',token:{}},data});
 const created = await forms.createOrganizerFormHandler(host({organizerId,templateId:'blank',requestId:'demo-create',title:definition.title,defaultTargetKind:'organizer',defaultTargetId:null}),deps);
 const formId=created.form.formId;
 const updated=await forms.updateOrganizerFormDraftHandler(host({organizerId,formId,expectedRevision:1,definition}),deps);
 await forms.publishOrganizerFormHandler(host({organizerId,formId,expectedRevision:updated.form.draftRevision}),deps);
 const guests=[['Maya Demo','Mumbai','Life Partner'],['Arjun Demo','Mumbai','Romantic Relationship'],['Asha Demo','Bangalore','Friendship'],['Kabir Demo','Bangalore','Fun Experience'],['Priya Demo','Hyderabad','Life Partner'],['Dev Demo','Ahmedabad','Networking'],['Sara Demo','Dubai','Romantic Relationship'],['Rohan Demo','Dubai','Friendship']];
 const homeMarketId={Mumbai:'in-mh-mumbai',Bangalore:'in-ka-bengaluru',Hyderabad:'in-tg-hyderabad',Ahmedabad:'in-gj-ahmedabad',Dubai:'in-mh-mumbai'};
 const records=[];
 for(const [index,[name,city,intent]] of guests.entries()) {
  clock+=60000;
  const email=`rsvp-demo-${index+1}@example.com`,phone=`+1202555010${index+1}`;
  const guest=data=>({auth:{uid:`synthetic-${index}`,token:{phone_number:phone}},data});
  const started=await responses.beginOrganizerFormResponseHandler(guest({publicFormId:deps.publicFormId(),requestId:`demo-rsvp-start-${index}`,sourceToken:null}),deps);
  const answers={};
  for(const q of definition.sections.flatMap(s=>s.questions)) {
   answers[q.questionId]=q.kind==='number'?32:q.kind==='boolean'||q.kind==='acknowledgement'?true:q.kind==='singleChoice'?q.options[0].value:q.kind==='multiChoice'?[q.options[0].value]:q.kind==='file'?[`formasset_demo_${index}`]:q.kind==='date'?'1994-06-10':q.kind==='url'?'https://www.linkedin.com/':'Synthetic demo answer';
  }
  Object.assign(answers,{rsvp_fullName:name,rsvp_email:email,rsvp_phone:phone,rsvp_eventCity:city,rsvp_homeCity:homeMarketId[city],rsvp_intent:intent,rsvp_height:5.7,rsvp_instagram:`https://www.instagram.com/rsvp_demo_${index+1}_synthetic/`,rsvp_gender:index%2?'Male':'Female'});
  if(city!=='Dubai'){delete answers.rsvp_dubaiYears;delete answers.rsvp_singlesTravel;}
  store.docs[`organizerFormAssets/formasset_demo_${index}`]={organizerId,formId,versionId:started.form.versionId,draftId:started.draftId,questionId:'rsvp_photo',respondentUid:`synthetic-${index}`,status:'ready',deletedAt:null,storagePath:'synthetic-only',originalFileName:'synthetic-demo.png',contentType:'image/png',sizeBytes:100};
  const saved=await responses.saveOrganizerFormResponseDraftHandler(guest({draftId:started.draftId,draftToken:null,expectedRevision:started.revision,answers,consentAccepted:true}),deps);
  const receipt=await responses.submitOrganizerFormResponseHandler(guest({draftId:started.draftId,draftToken:null,expectedRevision:saved.revision,requestId:`demo-rsvp-submit-${index}`}),deps);
  const response=store.docs[`organizerFormResponses/${receipt.responseId}`];
  await projectApplicationPurposeResponse(receipt.responseId,undefined,response,deps);
  const applicationId=genericFormApplicationId(receipt.responseId);
  if(index===1||index===2||index===4) {
   const reviewStatus=index===1?'approved':index===2?'waitlisted':'declined';
   const current=await applications.getOrganizerApplicationDetailHandler(host({organizerId,applicationId}),deps);
   await applications.reviewOrganizerApplicationHandler(host({organizerId,applicationId,expectedRevision:current.revision,reviewStatus,reviewNote:'Synthetic demonstration decision.'}),deps);
   if(index===1){const admitted=await convertOrganizerFormResponseHandler(host({organizerId,responseId:receipt.responseId,kind:'eventAttendeeProposal',eventId,overrides:{},requestId:'demo-admit'}),deps);await projectEventAttendeeToOrganizerAudience(admitted.resultId,undefined,store.docs[`eventAttendees/${admitted.resultId}`],'demo-roster',deps);}
  }
  records.push({responseId:receipt.responseId,applicationId,answers});
 }
 const editor=await forms.getOrganizerFormEditorHandler(host({organizerId,formId}),deps);
 const listing=await operations.listOrganizerFormResponsesHandler(host({organizerId,formId,versionId:null,statuses:[],identityKinds:[],sourceLinkId:null,query:null,fromMillis:null,toMillis:null,cursor:null,limit:25}),deps);
 const details={},applicationDetails={};
 for(const record of records){details[record.responseId]=await operations.getOrganizerFormResponseDetailHandler(host({organizerId,responseId:record.responseId}),deps);applicationDetails[record.applicationId]=await applications.getOrganizerApplicationDetailHandler(host({organizerId,applicationId:record.applicationId}),deps);}
 const fixture={label:'LOCAL PREVIEW — synthetic data; no production writes or messages',organizerId,eventId,formId,editor,listing,details,applicationDetails,records,cities,contacts:Object.entries(store.docs).filter(([key])=>key.startsWith('organizerContacts/')).map(([key,value])=>({id:key.split('/')[1],...value})),attendees:Object.entries(store.docs).filter(([key])=>key.startsWith('eventAttendees/')).map(([key,value])=>({id:key.split('/')[1],...value}))};
 fs.writeFileSync(path.join(__dirname,'fixture.json'),JSON.stringify(fixture,null,2)+'\n');
 console.log({forms:1,responses:listing.items.length,applications:Object.keys(applicationDetails).length,contacts:fixture.contacts.length,attendees:fixture.attendees.length});
 if (process.argv.some(arg=>['--serve','--verify'].includes(arg))) {
  let publicSequence = 0;
  const publicActors = new Map();
  const handlers = {
   fixture:async()=>fixture,
   submitPublic:async request => {
    const sequence = ++publicSequence;
    const uid = `synthetic-public-${sequence}`;
    const guest = data => ({auth:{uid, token:{phone_number:`+120255502${String(sequence).padStart(2,'0')}`}},data});
    const started = await responses.beginOrganizerFormResponseHandler(guest({publicFormId:deps.publicFormId(),requestId:`rsvp-public-begin-${sequence}`,sourceToken:null}),deps);
    const answers = {...request.data.answers};
    // Image selection is a local stub; the asset is scoped to this synthetic draft.
    if (answers.rsvp_photo?.length) {
     const assetId = `formasset_public_${sequence}`;
     store.docs[`organizerFormAssets/${assetId}`] = {...store.docs['organizerFormAssets/formasset_demo_0'],draftId:started.draftId,respondentUid:uid};
     answers.rsvp_photo = [assetId];
    }
    const saved = await responses.saveOrganizerFormResponseDraftHandler(guest({draftId:started.draftId,draftToken:null,expectedRevision:started.revision,answers,consentAccepted:request.data.consentAccepted}),deps);
    const receipt = await responses.submitOrganizerFormResponseHandler(guest({draftId:started.draftId,draftToken:null,expectedRevision:saved.revision,requestId:`rsvp-public-submit-${sequence}`}),deps);
    await projectApplicationPurposeResponse(receipt.responseId,undefined,store.docs[`organizerFormResponses/${receipt.responseId}`],deps);
    publicActors.set(receipt.responseId,uid);
    return receipt;
   },
   withdrawPublic:async request => {
    const uid=publicActors.get(request.data.responseId);
    if(!uid)throw Error('Only this local public demo session can withdraw its responses');
    return responses.withdrawOrganizerFormResponseHandler({auth:{uid,token:{}},data:{responseId:request.data.responseId,withdrawalToken:request.data.withdrawalToken,requestId:`rsvp-withdraw-${request.data.responseId}`}},deps);
   },
   rehearsalSnapshot:async()=>JSON.parse(fs.readFileSync(path.join(__dirname,'rehearsal_fixture.json'))),
   contactDetail:from('organizers/organizerContacts').getOrganizerContactDetailHandler,
   getEditor:forms.getOrganizerFormEditorHandler,
   updateDraft:forms.updateOrganizerFormDraftHandler,
   validateDraft:forms.validateOrganizerFormDraftHandler,
   publish:forms.publishOrganizerFormHandler,
   listResponses:operations.listOrganizerFormResponsesHandler,
   responseDetail:operations.getOrganizerFormResponseDetailHandler,
   listApplications:applications.listOrganizerApplicationsHandler,
   applicationDetail:applications.getOrganizerApplicationDetailHandler,
   reviewApplication:applications.reviewOrganizerApplicationHandler,
   previewConversion:from('organizers/organizerFormConversions').previewOrganizerFormConversionHandler,
   convertResponse:async request => {
    const result=await convertOrganizerFormResponseHandler(request,deps);
    if(request.data.kind==='eventAttendeeProposal'&&result.resultId){
     await projectEventAttendeeToOrganizerAudience(result.resultId,undefined,store.docs[`eventAttendees/${result.resultId}`],'demo-ui-roster',deps);
    }
    return result;
   },
  };
  if(process.argv.includes('--verify')) {
   const assert=require('node:assert/strict');
   const receipt=await handlers.submitPublic(host({organizerId,answers:records[0].answers,consentAccepted:true}));
   const withdrawn=await handlers.withdrawPublic(host({organizerId,responseId:receipt.responseId,withdrawalToken:receipt.withdrawalToken}));
   assert.equal(withdrawn.status,'withdrawn');
   assert.equal(store.docs[`organizerFormResponses/${receipt.responseId}`].status,'withdrawn');
   await assert.rejects(handlers.withdrawPublic(host({organizerId,responseId:records[0].responseId,withdrawalToken:null})),/Only this local public demo session/);
   console.log('Public submit and same-identity withdrawal passed; unrelated fixture withdrawal rejected.');
   return;
  }
  require('node:http').createServer(async(req,res)=>{
   const origin=req.headers.origin;
   if(origin && !/^http:\/\/(127\.0\.0\.1|localhost):(8788|5173)$/.test(origin)){res.writeHead(403);res.end();return;}
   if(origin)res.setHeader('Access-Control-Allow-Origin',origin);
   res.setHeader('Access-Control-Allow-Headers','Content-Type');
   if(req.method==='OPTIONS'){res.writeHead(204);res.end();return;}
   res.setHeader('Content-Type','application/json');
   try {
    let body='';for await(const chunk of req){body+=chunk;if(body.length>500000)throw Error('Request too large');}
    const {action,payload}=JSON.parse(body);
    if(!handlers[action])throw Error('Unsupported local demo operation');
    if(payload.organizerId!==organizerId)throw Error('Synthetic organizer only');
    res.end(JSON.stringify(await handlers[action](host(payload),deps)));
   }catch(e){res.writeHead(400);res.end(JSON.stringify({error:e.message}));}
  }).listen(8789,'127.0.0.1',()=>console.log('Local-only fixture API:127.0.0.1:8789'));
 }

})().catch(e=>{console.error(e);process.exitCode=1;});
