export type ReleaseStepLike={required?:boolean;status:string};
export type ReleaseObservationLike={status:string};
export declare function deploymentProgress(steps?:ReleaseStepLike[]):number;
export declare function releaseRisk(input?:{steps?:ReleaseStepLike[];observations?:ReleaseObservationLike[];criticalIncidents?:number}):"low"|"medium"|"high"|"critical";
export declare function canPromoteRelease(input?:{plan?:{status:string}|null;steps?:ReleaseStepLike[];goLiveRecommendation?:string;approvalDecision?:string|null;criticalIncidents?:number}):boolean;
export declare function rollbackRecommendation(input?:{steps?:ReleaseStepLike[];observations?:ReleaseObservationLike[];criticalIncidents?:number}):"continue"|"hold"|"rollback";
export declare function nextRolloutPercent(current:number,observationStatus?:string):number;
