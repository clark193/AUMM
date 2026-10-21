export function validRide(v){
 if(!v||typeof v.id!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(v.date))return false;
 const d=new Date(v.date+"T12:00:00Z");
 return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===v.date&&[v.income,v.expense].every(n=>Number.isSafeInteger(n)&&n>=0&&n<=100000000)&&[v.start,v.end].every(n=>Number.isFinite(n)&&n>=0&&n<=10000000)&&v.end>=v.start;
}
export function summarizeRides(rows){return rows.reduce((a,r)=>({income:a.income+r.income,expense:a.expense+r.expense,km:a.km+r.end-r.start}),{income:0,expense:0,km:0});}
