export type ClosureMetricsInput = {
  onboardingCompletionRate:number; surveyResponseRate:number; averageRating:number;
  supportResolutionRate:number; checklistCompletionRate:number; activeUseRate:number;
  criticalOpenActions:number;
};
export type ClosureFinding = { tone:"positive"|"warning"|"critical"; code:string; es:string; en:string };
export function actionPriorityScore(priority:string,impact:string,effort:string):number;
export function readinessScore(metrics:ClosureMetricsInput):number;
export function pilotRecommendation(score:number,criticalOpenActions?:number):"go"|"go_with_conditions"|"extend_pilot"|"stop";
export function decisionToActionStatus(decision:string):"approved"|"rejected"|"proposed";
export function buildPilotFindings(metrics:ClosureMetricsInput & Record<string,unknown>):ClosureFinding[];
