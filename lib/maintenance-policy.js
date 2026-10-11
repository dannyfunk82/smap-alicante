const severityOrder = { ok: 0, warning: 1, error: 2 };

export function maintenanceStatus(checks = []) {
  let result = "ok";
  for (const check of checks) {
    const status = String(check?.status || "ok").toLowerCase();
    if ((severityOrder[status] ?? 0) > severityOrder[result]) result = status;
  }
  return result;
}

export function redactSecret(value) {
  if (value == null || value === "") return "<not-set>";
  const text = String(value);
  if (/^postgres(?:ql)?:\/\//i.test(text)) {
    try {
      const url = new URL(text);
      if (url.password) url.password = "***";
      if (url.username) url.username = url.username.slice(0, 2) + "***";
      return url.toString();
    } catch { return "<redacted-database-url>"; }
  }
  if (text.length <= 8) return "***";
  return `${text.slice(0, 3)}***${text.slice(-2)}`;
}

export function integritySeverity(findings = []) {
  const critical = findings.filter((item) => item?.severity === "error").length;
  const warnings = findings.filter((item) => item?.severity === "warning").length;
  return { status: critical > 0 ? "error" : warnings > 0 ? "warning" : "ok", critical, warnings, total: findings.length };
}

export function safeSupportBundleName(date = new Date()) {
  const stamp = date.toISOString().replaceAll(":", "-").replace(/\.\d{3}Z$/, "Z");
  return `SMAP-support-${stamp}.zip`;
}
