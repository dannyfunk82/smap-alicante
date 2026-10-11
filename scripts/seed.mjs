import bcrypt from "bcryptjs";
import pg from "pg";

const { Client } = pg;
const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required");

const client = new Client({ connectionString });
await client.connect();

const lines = [
  { id: "L1", code: "L1", es: "Centro â€“ Norte", en: "City Centre â€“ North", color: "#1769aa" },
  { id: "L2", code: "L2", es: "Centro â€“ Costa", en: "City Centre â€“ Coast", color: "#d97706" },
  { id: "L3", code: "L3", es: "Centro â€“ Universidad", en: "City Centre â€“ University", color: "#16803c" }
];

const routeTemplates = [
  { lineId: "L1", startLat: 38.3450, startLng: -0.4930, dLat: 0.0021, dLng: 0.0011, es: "Norte", en: "North" },
  { lineId: "L2", startLat: 38.3436, startLng: -0.4914, dLat: -0.0005, dLng: 0.0024, es: "Costa", en: "Coast" },
  { lineId: "L3", startLat: 38.3454, startLng: -0.4901, dLat: 0.0025, dLng: 0.0022, es: "Universidad", en: "University" }
];

try {
  await client.query("BEGIN");

  const passwordHash = await bcrypt.hash("SmapDemo2026", 12);
  await client.query(
    `INSERT INTO users(email,password_hash,display_name,preferred_language,role,password_changed_at,privacy_notice_version,privacy_accepted_at,analytics_consent,pilot_participant)
     VALUES ($1,$2,$3,'es','admin',NOW(),'2026-07',NOW(),TRUE,TRUE)
     ON CONFLICT (email) DO UPDATE SET display_name=EXCLUDED.display_name,role='admin',privacy_notice_version='2026-07',privacy_accepted_at=COALESCE(users.privacy_accepted_at,NOW()),analytics_consent=TRUE,pilot_participant=TRUE`,
    ["demo@smap.local", passwordHash, "Usuario Demo"]
  );

  for (const line of lines) {
    await client.query(
      `INSERT INTO lines(id, code, name_es, name_en, color)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO UPDATE SET name_es = EXCLUDED.name_es, name_en = EXCLUDED.name_en, color = EXCLUDED.color`,
      [line.id, line.code, line.es, line.en, line.color]
    );
  }

  for (const template of routeTemplates) {
    for (let i = 1; i <= 10; i += 1) {
      const stopId = `${template.lineId}-S${String(i).padStart(2, "0")}`;
      const lat = template.startLat + template.dLat * (i - 1);
      const lng = template.startLng + template.dLng * (i - 1);
      await client.query(
        `INSERT INTO stops(id, code, name_es, name_en, latitude, longitude, accessible)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO UPDATE SET latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude`,
        [
          stopId,
          `ALC-${template.lineId}-${String(i).padStart(2, "0")}`,
          `Parada ${template.es} ${i}`,
          `${template.en} Stop ${i}`,
          lat,
          lng,
          i % 4 !== 0
        ]
      );
      await client.query(
        `INSERT INTO line_stops(line_id, stop_id, sequence)
         VALUES ($1, $2, $3)
         ON CONFLICT (line_id, stop_id) DO UPDATE SET sequence = EXCLUDED.sequence`,
        [template.lineId, stopId, i]
      );
    }
  }

  for (const [index, line] of lines.entries()) {
    for (let bus = 1; bus <= 2; bus += 1) {
      const code = `BUS-${index + 1}0${bus}`;
      await client.query(
        `INSERT INTO buses(id, code, line_id, capacity, status)
         VALUES ($1, $2, $3, 70, 'demo')
         ON CONFLICT (id) DO NOTHING`,
        [code, code, line.id]
      );
    }
  }

  await client.query(`INSERT INTO demo_settings(id,simulation_speed,paused) VALUES(1,1,FALSE) ON CONFLICT(id) DO NOTHING`);
  await client.query(`INSERT INTO demo_bus_controls(bus_id) SELECT id FROM buses WHERE source_id IS NULL ON CONFLICT(bus_id) DO NOTHING`);

  await client.query(`INSERT INTO integration_sources(code,name,provider_type,enabled,status,metadata)
    VALUES('avanza-demo','AVANZA demo connector','avanza',TRUE,'configured','{"purpose":"external telemetry demonstration"}'::jsonb)
    ON CONFLICT(code) DO UPDATE SET enabled=TRUE,name=EXCLUDED.name,provider_type='avanza',updated_at=NOW()`);
  await client.query(`INSERT INTO integration_settings(id,mode,fallback_enabled,max_age_seconds) VALUES(1,'demo',TRUE,45) ON CONFLICT(id) DO NOTHING`);

  const demoUser = await client.query("SELECT id FROM users WHERE email = $1", ["demo@smap.local"]);
  const demoUserId = demoUser.rows[0]?.id;
  if (demoUserId) {
    await client.query(`INSERT INTO favorites(user_id, favorite_type, entity_id) VALUES ($1,'line','L1') ON CONFLICT DO NOTHING`, [demoUserId]);
    await client.query(`INSERT INTO favorites(user_id, favorite_type, entity_id) VALUES ($1,'stop','L2-S03') ON CONFLICT DO NOTHING`, [demoUserId]);
    await client.query(`INSERT INTO tickets(public_code,user_id,ticket_type,line_id,origin_stop_id,destination_stop_id,stop_count,price,status)
      VALUES('TK-DEMO01',$1,'single','L3','L3-S01','L3-S08',7,1.90,'available') ON CONFLICT (public_code) DO NOTHING`, [demoUserId]);

    await client.query(`INSERT INTO user_consents(user_id,consent_type,document_version,granted)
      SELECT $1,'privacy','2026-07',TRUE WHERE NOT EXISTS (SELECT 1 FROM user_consents WHERE user_id=$1 AND consent_type='privacy' AND document_version='2026-07')`, [demoUserId]);
    await client.query(`INSERT INTO user_consents(user_id,consent_type,document_version,granted)
      SELECT $1,'analytics',NULL,TRUE WHERE NOT EXISTS (SELECT 1 FROM user_consents WHERE user_id=$1 AND consent_type='analytics')`, [demoUserId]);
    await client.query(`INSERT INTO user_consents(user_id,consent_type,document_version,granted)
      SELECT $1,'pilot',NULL,TRUE WHERE NOT EXISTS (SELECT 1 FROM user_consents WHERE user_id=$1 AND consent_type='pilot')`, [demoUserId]);
    await client.query(`INSERT INTO feedback_reports(user_id,category,entity_type,entity_id,rating,message,status,admin_response)
      SELECT $1,'accessibility','stop','L2-S03',4,'La informaciÃ³n de accesibilidad es clara; serÃ­a Ãºtil aÃ±adir una descripciÃ³n del acceso a la parada.','reviewing','Gracias. La mejora se ha incluido en la revisiÃ³n del piloto.'
      WHERE NOT EXISTS (SELECT 1 FROM feedback_reports WHERE user_id=$1 AND category='accessibility')`, [demoUserId]);
    await client.query(`INSERT INTO analytics_events(user_id,event_name,section,properties,session_day,created_at)
      SELECT $1,'section_viewed','overview','{"seed":true}'::jsonb,CURRENT_DATE-day_offset, NOW()-(day_offset||' days')::interval
      FROM generate_series(0,6) AS series(day_offset)
      WHERE NOT EXISTS (SELECT 1 FROM analytics_events WHERE user_id=$1 AND properties->>'seed'='true')`, [demoUserId]);
    await client.query(`INSERT INTO notifications(user_id,type,title_es,title_en,body_es,body_en)
      SELECT $1,'welcome','Bienvenido a SMAP','Welcome to SMAP','La red demo estÃ¡ lista para explorar.','The demo network is ready to explore.'
      WHERE NOT EXISTS (SELECT 1 FROM notifications WHERE user_id=$1 AND type='welcome')`, [demoUserId]);

    const cohort = await client.query(`INSERT INTO pilot_cohorts(code,name,target_participants,starts_at,ends_at,status)
      VALUES('ALC-PILOT-01','Alicante citizen pilot',30,CURRENT_DATE,CURRENT_DATE+INTERVAL '60 days','active')
      ON CONFLICT(code) DO UPDATE SET status='active',updated_at=NOW() RETURNING id`);
    const cohortId = cohort.rows[0].id;
    const invite = await client.query(`INSERT INTO pilot_invites(cohort_id,code,max_uses,used_count,expires_at,status,created_by)
      VALUES($1,'SMAP-ALICANTE-2026',100,1,NOW()+INTERVAL '180 days','active',$2)
      ON CONFLICT(code) DO UPDATE SET cohort_id=EXCLUDED.cohort_id,max_uses=100,expires_at=EXCLUDED.expires_at,status='active' RETURNING id`, [cohortId,demoUserId]);
    await client.query(`INSERT INTO pilot_memberships(user_id,cohort_id,invite_id,status) VALUES($1,$2,$3,'active')
      ON CONFLICT(user_id) DO UPDATE SET cohort_id=EXCLUDED.cohort_id,invite_id=EXCLUDED.invite_id,status='active',updated_at=NOW()`, [demoUserId,cohortId,invite.rows[0].id]);
    await client.query(`INSERT INTO onboarding_progress(user_id,welcome_completed,profile_completed,accessibility_completed,route_completed,ticket_completed,feedback_completed,completed_at)
      VALUES($1,TRUE,TRUE,TRUE,TRUE,TRUE,TRUE,NOW())
      ON CONFLICT(user_id) DO UPDATE SET welcome_completed=TRUE,profile_completed=TRUE,accessibility_completed=TRUE,route_completed=TRUE,ticket_completed=TRUE,feedback_completed=TRUE,completed_at=COALESCE(onboarding_progress.completed_at,NOW()),updated_at=NOW()`, [demoUserId]);
    await client.query(`INSERT INTO support_cases(user_id,category,priority,subject,message,status,admin_response)
      SELECT $1,'technical','normal','Prueba del centro de ayuda','Esta solicitud de ejemplo permite verificar el flujo de soporte del piloto.','resolved','El equipo ha comprobado la solicitud de demostraciÃ³n.'
      WHERE NOT EXISTS (SELECT 1 FROM support_cases WHERE user_id=$1 AND subject='Prueba del centro de ayuda')`, [demoUserId]);
    const checklist = [
      ['privacy_review','RevisiÃ³n de privacidad completada','Privacy review completed'],
      ['support_rota','Turnos de soporte confirmados','Support rota confirmed'],
      ['participant_list','Lista de participantes validada','Participant list validated'],
      ['devices_tested','Navegadores y dispositivos probados','Browsers and devices tested'],
      ['incident_plan','Plan de incidencias revisado','Incident plan reviewed'],
      ['closing_survey','Encuesta final preparada','Final survey prepared']
    ];
    for (const [key,titleEs,titleEn] of checklist) {
      await client.query(`INSERT INTO pilot_checklist(item_key,title_es,title_en) VALUES($1,$2,$3) ON CONFLICT(item_key) DO NOTHING`, [key,titleEs,titleEn]);
    }
  }

  const campaignTables = await client.query("SELECT to_regclass('public.pilot_campaigns') AS campaigns, to_regclass('public.pilot_surveys') AS surveys");
  if (campaignTables.rows[0]?.campaigns && campaignTables.rows[0]?.surveys && demoUserId) {
    const cohortRow = await client.query("SELECT id FROM pilot_cohorts WHERE code='ALC-PILOT-01'");
    const cohortId = cohortRow.rows[0]?.id ?? null;
    const campaign = await client.query(`INSERT INTO pilot_campaigns(cohort_id,code,title_es,title_en,description_es,description_en,status,starts_at,ends_at,created_by)
      VALUES($1,'SMART-MOBILITY-WEEK','Semana de movilidad inteligente','Smart mobility week','Prueba las funciones principales y comparte tu experiencia con el equipo SMAP.','Try the main features and share your experience with the SMAP team.','active',NOW()-INTERVAL '1 day',NOW()+INTERVAL '30 days',$2)
      ON CONFLICT(code) DO UPDATE SET status='active',ends_at=NOW()+INTERVAL '30 days',updated_at=NOW() RETURNING id`,[cohortId,demoUserId]);
    const campaignId = campaign.rows[0].id;
    const activeSurvey = await client.query(`INSERT INTO pilot_surveys(campaign_id,code,title_es,title_en,description_es,description_en,status,opens_at,closes_at,created_by)
      VALUES($1,'SMAP-EXPERIENCE-2026','Encuesta de experiencia SMAP','SMAP experience survey','Cuestionario breve sobre mapa, llegadas, billetes y accesibilidad.','A short survey about maps, arrivals, tickets and accessibility.','active',NOW()-INTERVAL '1 day',NOW()+INTERVAL '30 days',$2)
      ON CONFLICT(code) DO UPDATE SET status='active',closes_at=NOW()+INTERVAL '30 days',updated_at=NOW() RETURNING id`,[campaignId,demoUserId]);
    const questions = [
      [1,'rating','Valora tu experiencia general con SMAP','Rate your overall experience with SMAP',true,[]],
      [2,'single','Â¿QuÃ© funciÃ³n te ha resultado mÃ¡s Ãºtil?','Which feature was most useful?',true,['Mapa / Map','Llegadas / Arrivals','Billetes / Tickets','Accesibilidad / Accessibility']],
      [3,'single','Â¿RecomendarÃ­as SMAP a otra persona?','Would you recommend SMAP to someone else?',true,['SÃ­ / Yes','Tal vez / Maybe','No']],
      [4,'text','Â¿QuÃ© deberÃ­amos mejorar antes del lanzamiento?','What should we improve before launch?',false,[]],
    ];
    for (const [position,type,promptEs,promptEn,required,options] of questions) {
      await client.query(`INSERT INTO pilot_survey_questions(survey_id,position,question_type,prompt_es,prompt_en,required,options)
        VALUES($1,$2,$3,$4,$5,$6,$7::jsonb) ON CONFLICT(survey_id,position) DO UPDATE SET prompt_es=EXCLUDED.prompt_es,prompt_en=EXCLUDED.prompt_en,required=EXCLUDED.required,options=EXCLUDED.options`,[activeSurvey.rows[0].id,position,type,promptEs,promptEn,required,JSON.stringify(options)]);
    }
    const closedSurvey = await client.query(`INSERT INTO pilot_surveys(campaign_id,code,title_es,title_en,description_es,description_en,status,opens_at,closes_at,created_by)
      VALUES($1,'SMAP-BASELINE-2026','Encuesta inicial','Baseline survey','ValoraciÃ³n inicial del piloto.','Initial pilot assessment.','closed',NOW()-INTERVAL '20 days',NOW()-INTERVAL '10 days',$2)
      ON CONFLICT(code) DO UPDATE SET status='closed' RETURNING id`,[campaignId,demoUserId]);
    const baselineQuestion = await client.query(`INSERT INTO pilot_survey_questions(survey_id,position,question_type,prompt_es,prompt_en,required)
      VALUES($1,1,'rating','ValoraciÃ³n inicial','Initial rating',TRUE) ON CONFLICT(survey_id,position) DO UPDATE SET prompt_es=EXCLUDED.prompt_es RETURNING id`,[closedSurvey.rows[0].id]);
    const baselineResponse = await client.query(`INSERT INTO pilot_survey_responses(survey_id,user_id,submitted_at) VALUES($1,$2,NOW()-INTERVAL '12 days')
      ON CONFLICT(survey_id,user_id) DO UPDATE SET submitted_at=COALESCE(pilot_survey_responses.submitted_at,EXCLUDED.submitted_at) RETURNING id`,[closedSurvey.rows[0].id,demoUserId]);
    await client.query(`INSERT INTO pilot_survey_answers(response_id,question_id,answer) VALUES($1,$2,'4'::jsonb) ON CONFLICT(response_id,question_id) DO NOTHING`,[baselineResponse.rows[0].id,baselineQuestion.rows[0].id]);
    await client.query(`INSERT INTO pilot_broadcasts(cohort_id,campaign_id,title_es,title_en,body_es,body_en,status,recipient_count,created_by,sent_at)
      SELECT $1,$2,'Nueva campaÃ±a del piloto','New pilot campaign','Ya puedes completar la encuesta de experiencia desde la secciÃ³n CampaÃ±as.','You can now complete the experience survey from the Campaigns section.','sent',1,$3,NOW()-INTERVAL '2 hours'
      WHERE NOT EXISTS (SELECT 1 FROM pilot_broadcasts WHERE campaign_id=$2 AND title_en='New pilot campaign')`,[cohortId,campaignId,demoUserId]);
  }

  const closureTables = await client.query("SELECT to_regclass('public.pilot_improvement_actions') AS actions, to_regclass('public.pilot_final_reports') AS reports");
  if (closureTables.rows[0]?.actions && closureTables.rows[0]?.reports && demoUserId) {
    const cohortRow = await client.query("SELECT id FROM pilot_cohorts WHERE code='ALC-PILOT-01'");
    const cohortId = cohortRow.rows[0]?.id ?? null;
    await client.query(`UPDATE pilot_checklist SET completed=TRUE,completed_by=$1,completed_at=COALESCE(completed_at,NOW()),updated_at=NOW() WHERE item_key IN ('privacy_review','support_rota','participant_list','devices_tested')`,[demoUserId]);
    const actionOne = await client.query(`INSERT INTO pilot_improvement_actions(cohort_id,title_es,title_en,description_es,description_en,category,priority,impact,effort,status,owner,target_date,source_type,source_reference,created_by)
      SELECT $1,'AÃ±adir descripciones accesibles de las paradas','Add accessible stop descriptions','Incluir informaciÃ³n textual sobre acceso, entorno y barreras en las paradas prioritarias.','Add textual information about access, surroundings and barriers at priority stops.','accessibility','high','high','small','approved','Equipo UX',CURRENT_DATE+30,'feedback','accessibility-stop',$2
      WHERE NOT EXISTS (SELECT 1 FROM pilot_improvement_actions WHERE source_reference='accessibility-stop') RETURNING id`,[cohortId,demoUserId]);
    await client.query(`INSERT INTO pilot_improvement_actions(cohort_id,title_es,title_en,description_es,description_en,category,priority,impact,effort,status,owner,target_date,source_type,source_reference,created_by)
      SELECT $1,'Conectar telemetrÃ­a real de AVANZA','Connect live AVANZA telemetry','Validar el contrato de datos y ejecutar una prueba controlada con vehÃ­culos reales.','Validate the data contract and run a controlled test with live vehicles.','integration','high','high','large','in_progress','Equipo Integraciones',CURRENT_DATE+60,'manual','avanza-live',$2
      WHERE NOT EXISTS (SELECT 1 FROM pilot_improvement_actions WHERE source_reference='avanza-live')`,[cohortId,demoUserId]);
    await client.query(`INSERT INTO pilot_improvement_actions(cohort_id,title_es,title_en,description_es,description_en,category,priority,impact,effort,status,owner,target_date,source_type,source_reference,created_by)
      SELECT $1,'Mejorar el mensaje de activaciÃ³n del billete','Improve the ticket activation message','Aclarar que la activaciÃ³n inicia inmediatamente el periodo de validez.','Clarify that activation immediately starts the validity period.','ticketing','medium','medium','small','proposed','Producto',CURRENT_DATE+21,'survey','ticket-activation',$2
      WHERE NOT EXISTS (SELECT 1 FROM pilot_improvement_actions WHERE source_reference='ticket-activation')`,[cohortId,demoUserId]);
    const firstAction = actionOne.rows[0]?.id ?? (await client.query("SELECT id FROM pilot_improvement_actions WHERE source_reference='accessibility-stop'")).rows[0]?.id;
    if (firstAction) await client.query(`INSERT INTO pilot_decisions(action_id,title,decision,rationale,decided_by)
      SELECT $1,'Priorizar accesibilidad de paradas','approve','La mejora tiene alto impacto ciudadano y un esfuerzo de implementaciÃ³n reducido.',$2
      WHERE NOT EXISTS (SELECT 1 FROM pilot_decisions WHERE action_id=$1 AND decision='approve')`,[firstAction,demoUserId]);
    const demoMetrics = {participants:1,onboardingCompleted:1,onboardingCompletionRate:100,eligibleSurveyResponses:2,submittedSurveyResponses:1,surveyResponseRate:50,averageSurveyRating:4,averageFeedbackRating:4,averageRating:4,supportTotal:1,supportResolved:1,supportResolutionRate:100,checklistTotal:6,checklistCompleted:4,checklistCompletionRate:67,activeUsers14d:1,activeUseRate:100,ticketsPurchased:1,openFeedback:1,criticalOpenActions:0,readinessScore:81,recommendation:'go'};
    const demoFindings = [{tone:'positive',code:'rating',es:'La valoraciÃ³n media del piloto es alta.',en:'The pilot average rating is high.'},{tone:'warning',code:'survey',es:'La tasa de respuesta de las encuestas es inferior al objetivo del 60%.',en:'Survey response is below the 60% target.'}];
    await client.query(`INSERT INTO pilot_kpi_snapshots(cohort_id,period_start,period_end,metrics,findings,generated_by)
      SELECT $1,CURRENT_DATE-30,CURRENT_DATE,$2::jsonb,$3::jsonb,$4 WHERE NOT EXISTS (SELECT 1 FROM pilot_kpi_snapshots WHERE metrics->>'seed'='sprint12')`,[cohortId,JSON.stringify({...demoMetrics,seed:'sprint12'}),JSON.stringify(demoFindings),demoUserId]);
    await client.query(`INSERT INTO pilot_final_reports(cohort_id,title,status,executive_summary_es,executive_summary_en,recommendation,metrics,findings,risks,generated_by,published_at)
      SELECT $1,'SMAP Pilot â€” Informe de cierre','final','El piloto demuestra una base sÃ³lida para avanzar, con mejoras condicionantes en participaciÃ³n, integraciÃ³n de datos y claridad de la activaciÃ³n de billetes.','The pilot demonstrates a solid basis to proceed, with conditions around participation, data integration and ticket activation clarity.','go_with_conditions',$2::jsonb,$3::jsonb,'["Completar la validaciÃ³n con telemetrÃ­a real antes del lanzamiento.","Ampliar la muestra de participantes."]'::jsonb,$4,NOW()
      WHERE NOT EXISTS (SELECT 1 FROM pilot_final_reports WHERE title='SMAP Pilot â€” Informe de cierre')`,[cohortId,JSON.stringify(demoMetrics),JSON.stringify(demoFindings),demoUserId]);
  }

  const goLiveTables = await client.query("SELECT to_regclass('public.feature_flags') AS flags, to_regclass('public.go_live_checklist') AS checklist");
  if (goLiveTables.rows[0]?.flags && goLiveTables.rows[0]?.checklist && demoUserId) {
    const flags = [
      ['ticketing','Billetteria digitale e QR','Digital ticketing and QR',true,100],
      ['feedback','Opinione e segnalazioni cittadine','Citizen feedback and reports',true,100],
      ['campaigns','Campagne e questionari del pilot','Pilot campaigns and surveys',true,100],
      ['pilot_results','Risultati aggregati del pilot','Aggregated pilot results',true,100],
      ['external_integrations','Dati esterni e telemetria operatore','External operator data and telemetry',true,100],
    ];
    for (const [key,descriptionEs,descriptionEn,enabled,rollout] of flags) {
      await client.query(`INSERT INTO feature_flags(flag_key,description_es,description_en,enabled,rollout_percent,updated_by)
        VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(flag_key) DO UPDATE SET description_es=EXCLUDED.description_es,description_en=EXCLUDED.description_en`,[key,descriptionEs,descriptionEn,enabled,rollout,demoUserId]);
    }
    const policies = [
      ['analytics','analytics_events','created_at',90],['telemetry','external_bus_positions','recorded_at',7],['audit','audit_logs','created_at',365],['checks','system_checks','checked_at',90],['notifications','notifications','created_at',180],
    ];
    for (const [key,table,column,days] of policies) await client.query(`INSERT INTO data_retention_policies(policy_key,table_name,timestamp_column,retention_days,updated_by) VALUES($1,$2,$3,$4,$5) ON CONFLICT(policy_key) DO NOTHING`,[key,table,column,days,demoUserId]);
    const checklistItems = [
      ['production_secrets','Segreti di produzione configurati','Production secrets configured','security',true,true,'AUTH_SECRET e chiave integrazione separate dal codice'],
      ['database_backup','Backup PostgreSQL verificato','PostgreSQL backup verified','data',true,true,'Backup Sprint 12 con checksum SHA-256'],
      ['restore_drill','Prova di ripristino completata','Restore drill completed','data',true,false,null],
      ['https_proxy','HTTPS e reverse proxy configurati','HTTPS and reverse proxy configured','infrastructure',true,false,null],
      ['monitoring_alerts','Monitoraggio e avvisi operativi attivi','Monitoring and operational alerts enabled','operations',true,true,'Health, readiness e status endpoint disponibili'],
      ['incident_runbook','Runbook incidenti approvato','Incident runbook approved','operations',true,true,'docs/RUNBOOK.md'],
      ['privacy_approval','Revisione privacy approvata','Privacy review approved','privacy',true,true,'Centro privacy e consenso versionato'],
      ['accessibility_review','Revisione accessibilitÃ  completata','Accessibility review completed','accessibility',true,true,'Preferenze WCAG e navigazione tastiera verificate'],
      ['avanza_contract','Contratto dati AVANZA validato','AVANZA data contract validated','business',true,false,null],
      ['rollback_plan','Piano di rollback provato','Rollback plan tested','operations',true,true,'Release registry e backup documentati'],
    ];
    for (const [key,titleEs,titleEn,category,required,completed,evidence] of checklistItems) await client.query(`INSERT INTO go_live_checklist(item_key,title_es,title_en,category,required,completed,evidence,completed_by,completed_at)
      VALUES($1,$2,$3,$4,$5,$6,$7,CASE WHEN $6 THEN $8::uuid ELSE NULL END,CASE WHEN $6 THEN NOW() ELSE NULL END)
      ON CONFLICT(item_key) DO UPDATE SET title_es=EXCLUDED.title_es,title_en=EXCLUDED.title_en,category=EXCLUDED.category,required=EXCLUDED.required`,[key,titleEs,titleEn,category,required,completed,evidence,demoUserId]);
    await client.query(`INSERT INTO operational_contacts(contact_role,name,email,escalation_level)
      SELECT 'Product owner','Responsable SMAP','product@smap.local',1 WHERE NOT EXISTS (SELECT 1 FROM operational_contacts WHERE email='product@smap.local')`);
    await client.query(`INSERT INTO operational_contacts(contact_role,name,email,escalation_level)
      SELECT 'Technical lead','Equipo tÃ©cnico SMAP','tech@smap.local',2 WHERE NOT EXISTS (SELECT 1 FROM operational_contacts WHERE email='tech@smap.local')`);
    await client.query(`INSERT INTO operational_contacts(contact_role,name,email,escalation_level)
      SELECT 'Support','Soporte ciudadano','support@smap.local',3 WHERE NOT EXISTS (SELECT 1 FROM operational_contacts WHERE email='support@smap.local')`);
    await client.query(`INSERT INTO release_approvals(release_version,environment,decision,approver_name,approver_email,notes,decided_by)
      SELECT '1.0.0','production','conditional','ComitÃ© demo SMAP','go-live@smap.local','AprobaciÃ³n condicionada a completar restauraciÃ³n, HTTPS y contrato de datos AVANZA.',$1
      WHERE NOT EXISTS (SELECT 1 FROM release_approvals WHERE release_version='1.0.0' AND environment='production')`,[demoUserId]);
    await client.query(`INSERT INTO go_live_snapshots(release_version,environment,readiness_score,recommendation,blockers,details,generated_by)
      SELECT '1.0.0','local',72,'ready_with_conditions','["checklist:restore_drill","checklist:https_proxy","checklist:avanza_contract"]'::jsonb,'{"seed":"sprint13","checklistRate":70}'::jsonb,$1
      WHERE NOT EXISTS (SELECT 1 FROM go_live_snapshots WHERE details->>'seed'='sprint13')`,[demoUserId]);
  }

  const continuityExists = await client.query("SELECT to_regclass('public.operational_slos') AS name");
  if (continuityExists.rows[0]?.name && demoUserId) {
    const slos = [
      ['availability_pct','Disponibilidad del servicio','Service availability','min',99.5,99.0,'%',60,99.82],
      ['api_latency_p95_ms','Latencia API p95','API p95 latency','max',750,1000,'ms',60,182],
      ['stale_telemetry_pct','TelemetrÃ­a obsoleta','Stale telemetry','max',5,10,'%',30,2.4],
      ['ticket_success_pct','Compras de billetes correctas','Successful ticket purchases','min',98,95,'%',1440,99.1],
    ];
    for (const [key,nameEs,nameEn,direction,target,warning,unit,windowMinutes,current] of slos) {
      await client.query(`INSERT INTO operational_slos(metric_key,name_es,name_en,direction,target_value,warning_value,unit,window_minutes,updated_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT(metric_key) DO UPDATE SET name_es=EXCLUDED.name_es,name_en=EXCLUDED.name_en,direction=EXCLUDED.direction,unit=EXCLUDED.unit`,[key,nameEs,nameEn,direction,target,warning,unit,windowMinutes,demoUserId]);
      await client.query(`INSERT INTO operational_measurements(metric_key,value,source,details,recorded_by) SELECT $1,$2,'seed','{"seed":"sprint15"}'::jsonb,$3 WHERE NOT EXISTS(SELECT 1 FROM operational_measurements WHERE metric_key=$1 AND details->>'seed'='sprint15')`,[key,current,demoUserId]);
    }
    await client.query(`INSERT INTO on_call_shifts(role,contact_name,email,phone,starts_at,ends_at,status,notes,created_by) SELECT 'primary','Equipo SMAP','ops@smap.local','+34 900 000 000',NOW()-INTERVAL '1 hour',NOW()+INTERVAL '7 hours','active','Guardia operativa demostrativa',$1 WHERE NOT EXISTS(SELECT 1 FROM on_call_shifts WHERE email='ops@smap.local' AND ends_at>NOW())`,[demoUserId]);
    await client.query(`INSERT INTO continuity_exercises(exercise_type,title_es,title_en,status,scheduled_at,completed_at,result_es,result_en,evidence,created_by) SELECT 'backup_restore','RestauraciÃ³n de backup trimestral','Quarterly backup restore','completed',NOW()-INTERVAL '7 days',NOW()-INTERVAL '7 days' + INTERVAL '42 minutes','RestauraciÃ³n completada en 42 minutos.','Restore completed in 42 minutes.','backups/smap-sprint14.backup',$1 WHERE NOT EXISTS(SELECT 1 FROM continuity_exercises WHERE evidence='backups/smap-sprint14.backup')`,[demoUserId]);
    await client.query(`INSERT INTO continuity_exercises(exercise_type,title_es,title_en,status,scheduled_at,created_by) SELECT 'incident_drill','Simulacro de pÃ©rdida de telemetrÃ­a','Telemetry loss drill','planned',NOW()+INTERVAL '14 days',$1 WHERE NOT EXISTS(SELECT 1 FROM continuity_exercises WHERE title_en='Telemetry loss drill')`,[demoUserId]);
    const incident = await client.query(`INSERT INTO service_incidents(severity,status,title_es,title_en,body_es,body_en,starts_at,resolved_at,created_by) SELECT 'critical','resolved','InterrupciÃ³n simulada de la API','Simulated API outage','Incidente de demostraciÃ³n resuelto durante el ejercicio.','Demo incident resolved during the exercise.',NOW()-INTERVAL '30 days',NOW()-INTERVAL '30 days'+INTERVAL '18 minutes',$1 WHERE NOT EXISTS(SELECT 1 FROM service_incidents WHERE title_en='Simulated API outage') RETURNING id`,[demoUserId]);
    const incidentId=incident.rows[0]?.id ?? (await client.query("SELECT id FROM service_incidents WHERE title_en='Simulated API outage' LIMIT 1")).rows[0]?.id;
    if (incidentId) await client.query(`INSERT INTO incident_postmortems(incident_id,status,summary_es,summary_en,impact_es,impact_en,root_cause_es,root_cause_en,corrective_actions,owner,created_by,published_at) VALUES($1,'published','InterrupciÃ³n breve detectada por health checks.','Short outage detected by health checks.','Sin pÃ©rdida de datos; acceso temporalmente degradado.','No data loss; access temporarily degraded.','ConfiguraciÃ³n invÃ¡lida en una variable de despliegue.','Invalid deployment environment variable.','["Validar variables en preflight","Mantener rollback automÃ¡tico"]'::jsonb,'Equipo SMAP',$2,NOW()) ON CONFLICT(incident_id) DO NOTHING`,[incidentId,demoUserId]);
  }

  const auditExists = await client.query("SELECT to_regclass('public.audit_logs') AS name");
  if (auditExists.rows[0]?.name && demoUserId) {
    await client.query(`INSERT INTO audit_logs(actor_user_id,actor_email,action,entity_type,entity_id,details)
      SELECT $1,'demo@smap.local','system.seed_completed','system','smap-web','{"version":"1.0.0"}'::jsonb
      WHERE NOT EXISTS (SELECT 1 FROM audit_logs WHERE action='system.seed_completed' AND details->>'version'='1.0.0')`, [demoUserId]);
  }

  const runtimeExists = await client.query("SELECT to_regclass('public.runtime_settings') AS name");
  if (runtimeExists.rows[0]?.name) {
    await client.query(`INSERT INTO runtime_settings(id,support_email) VALUES(1,'support@smap.local') ON CONFLICT(id) DO NOTHING`);
    await client.query(`INSERT INTO deployment_releases(version,deployment_id,environment,status,notes,deployed_at)
      VALUES('1.0.0','local-1.0.0','local','deployed','Sprint 15 operational continuity local demo release',NOW())
      ON CONFLICT(deployment_id) DO NOTHING`);
  }


  const releaseOpsExists = await client.query("SELECT to_regclass('public.release_plans') AS name");
  if (releaseOpsExists.rows[0]?.name && demoUserId) {
    const releasePlan = await client.query(`INSERT INTO release_plans(release_version,deployment_id,environment,strategy,status,rollout_percent,owner,notes,created_by,started_at)
      VALUES('1.0.0','local-1.0.0','local','canary','in_progress',25,'Equipo SMAP','Release local de demostraciÃ³n con rollout controlado.',$1,NOW())
      ON CONFLICT(deployment_id) DO UPDATE SET release_version=EXCLUDED.release_version,owner=EXCLUDED.owner,updated_at=NOW() RETURNING id`,[demoUserId]);
    const releasePlanId=releasePlan.rows[0].id;
    const releaseSteps=[
      ['backup','Crear y verificar backup','Create and verify backup',1,'completed','Backup JSON verificado con SHA-256'],
      ['preflight','Ejecutar preflight','Run preflight',2,'completed','Preflight local correcto'],
      ['build','Construir artefacto','Build release artifact',3,'completed','Build preparado para validaciÃ³n local'],
      ['deploy','Desplegar versiÃ³n','Deploy release',4,'in_progress','Rollout canary al 25%'],
      ['smoke','Ejecutar smoke tests','Run smoke tests',5,'pending',null],
      ['monitor','Observar mÃ©tricas y errores','Observe metrics and errors',6,'pending',null],
      ['promote','Completar rollout','Complete rollout',7,'pending',null],
    ];
    for(const [key,titleEs,titleEn,sequence,status,evidence] of releaseSteps) await client.query(`INSERT INTO release_steps(plan_id,step_key,title_es,title_en,sequence,status,evidence,updated_by,completed_at,started_at)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,CASE WHEN $6='completed' THEN NOW() ELSE NULL END,CASE WHEN $6='in_progress' THEN NOW() ELSE NULL END)
      ON CONFLICT(plan_id,step_key) DO UPDATE SET title_es=EXCLUDED.title_es,title_en=EXCLUDED.title_en,sequence=EXCLUDED.sequence`,[releasePlanId,key,titleEs,titleEn,sequence,status,evidence,demoUserId]);
    await client.query(`INSERT INTO release_rollback_points(plan_id,label,backup_reference,deployment_reference)
      SELECT $1,'Pre-deploy 1.0.0','backups/smap-sprint14.backup','local-1.0.0'
      WHERE NOT EXISTS(SELECT 1 FROM release_rollback_points WHERE plan_id=$1 AND label='Pre-deploy 1.0.0')`,[releasePlanId]);
    await client.query(`INSERT INTO release_health_observations(plan_id,observation_type,status,title,details,recorded_by)
      SELECT $1,'validation','ok','Base de datos y API disponibles','{"seed":"sprint14","latencyMs":18}'::jsonb,$2
      WHERE NOT EXISTS(SELECT 1 FROM release_health_observations WHERE plan_id=$1 AND details->>'seed'='sprint14')`,[releasePlanId,demoUserId]);
  }

  const handoverExists = await client.query("SELECT to_regclass('public.handover_checklist') AS checklist, to_regclass('public.handover_documents') AS documents");
  if (handoverExists.rows[0]?.checklist && handoverExists.rows[0]?.documents && demoUserId) {
    const handoverItems = [
      ['source_archive','technical','CÃ³digo fuente y versiÃ³n 1.0 archivados','Source code and version 1.0 archived',true,true,'smap_web_sprint16.zip','Equipo SMAP'],
      ['database_migrations','data','Migraciones 001â€“016 documentadas','Migrations 001â€“016 documented',true,true,'database/','Equipo SMAP'],
      ['clean_install','technical','InstalaciÃ³n limpia verificada','Clean installation verified',true,false,null,'Equipo receptor'],
      ['backup_restore','operations','Backup y restauraciÃ³n comprobados','Backup and restore verified',true,true,'docs/BACKUP_RECOVERY.md','Operaciones'],
      ['security_review','security','Controles de seguridad revisados','Security controls reviewed',true,true,'docs/SECURITY.md','Seguridad'],
      ['accessibility_review','business','Accesibilidad y navegaciÃ³n por teclado revisadas','Accessibility and keyboard navigation reviewed',true,true,'docs/WEB_SPRINT_5.md','UX'],
      ['integration_contract','data','Contrato de datos reales identificado','Real-data contract identified',false,true,'docs/INTEGRATIONS.md','Integraciones'],
      ['operational_owner','operations','Responsable operativo y escalado asignados','Operational owner and escalation assigned',true,true,'docs/OPERATIONAL_CONTINUITY.md','Operaciones']
    ];
    for (const [key,category,titleEs,titleEn,required,completed,evidence,owner] of handoverItems) await client.query(`INSERT INTO handover_checklist(item_key,category,title_es,title_en,required,completed,evidence,owner,completed_by,completed_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,CASE WHEN $6 THEN $9::uuid ELSE NULL END,CASE WHEN $6 THEN NOW() ELSE NULL END) ON CONFLICT(item_key) DO UPDATE SET title_es=EXCLUDED.title_es,title_en=EXCLUDED.title_en,required=EXCLUDED.required`,[key,category,titleEs,titleEn,required,completed,evidence,owner,demoUserId]);
    const docs = [
      ['readme','GuÃ­a principal','Main guide','README.md','approved','Equipo SMAP'],
      ['architecture','Arquitectura','Architecture','docs/ARCHITECTURE.md','approved','Arquitectura'],
      ['api_catalog','CatÃ¡logo API','API catalogue','docs/API_CATALOG.md','approved','Backend'],
      ['data_dictionary','Diccionario de datos','Data dictionary','docs/DATA_DICTIONARY.md','approved','Datos'],
      ['security','Seguridad','Security','docs/SECURITY.md','approved','Seguridad'],
      ['runbook','Runbook operativo','Operational runbook','docs/RUNBOOK.md','approved','Operaciones'],
      ['acceptance','AceptaciÃ³n de instalaciÃ³n','Installation acceptance','docs/INSTALLATION_ACCEPTANCE.md','reviewed','Equipo receptor']
    ];
    for (const [key,titleEs,titleEn,path,status,owner] of docs) await client.query(`INSERT INTO handover_documents(document_key,title_es,title_en,relative_path,version,status,owner,last_reviewed_at,updated_by) VALUES($1,$2,$3,$4,'1.0.0',$5,$6,CASE WHEN $5 IN ('reviewed','approved') THEN NOW() ELSE NULL END,$7) ON CONFLICT(document_key) DO UPDATE SET title_es=EXCLUDED.title_es,title_en=EXCLUDED.title_en,relative_path=EXCLUDED.relative_path,version='1.0.0'`,[key,titleEs,titleEn,path,status,owner,demoUserId]);
    await client.query(`INSERT INTO audit_logs(actor_user_id,actor_email,action,entity_type,entity_id,details) SELECT $1,'demo@smap.local','system.seed_completed','system','smap-web','{"version":"1.0.0"}'::jsonb WHERE NOT EXISTS(SELECT 1 FROM audit_logs WHERE action='system.seed_completed' AND details->>'version'='1.0.0')`,[demoUserId]);
  }

  await client.query("COMMIT");
  console.log("Seed complete: operational continuity, releases, pilot operations, privacy, network and sample ticket.");
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  await client.end();
}

