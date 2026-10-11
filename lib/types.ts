export type Locale = "es" | "en";
export type UserRole = "citizen" | "admin";
export type BusOperationalStatus = "in_service" | "stopped" | "out_of_service" | "gps_lost";
export type IntegrationMode = "demo" | "hybrid" | "external";

export type TextScale = "normal" | "large" | "xlarge";

export type AccessibilityPreferences = {
  highContrast: boolean;
  reduceMotion: boolean;
  textScale: TextScale;
  arrivalNotifications: boolean;
  ticketNotifications: boolean;
  serviceNotifications: boolean;
};

export type DashboardUser = {
  id: string;
  email: string;
  name: string;
  language: Locale;
  role: UserRole;
  preferences: AccessibilityPreferences;
  privacy: { privacyAccepted: boolean; privacyVersion: string | null; analyticsConsent: boolean; pilotParticipant: boolean; deletionRequestedAt: string | null };
};

export type Stop = {
  id: string;
  code: string;
  name: string;
  latitude: number;
  longitude: number;
  accessible: boolean;
  sequence: number;
};

export type Line = {
  id: string;
  code: string;
  name: string;
  color: string;
  stops: Stop[];
};

export type BusLive = {
  id: string;
  code: string;
  lineId: string;
  lineCode: string;
  lineColor: string;
  latitude: number;
  longitude: number;
  direction: "outbound" | "inbound";
  nextStop: Stop;
  etaSeconds: number;
  occupancyPercentage: number;
  occupancyLevel: "low" | "medium" | "high";
  passengerCount: number;
  capacity: number;
  updatedAt: string;
  operationalStatus: BusOperationalStatus;
  speedMultiplier: number;
  dataFreshness: "live" | "stale";
  source?: "demo" | "external";
};

export type NetworkResponse = {
  demo: boolean;
  lines: Line[];
  buses: BusLive[];
  stopCount: number;
  busCount: number;
  generatedAt: string;
  simulation: {
    speed: number;
    paused: boolean;
    serviceStatus: "normal" | "degraded" | "paused";
  };
  staticData: {
    kind: "demo" | "gtfs";
    sourceName: string;
    providerName: string | null;
    attributionText: string | null;
    sourceUrl: string | null;
    importedAt: string | null;
    validFrom: string | null;
    validTo: string | null;
    routeCount: number;
    stopCount: number;
  };
  dataSource: {
    mode: IntegrationMode;
    active: "demo" | "external" | "mixed";
    fallbackActive: boolean;
    externalFreshCount: number;
    externalStaleCount: number;
    lastExternalUpdate: string | null;
    maxAgeSeconds: number;
  };
};

export type ScheduledDeparture = {
  lineId: string;
  lineCode: string;
  lineColor: string;
  lineName: string;
  headsign: string | null;
  scheduledTime: string;
  minutesFromNow: number;
};

export type StopArrival = {
  busId: string;
  busCode: string;
  lineId: string;
  lineCode: string;
  lineColor: string;
  direction: "outbound" | "inbound";
  etaSeconds: number;
  occupancyPercentage: number;
  occupancyLevel: "low" | "medium" | "high";
};

export type JourneyFare = {
  ticketType: "single" | "return" | "daily";
  price: number;
};

export type JourneyOption = {
  lineId: string;
  lineCode: string;
  lineName: string;
  lineColor: string;
  originStopId: string;
  originName: string;
  destinationStopId: string;
  destinationName: string;
  direction: "outbound" | "inbound";
  stopCount: number;
  durationMinutes: number;
  nextBusCode: string | null;
  nextBusEtaSeconds: number | null;
  occupancyLevel: "low" | "medium" | "high" | null;
  occupancyPercentage: number | null;
  fares: JourneyFare[];
};

export type Favorite = {
  id: string;
  type: "line" | "stop";
  entityId: string;
  title: string;
  subtitle: string;
  color?: string;
  createdAt: string;
};

export type Ticket = {
  id: string;
  publicCode: string;
  ticketType: "single" | "return" | "daily";
  lineId: string;
  lineCode: string;
  originStopId: string;
  originName: string;
  destinationStopId: string;
  destinationName: string;
  stopCount: number;
  price: number;
  status: "available" | "active" | "used" | "expired" | "cancelled";
  purchasedAt: string;
  activatedAt: string | null;
  expiresAt: string | null;
  paymentReference?: string | null;
};

export type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
};

export type DemoBusControl = {
  busId: string;
  code: string;
  lineId: string;
  lineCode: string;
  operationalStatus: BusOperationalStatus;
  speedMultiplier: number;
  occupancyOverride: number | null;
  updatedAt: string;
};

export type AdminDemoState = {
  settings: {
    simulationSpeed: number;
    paused: boolean;
    updatedAt: string;
  };
  buses: DemoBusControl[];
};

export type OperationsMetrics = {
  users: number;
  activeUsers24h: number;
  failedLogins24h: number;
  lockedAccounts: number;
  tickets24h: number;
  auditEvents24h: number;
};

export type AuditLogItem = {
  id: number;
  actorEmail: string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  ipAddress: string | null;
  details: Record<string, unknown>;
  createdAt: string;
};

export type OperationsResponse = {
  metrics: OperationsMetrics;
  auditLogs: AuditLogItem[];
};

export type IntegrationSourceItem = {
  id: string;
  code: string;
  name: string;
  providerType: "demo" | "gtfs" | "avanza" | "custom";
  enabled: boolean;
  status: "configured" | "healthy" | "degraded" | "error" | "disabled";
  lastStaticSyncAt: string | null;
  lastRealtimeAt: string | null;
  lastError: string | null;
  metadata: Record<string, unknown>;
  updatedAt: string;
};

export type IntegrationSyncRun = {
  id: number;
  sourceId: string | null;
  sourceCode: string | null;
  syncType: "static" | "realtime" | "test";
  status: "running" | "completed" | "partial" | "failed";
  recordsReceived: number;
  recordsApplied: number;
  message: string | null;
  startedAt: string;
  completedAt: string | null;
};

export type IntegrationStatus = {
  settings: { mode: IntegrationMode; fallbackEnabled: boolean; maxAgeSeconds: number; activeSourceId: string | null };
  sources: IntegrationSourceItem[];
  recentRuns: IntegrationSyncRun[];
  telemetry: { vehicleCount: number; lastUpdate: string | null };
};

export type PublicSystemStatus = {
  service: string;
  version: string;
  deploymentId: string;
  environment: string;
  state: "operational" | "degraded" | "maintenance" | "unavailable";
  database: "connected" | "unavailable";
  databaseLatencyMs: number;
  maintenance: { enabled: boolean; title: string; message: string };
  message: string | null;
  supportEmail: string | null;
  incidents: Array<{ id: string; severity: "info" | "warning" | "critical"; status: "open" | "monitoring"; title: string; body: string; startsAt: string; resolvedAt: string | null }>;
  checks: Array<{ name: string; status: "ok" | "warning" | "error"; latencyMs: number | null; details: Record<string, unknown>; checkedAt: string }>;
  checksStatus: "ok" | "warning" | "error" | "unknown";
  timestamp: string;
};

export type RuntimeSettings = {
  maintenanceMode: boolean;
  maintenanceTitleEs: string;
  maintenanceTitleEn: string;
  maintenanceMessageEs: string;
  maintenanceMessageEn: string;
  supportEmail: string;
  publicStatusMessageEs: string;
  publicStatusMessageEn: string;
  updatedAt: string | null;
};

export type DeploymentRelease = {
  id: number;
  version: string;
  deploymentId: string;
  environment: "local" | "staging" | "production";
  status: "prepared" | "deployed" | "rolled_back" | "failed";
  commitRef: string | null;
  notes: string | null;
  createdAt: string;
  deployedAt: string | null;
};

export type ServiceIncident = {
  id: string;
  severity: "info" | "warning" | "critical";
  status: "open" | "monitoring" | "resolved";
  titleEs: string;
  titleEn: string;
  bodyEs: string;
  bodyEn: string;
  startsAt: string;
  resolvedAt: string | null;
  updatedAt: string;
};

export type AdminSystemResponse = {
  status: PublicSystemStatus;
  settings: RuntimeSettings;
  releases: DeploymentRelease[];
  incidents: ServiceIncident[];
  checks: Array<{ id: number; name: string; status: "ok" | "warning" | "error"; latencyMs: number | null; details: Record<string, unknown>; checkedAt: string }>;
};


export type PrivacyDocument = {
  type: "privacy" | "terms";
  version: string;
  title: string;
  content: string;
  publishedAt: string;
};

export type PrivacyState = {
  privacyAccepted: boolean;
  privacyVersion: string | null;
  privacyAcceptedAt: string | null;
  analyticsConsent: boolean;
  pilotParticipant: boolean;
  deletionRequestedAt: string | null;
  documents: PrivacyDocument[];
};

export type FeedbackReport = {
  id: string;
  category: "general" | "route" | "stop" | "bus" | "accessibility" | "ticket";
  entityType: "line" | "stop" | "bus" | "ticket" | null;
  entityId: string | null;
  rating: number;
  message: string;
  status: "new" | "reviewing" | "planned" | "resolved" | "closed";
  adminResponse: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PilotMetrics = {
  pilotParticipants: number;
  analyticsParticipants: number;
  activeUsers7d: number;
  journeysPlanned7d: number;
  ticketsPurchased7d: number;
  feedbackOpen: number;
  feedbackTotal: number;
  averageRating: number;
};

export type PilotDailyMetric = { day: string; activeUsers: number; events: number; feedback: number };
export type PilotAdminResponse = { metrics: PilotMetrics; daily: PilotDailyMetric[]; feedback: Array<FeedbackReport & { userEmail: string; userName: string }> };

export type OnboardingState = {
  progress: { welcome:boolean; profile:boolean; accessibility:boolean; route:boolean; ticket:boolean; feedback:boolean };
  completed:number; total:number; percentage:number; completedAt:string|null;
  membership:{ status:string; cohortCode:string; cohortName:string; joinedAt:string }|null;
};

export type SupportCase = {
  id:string; category:"technical"|"account"|"accessibility"|"ticket"|"service";
  priority:"low"|"normal"|"high"; subject:string; message:string;
  status:"open"|"in_progress"|"resolved"|"closed"; adminResponse:string|null;
  createdAt:string; updatedAt:string;
};

export type PilotOperationsResponse = {
  metrics:{ activeMembers:number; onboardingCompleted:number; openSupport:number; activeInvites:number; checklistCompleted:number; checklistTotal:number };
  cohorts:Array<{ id:string; code:string; name:string; targetParticipants:number; startsAt:string|null; endsAt:string|null; status:string; memberCount:number; createdAt:string }>;
  invites:Array<{ id:string; code:string; email:string|null; maxUses:number; usedCount:number; expiresAt:string|null; status:string; cohortCode:string; cohortName:string; createdAt:string }>;
  support:Array<SupportCase & { userEmail:string; userName:string }>;
  checklist:Array<{ id:number; key:string; titleEs:string; titleEn:string; completed:boolean; notes:string|null; completedAt:string|null; updatedAt:string }>;
  members:Array<{ userId:string; email:string; name:string; cohortCode:string; cohortName:string; status:string; joinedAt:string; steps:number; completedAt:string|null }>;
};

export type SurveyQuestion = {
  id:string;
  position:number;
  type:"rating"|"single"|"text";
  prompt:string;
  required:boolean;
  options:string[];
};

export type PilotSurvey = {
  id:string;
  code:string;
  title:string;
  description:string;
  status:"draft"|"active"|"closed";
  anonymous:boolean;
  opensAt:string|null;
  closesAt:string|null;
  submitted:boolean;
  submittedAt:string|null;
  questions:SurveyQuestion[];
};

export type PilotCampaign = {
  id:string;
  code:string;
  title:string;
  description:string;
  status:"planned"|"active"|"closed"|"cancelled";
  startsAt:string|null;
  endsAt:string|null;
  cohortCode:string|null;
  surveys:PilotSurvey[];
};

export type CampaignsResponse = {
  membership:{ cohortCode:string; cohortName:string }|null;
  campaigns:PilotCampaign[];
};

export type CampaignAdminResponse = {
  metrics:{ activeCampaigns:number; activeSurveys:number; submittedResponses:number; responseRate:number; broadcastsSent:number };
  cohorts:Array<{ id:string; code:string; name:string; memberCount:number }>;
  campaigns:Array<{ id:string; code:string; titleEs:string; titleEn:string; status:string; cohortCode:string|null; startsAt:string|null; endsAt:string|null; surveyCount:number; responseCount:number }>;
  surveys:Array<{ id:string; code:string; titleEs:string; titleEn:string; status:string; campaignCode:string; responseCount:number; eligibleCount:number; completionRate:number; averageRating:number|null }>;
  broadcasts:Array<{ id:string; titleEs:string; titleEn:string; status:string; recipientCount:number; cohortCode:string|null; campaignCode:string|null; sentAt:string|null; createdAt:string }>;
};

export type PilotRecommendation = "go"|"go_with_conditions"|"extend_pilot"|"stop";
export type PilotClosureMetrics = {
  participants:number; onboardingCompleted:number; onboardingCompletionRate:number;
  eligibleSurveyResponses:number; submittedSurveyResponses:number; surveyResponseRate:number;
  averageSurveyRating:number; averageFeedbackRating:number; averageRating:number;
  supportTotal:number; supportResolved:number; supportResolutionRate:number;
  checklistTotal:number; checklistCompleted:number; checklistCompletionRate:number;
  activeUsers14d:number; activeUseRate:number; ticketsPurchased:number;
  openFeedback:number; criticalOpenActions:number; readinessScore:number; recommendation:PilotRecommendation;
};
export type PilotFinding = { tone:"positive"|"warning"|"critical"; code:string; text:string };
export type PilotImprovementAction = {
  id:string; cohortCode:string|null; titleEs:string; titleEn:string; descriptionEs:string; descriptionEn:string;
  category:"ux"|"accessibility"|"data"|"ticketing"|"operations"|"security"|"integration";
  priority:"low"|"medium"|"high"|"critical"; impact:"low"|"medium"|"high"; effort:"small"|"medium"|"large";
  status:"proposed"|"approved"|"in_progress"|"completed"|"rejected"; owner:string|null; targetDate:string|null;
  sourceType:"feedback"|"survey"|"support"|"analytics"|"manual"; sourceReference:string|null;
  priorityScore:number; createdAt:string; updatedAt:string;
};
export type PilotDecision = { id:string; actionId:string|null; actionTitle:string|null; title:string; decision:"approve"|"reject"|"defer"|"needs_data"; rationale:string; decidedBy:string|null; decidedAt:string };
export type PilotKpiSnapshot = { id:string; periodStart:string; periodEnd:string; metrics:PilotClosureMetrics; findings:Array<{tone:string;code:string;es:string;en:string}>; createdAt:string };
export type PilotFinalReport = { id:string; title:string; status:"draft"|"final"; executiveSummaryEs:string; executiveSummaryEn:string; recommendation:PilotRecommendation; metrics:PilotClosureMetrics; findings:Array<{tone:string;code:string;es:string;en:string}>; risks:string[]; publishedAt:string|null; createdAt:string; updatedAt:string };
export type PilotClosureResponse = { metrics:PilotClosureMetrics; findings:PilotFinding[]; cohorts:Array<{id:string;code:string;name:string}>; actions:PilotImprovementAction[]; decisions:PilotDecision[]; snapshots:PilotKpiSnapshot[]; reports:PilotFinalReport[] };
export type PublicPilotResults = { metrics:PilotClosureMetrics; findings:PilotFinding[]; latestReport:PilotFinalReport|null; updatedAt:string };

export type FeatureFlag = {
  key:string; descriptionEs:string; descriptionEn:string; enabled:boolean; rolloutPercent:number; environments:string[]; updatedAt:string;
};
export type RetentionPolicy = {
  key:string; tableName:string; timestampColumn:string; retentionDays:number; enabled:boolean; lastRunAt:string|null; lastDeletedRows:number; updatedAt:string;
};
export type OperationalContact = {
  id:string; role:string; name:string; email:string; phone:string|null; escalationLevel:number; active:boolean; createdAt:string; updatedAt:string;
};
export type GoLiveChecklistItem = {
  key:string; titleEs:string; titleEn:string; category:"security"|"infrastructure"|"operations"|"privacy"|"accessibility"|"data"|"business"; required:boolean; completed:boolean; evidence:string|null; completedAt:string|null; updatedAt:string;
};
export type ReleaseApproval = {
  id:string; releaseVersion:string; environment:"staging"|"production"; decision:"approved"|"conditional"|"rejected"; approverName:string; approverEmail:string|null; notes:string; decidedAt:string;
};
export type GoLiveSnapshot = {
  id:string; releaseVersion:string; environment:string; readinessScore:number; recommendation:"ready"|"ready_with_conditions"|"not_ready"; blockers:string[]; details:Record<string,unknown>; createdAt:string;
};
export type GoLiveReadiness = {
  score:number; recommendation:"ready"|"ready_with_conditions"|"not_ready"; blockers:string[]; checklistRate:number; errorChecks:string[]; warningChecks:string[];
};
export type GoLiveResponse = {
  releaseVersion:string; environment:string; readiness:GoLiveReadiness; featureFlags:FeatureFlag[]; retentionPolicies:RetentionPolicy[]; contacts:OperationalContact[]; checklist:GoLiveChecklistItem[]; approvals:ReleaseApproval[]; snapshots:GoLiveSnapshot[]; checks:Array<{name:string;status:"ok"|"warning"|"error";checkedAt:string}>; criticalIncidents:number;
};
export type PublicAppConfig = { googleMapsBrowserKey:string; features:Record<string,boolean>; environment:string; version:string };

export type ReleasePlanStatus="planned"|"approved"|"in_progress"|"completed"|"failed"|"rolled_back"|"cancelled";
export type ReleaseStepStatus="pending"|"in_progress"|"completed"|"failed"|"skipped";
export type ReleaseRisk="low"|"medium"|"high"|"critical";
export type ReleaseOperationPlan={
  id:string;releaseVersion:string;deploymentId:string;environment:"local"|"staging"|"production";strategy:"all_at_once"|"canary"|"blue_green";status:ReleasePlanStatus;rolloutPercent:number;scheduledAt:string|null;startedAt:string|null;completedAt:string|null;owner:string|null;notes:string;createdAt:string;updatedAt:string;progress:number;risk:ReleaseRisk;rollbackRecommendation:"continue"|"hold"|"rollback";
  steps:Array<{id:number;key:string;titleEs:string;titleEn:string;sequence:number;required:boolean;status:ReleaseStepStatus;evidence:string|null;startedAt:string|null;completedAt:string|null;updatedAt:string}>;
  observations:Array<{id:string;type:"metric"|"incident"|"validation"|"note";status:"ok"|"warning"|"error";title:string;details:Record<string,unknown>;observedAt:string}>;
  rollbackPoints:Array<{id:string;label:string;backupReference:string|null;deploymentReference:string|null;status:"ready"|"used"|"expired";createdAt:string;usedAt:string|null}>;
  rollbacks:Array<{id:string;rollbackPointId:string|null;reason:string;status:"requested"|"executed"|"failed"|"cancelled";notes:string;requestedAt:string;executedAt:string|null}>;
};
export type ReleaseOperationsResponse={summary:{total:number;inProgress:number;completed:number;failed:number;criticalIncidents:number;goLiveRecommendation:string;goLiveScore:number;approvalDecision:string|null};plans:ReleaseOperationPlan[]};

export type ContinuitySloStatus="ok"|"warning"|"breach"|"unknown";
export type OperationalContinuityResponse={
  summary:{score:number;recommendation:"stable"|"watch"|"at_risk";activeOnCall:boolean;criticalIncidents:number;postmortemsPending:number;sloOk:number;sloTotal:number;overdueExercises:number};
  slos:Array<{key:string;nameEs:string;nameEn:string;direction:"min"|"max";target:number;warning:number;unit:string;windowMinutes:number;enabled:boolean;current:number|null;measuredAt:string|null;source:string|null;status:ContinuitySloStatus;updatedAt:string}>;
  shifts:Array<{id:string;role:string;contactName:string;email:string;phone:string|null;startsAt:string;endsAt:string;status:"scheduled"|"active"|"completed"|"cancelled";notes:string;createdAt:string;updatedAt:string}>;
  exercises:Array<{id:string;type:"backup_restore"|"failover"|"incident_drill"|"communications";titleEs:string;titleEn:string;status:"planned"|"in_progress"|"completed"|"failed"|"cancelled";timeliness:"closed"|"overdue"|"scheduled";scheduledAt:string;completedAt:string|null;resultEs:string;resultEn:string;evidence:string|null;createdAt:string;updatedAt:string}>;
  postmortems:Array<{id:string;incidentId:string;incidentTitleEs:string;incidentTitleEn:string;incidentSeverity:string;incidentStatus:string;status:"draft"|"review"|"published";summaryEs:string;summaryEn:string;impactEs:string;impactEn:string;rootCauseEs:string;rootCauseEn:string;correctiveActions:string[];owner:string|null;publishedAt:string|null;createdAt:string;updatedAt:string}>;
  incidents:Array<{id:string;severity:string;status:string;titleEs:string;titleEn:string;startsAt:string;resolvedAt:string|null}>;
};

export type HandoverResponse = {
  releaseVersion: string;
  summary: { score:number; recommendation:"passed"|"conditional"|"failed"; checklistRate:number; documentRate:number; requiredPending:number; documentsPending:number };
  checks: Array<{ key:string; status:"ok"|"warning"|"error"; detail:string }>;
  checklist: Array<{ key:string; category:string; titleEs:string; titleEn:string; required:boolean; completed:boolean; evidence:string|null; owner:string|null; completedAt:string|null; updatedAt:string }>;
  documents: Array<{ key:string; titleEs:string; titleEn:string; path:string; version:string; status:"draft"|"reviewed"|"approved"; owner:string|null; notes:string; lastReviewedAt:string|null; updatedAt:string }>;
  runs: Array<{ id:string; releaseVersion:string; environment:string; status:"passed"|"conditional"|"failed"; score:number; checks:unknown[]; notes:string; startedAt:string; completedAt:string; createdAt:string }>;
};
