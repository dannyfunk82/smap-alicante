export type CampaignWindow = { status:string; startsAt:string|null; endsAt:string|null };
export type SurveyQuestionPolicy = { type:"rating"|"single"|"text"; required:boolean; options?:string[] };
export function campaignIsActive(campaign:CampaignWindow, now?:Date|string):boolean;
export function validateSurveyAnswer(question:SurveyQuestionPolicy,value:unknown):boolean;
export function surveyCompletionRate(submitted:number,eligible:number):number;
