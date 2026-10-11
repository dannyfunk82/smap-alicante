export type SloStatus="ok"|"warning"|"breach"|"unknown";
export function evaluateSlo(input:{direction:"min"|"max";target:number;warning:number;current:number|null|undefined}):SloStatus;
export function continuityScore(input:{sloStatuses?:SloStatus[];activeOnCall?:boolean;criticalIncidents?:number;failedExercises?:number;overdueExercises?:number;postmortemsPending?:number}):number;
export function continuityRecommendation(score:number,criticalIncidents?:number):"stable"|"watch"|"at_risk";
export function exerciseTimeliness(input:{status:string;scheduledAt:string|Date;now?:Date}):"closed"|"overdue"|"scheduled";
