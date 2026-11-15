import test from 'node:test';
import assert from 'node:assert/strict';
import { readRecords, saveRecord } from '../src/missionRecords.js';
test('archive persists one result per attempt and recovers from corrupt or full storage',()=>{
  let data='[]';const storage={getItem:()=>data,setItem:(_,value)=>{data=value;}};
  const result={id:'one',mission:'mars',result:'success'};
  assert.equal(saveRecord(result,storage),true);saveRecord(result,storage);assert.equal(readRecords(storage).length,1);
  saveRecord({...result,id:'two',result:'failed'},storage);assert.equal(readRecords(storage)[0].id,'two');
  for(let i=0;i<110;i++)saveRecord({...result,id:String(i)},storage);
  assert.equal(readRecords(storage).length,100);
  data='{broken';assert.deepEqual(readRecords(storage),[]);
  assert.equal(saveRecord(result,{getItem:()=>null,setItem(){throw Error('quota');}}),false);
});
