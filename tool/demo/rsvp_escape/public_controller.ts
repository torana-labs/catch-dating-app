import {useState} from 'react';
import fixture from './fixture.json';
import {visiblePublicFormSections,validatePublicFormAnswers} from '../../../website/src/features/forms/publicFormModel';
// This adapter is only aliased by the local Vite config. Production auth and
// submission are unchanged. Public rendering and visibility use shipped code.
export function usePublicFormController() {
 const form={definition:fixture.editor.definition,organizer:{name:'Neemwood Run Club',logoUrl:null}};
 const [answers,setAnswers]=useState({...fixture.records[0].answers});
 const [stage,setStage]=useState('form');
 const [receipt,setReceipt]=useState(null);
 const [pending,setPending]=useState(false);
 const [status,setStatus]=useState({message:'',tone:''});
 const localCall=async(action,payload)=>{const result=await fetch('http://127.0.0.1:8789',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,payload:{organizerId:fixture.organizerId,...payload}})});const data=await result.json();if(!result.ok)throw Error(data.error);return data;};
 const [sectionIndex,setSectionIndex]=useState(0);
 const [errors,setErrors]=useState({});
 const [consentAccepted,updateConsent]=useState(false);
 const visibleSections=visiblePublicFormSections(form.definition,answers);
 const activeSection=visibleSections[sectionIndex];
 return {form,stage,setStage,answers,sectionIndex,setSectionIndex,errors,
  consentAccepted,updateConsent,visibleSections,activeSection,embed:false,
  uploads:{},uploadInProgress:false,pending,receipt,saveState:'idle',status,
  updateAnswer:(id,value)=>setAnswers(current=>({...current,[id]:value})),
  previousSection:()=>setSectionIndex(current=>Math.max(0,current-1)),
  nextSection:()=>{const found=validatePublicFormAnswers(activeSection.questions,answers);setErrors(found);if(Object.keys(found).length)return;if(sectionIndex===visibleSections.length-1)setStage('review');else setSectionIndex(sectionIndex+1);},
  uploadAnswer:async()=>{},
  submit:async()=>{setPending(true);setStatus({message:'',tone:''});try{const result=await localCall('submitPublic',{answers,consentAccepted});setReceipt(result);setStage('complete');}catch(error){setStatus({message:error.message,tone:'error'});}finally{setPending(false);}},
  withdraw:async()=>{setPending(true);try{await localCall('withdrawPublic',{responseId:receipt.responseId,withdrawalToken:receipt.withdrawalToken});setStage('withdrawn');}catch(error){setStatus({message:error.message,tone:'error'});}finally{setPending(false);}},
 };
}
