export type FeatureFlagPolicy={enabled:boolean;rolloutPercent:number;environments:string[]};
export function rolloutBucket(subject:string):number;
export function featureEnabled(flag:FeatureFlagPolicy|undefined,subject:string,environment?:string):boolean;
export function retentionCutoff(retentionDays:number,now?:Date):Date;
export function approvalAllowsDeploy(decision:string|null|undefined):boolean;
export function calculateGoLiveReadiness(input:{checklist:Array<{key:string;required:boolean;completed:boolean}>;checks:Array<{name:string;status:"ok"|"warning"|"error"}>;criticalIncidents:number;releaseApproval:{decision:string}|null}):{score:number;recommendation:"ready"|"ready_with_conditions"|"not_ready";blockers:string[];checklistRate:number;errorChecks:string[];warningChecks:string[]};
