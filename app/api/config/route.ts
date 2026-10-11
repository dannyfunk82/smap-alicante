import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentApiSession } from "@/lib/api-session";
import { APP_ENVIRONMENT,APP_VERSION } from "@/lib/system";
import { featureEnabled } from "@/lib/go-live-policy.js";

export async function GET(){
 const session=await currentApiSession().catch(()=>null);const subject=session?.sub??"anonymous";
 const result=await db.query("SELECT flag_key,enabled,rollout_percent,environments FROM feature_flags").catch(()=>({rows:[]}));
 const features=Object.fromEntries(result.rows.map((row:{flag_key:string;enabled:boolean;rollout_percent:number;environments:string[]})=>[row.flag_key,featureEnabled({enabled:Boolean(row.enabled),rolloutPercent:Number(row.rollout_percent),environments:row.environments??[]},subject,APP_ENVIRONMENT)]));
 return NextResponse.json({googleMapsBrowserKey:process.env.GOOGLE_MAPS_BROWSER_KEY??"",features,environment:APP_ENVIRONMENT,version:APP_VERSION});
}
