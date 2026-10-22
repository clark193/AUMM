export type MeetingStage="30m"|"start";
export function dueMeetingStages(startsAt:number,createdAt:number,now:number):MeetingStage[]{
 if(!Number.isFinite(startsAt)||startsAt<=0||!Number.isFinite(now))return [];
 if(now>=startsAt&&now<=startsAt+10*60000)return ["start"];
 if(createdAt<=startsAt-30*60000&&now>=startsAt-30*60000&&now<startsAt)return ["30m"];
 return [];
}
