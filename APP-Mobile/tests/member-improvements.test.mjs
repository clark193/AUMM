import test from "node:test";
import assert from "node:assert/strict";
import { displayMemberDate } from "../../lib/memberDates.ts";
import { validRide, summarizeRides } from "../src/ride-domain.mjs";
test("cadastro aceita datas antigas sem derrubar o diálogo",()=>{
 assert.equal(displayMemberDate("1990-01-31"),"31/01/1990");
 assert.equal(displayMemberDate("31/01/1990"),"31/01/1990");
 assert.equal(displayMemberDate({seconds:0}),"01/01/1970");
 assert.equal(displayMemberDate({toDate:()=>new Date("2020-02-03T00:00:00Z")}),"03/02/2020");
 for(const input of [null,{},"erro",{seconds:"erro"},{toDate:()=>{throw Error();}}])assert.equal(displayMemberDate(input),"—");
});
test("jornadas usam centavos, somam distâncias e rejeitam dados inválidos",()=>{
 const ride={id:"one",date:"2026-10-20",income:18000,expense:3500,start:1000,end:1100};
 assert.equal(validRide(ride),true);
 for(const change of [{date:"2026-02-31"},{income:NaN},{income:-1},{expense:0.5},{end:999},{start:Infinity}])assert.equal(validRide({...ride,...change}),false);
 const totals=summarizeRides([ride,{...ride,id:"two",income:12000,expense:2500,start:1100,end:1150}]);
 assert.deepEqual(totals,{income:30000,expense:6000,km:150});
 assert.equal(totals.income-totals.expense,24000);
 assert.equal(totals.expense/totals.km,40);
});
