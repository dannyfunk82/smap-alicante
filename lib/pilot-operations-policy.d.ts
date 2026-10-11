export function onboardingPercentage(progress:Record<string,boolean>):number;
export function supportPriority(category:string):"high"|"normal";
export function inviteAvailable(invite:{status:string;usedCount:number;maxUses:number;expiresAt:string|null},now?:Date):boolean;
