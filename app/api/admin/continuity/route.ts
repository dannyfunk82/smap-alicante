import { NextResponse } from "next/server";
import { currentAdminSession } from "@/lib/admin";
import { operationalContinuityState } from "@/lib/operational-continuity";
export const dynamic="force-dynamic";
export async function GET(){if(!await currentAdminSession())return NextResponse.json({error:"Forbidden"},{status:403});return NextResponse.json(await operationalContinuityState());}
