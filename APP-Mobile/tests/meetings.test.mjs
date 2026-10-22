import test from 'node:test';
import assert from 'node:assert/strict';
import {dueMeetingStages} from '../shared/meetings.ts';
const start=Date.UTC(2026,9,22,23), minute=60000;
test('reuniões: lembretes de 30 minutos e início respeitam as janelas',()=>{
 assert.deepEqual(dueMeetingStages(start,start-60*minute,start-31*minute),[]);
 assert.deepEqual(dueMeetingStages(start,start-60*minute,start-30*minute),['30m']);
 assert.deepEqual(dueMeetingStages(start,start-60*minute,start),['start']);
 assert.deepEqual(dueMeetingStages(start,start-60*minute,start+10*minute),['start']);
 assert.deepEqual(dueMeetingStages(start,start-60*minute,start+11*minute),[]);
 assert.deepEqual(dueMeetingStages(start,start-20*minute,start-19*minute),[]);
 assert.deepEqual(dueMeetingStages(NaN,0,start),[]);
});
