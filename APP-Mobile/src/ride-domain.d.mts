export type Ride={id:string;date:string;income:number;expense:number;start:number;end:number};
export function validRide(value:unknown):value is Ride;
export function summarizeRides(rows:Ride[]):{income:number;expense:number;km:number};
