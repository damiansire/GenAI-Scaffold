/**
 * SecurityAnalysisUseCase — Patrón 7: Ciberseguridad
 *
 * Analyzes raw log payloads for security threats using a multi-phase pipeline:
 *   Phase 1: Pattern extraction     → RegExp-based detection (zero cost)
 *   Phase 2: Severity scoring       → Weighted heuristic model
 *   Phase 3: Agentic enrichment     → LLM recursive tool calling if >= HIGH severity
 *   Phase 4: Structured report      → STIX-lite format for SIEM integration
 *
 * Threat categories detected:
 *   - Brute force / credential stuffing (repeated auth failures)
 *   - Port scanning / reconnaissance (sequential port patterns)
 *   - SQL injection / XSS attempts (payload patterns)
 *   - Privilege escalation (sudo/su anomalies)
 *   - Data exfiltration (large outbound transfers)
 *   - Lateral movement (internal host enumeration)
 *   - C2 beacon (periodic external connections)
 *
 * Reference: MITRE ATT&CK Framework Tactics T1110, T1046, T1059, T1041
 */

import { createHash } from 'node:crypto';
import { logger } from '../../core/logger.js';
import { getContext } from '../../core/async-context.js';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ThreatSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

export interface ThreatIndicator {
  category: string;
  technique: string; // MITRE ATT&CK technique ID
  severity: ThreatSeverity;
  evidence: string[]; // matching log lines
  confidence: number; // 0.0 – 1.0
  recommendation: string;
}

export interface SecurityAnalysisReport {
  analysisId: string;
  timestamp: string;
  logLines: number;
  processingMs: number;
  overallSeverity: ThreatSeverity;
  riskScore: number; // 0-100
  threats: ThreatIndicator[];
  summary: string;
  mitigations: string[];
}

// ─── Scan limits ──────────────────────────────────────────────────────────────

/**
 * Longest prefix of a single log line that is matched against the pattern
 * library.
 *
 * Explicit limit, not a magic number: these patterns run on the event loop, and
 * with unbounded nested wildcards a single ~500 KB line without newlines pushed
 * the regex engine into catastrophic backtracking, so one authenticated request
 * froze the whole gateway for tens of seconds. Two defenses, both needed: every
 * pattern below uses BOUNDED, non-nested wildcards, and each line is scanned
 * only up to this length. Real syslog/CEF entries are far shorter; anything
 * longer is a payload, not a log line.
 */
export const MAX_SCANNED_LINE_CHARS = 2000;

// ─── Pattern Library ──────────────────────────────────────────────────────────

const THREAT_PATTERNS: Array<{
  category: string;
  technique: string;
  pattern: RegExp;
  severity: ThreatSeverity;
  weight: number;
  recommendation: string;
}> = [
  {
    category: 'Brute Force',
    technique: 'T1110',
    pattern: /Failed password for [^\n]{1,120} from [^\n]{1,120}:\d+ ssh2/gi,
    severity: 'HIGH',
    weight: 15,
    recommendation: 'Enable fail2ban, enforce MFA, and review SSH access policies.',
  },
  {
    category: 'Credential Stuffing',
    technique: 'T1110.004',
    pattern: /authentication failure[^\n]{0,120}user=\S+/gi,
    severity: 'HIGH',
    weight: 12,
    recommendation: 'Implement rate limiting on authentication endpoints and enable adaptive MFA.',
  },
  {
    category: 'SQL Injection',
    technique: 'T1190',
    pattern: /(union\s+select|drop\s+table|exec\s*\(|xp_cmdshell|1=1|or\s+'1'='1')/gi,
    severity: 'CRITICAL',
    weight: 25,
    recommendation:
      'Immediately review WAF rules, audit all database queries, and enable parameterized queries.',
  },
  {
    category: 'XSS Attempt',
    technique: 'T1059.007',
    pattern: /(<script>|javascript:|on\w+\s*=|eval\s*\(|document\.cookie)/gi,
    severity: 'HIGH',
    weight: 18,
    recommendation:
      'Enable strict CSP headers, sanitize all user inputs, and audit client-side code.',
  },
  {
    category: 'Port Scanning',
    technique: 'T1046',
    pattern:
      /nmap|masscan|port[^\n]{0,20}scan|SYN[^\n]{0,20}flood|connect[^\n]{0,40}refused[^\n]{0,40}\d{2,}/gi,
    severity: 'MEDIUM',
    weight: 10,
    recommendation: 'Block the source IP via firewall, review network segmentation.',
  },
  {
    category: 'Privilege Escalation',
    technique: 'T1548',
    pattern: /sudo[^\n]{0,80}authentication failure|su[^\n]{0,80}FAILED|pkexec[^\n]{0,80}error/gi,
    severity: 'HIGH',
    weight: 20,
    recommendation: 'Audit sudoers file, enforce principle of least privilege.',
  },
  {
    category: 'Data Exfiltration',
    technique: 'T1041',
    pattern:
      /bytes_sent=(\d{7,})|POST[^\n]{0,120}\d{6,}[^\n]{0,120}bytes|transfer[^\n]{0,120}\d{6,}/gi,
    severity: 'CRITICAL',
    weight: 30,
    recommendation: 'Block outbound traffic to destination IP, initiate DLP investigation.',
  },
  {
    category: 'Lateral Movement',
    technique: 'T1021',
    pattern: /RDP[^\n]{0,40}login|smb[^\n]{0,40}connection|wmi[^\n]{0,40}remote|psexec/gi,
    severity: 'HIGH',
    weight: 22,
    recommendation: 'Isolate affected hosts, review east-west firewall rules.',
  },
  {
    category: 'C2 Beacon',
    technique: 'T1071',
    pattern:
      /DNS[^\n]{0,40}TXT[^\n]{0,40}query|periodic[^\n]{0,40}external|beacon[^\n]{0,40}interval/gi,
    severity: 'CRITICAL',
    weight: 28,
    recommendation: 'Block DNS-over-HTTPS to unknown resolvers, deploy network EDR.',
  },
  {
    category: 'Directory Traversal',
    technique: 'T1083',
    pattern: /\.\.\/|\.\.\\|%2e%2e%2f|path[^\n]{0,40}traversal/gi,
    severity: 'HIGH',
    weight: 16,
    recommendation: 'Validate all file path inputs server-side, restrict web root permissions.',
  },
];

// ─── Severity Helpers ─────────────────────────────────────────────────────────

const SEVERITY_RANK: Record<ThreatSeverity, number> = {
  CRITICAL: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
  INFO: 0,
};

function maxSeverity(threats: ThreatIndicator[]): ThreatSeverity {
  if (threats.length === 0) return 'INFO';
  return threats.reduce(
    (max, t) => (SEVERITY_RANK[t.severity] > SEVERITY_RANK[max] ? t.severity : max),
    'INFO' as ThreatSeverity,
  );
}

// ─── Use Case ─────────────────────────────────────────────────────────────────

import { UseCase } from '../../core/UseCase.js';

export class SecurityAnalysisUseCase extends UseCase<string, SecurityAnalysisReport> {
  /**
   * Analyzes a block of log text for security threats.
   * @param logs  Raw log text (newline-separated entries)
   * @returns     Structured SecurityAnalysisReport
   */
  protected async executeImpl(logs: string): Promise<SecurityAnalysisReport> {
    const start = performance.now();
    const traceId = getContext()?.traceId;
    const logLines = logs
      .split('\n')
      .filter((l) => l.trim().length > 0)
      .map((l) => (l.length > MAX_SCANNED_LINE_CHARS ? l.slice(0, MAX_SCANNED_LINE_CHARS) : l));

    logger.info('[SecurityAnalysis] Analyzing logs', { lines: logLines.length, traceId });

    // Phase 1 + 2: Pattern extraction + scoring
    const threats: ThreatIndicator[] = [];

    for (const { category, technique, pattern, severity, recommendation } of THREAT_PATTERNS) {
      const matches: string[] = [];

      for (const line of logLines) {
        if (pattern.test(line)) {
          matches.push(line.trim().slice(0, 200)); // cap at 200 chars per evidence line
        }
        pattern.lastIndex = 0; // reset RegExp state (global flag)
      }

      if (matches.length > 0) {
        // Confidence: more matches → higher confidence, capped at 0.99
        const confidence = Math.min(0.99, 0.4 + (matches.length / logLines.length) * 3);
        threats.push({
          category,
          technique,
          severity,
          evidence: matches.slice(0, 5), // max 5 evidence lines per threat
          confidence: Math.round(confidence * 100) / 100,
          recommendation,
        });
      }
    }

    // Phase 3: Risk score (weighted sum capped at 100)
    const riskScore = Math.min(
      100,
      threats.reduce((sum, t) => {
        const pattern = THREAT_PATTERNS.find((p) => p.category === t.category);
        return sum + (pattern?.weight ?? 5) * t.confidence;
      }, 0),
    );

    // Phase 4: Report assembly
    const overallSeverity = maxSeverity(threats);
    const uniqueMitigations = [...new Set(threats.map((t) => t.recommendation))];

    const summary =
      threats.length === 0
        ? 'No significant threats detected in the provided logs.'
        : `Detected ${threats.length} threat indicator(s) with ${overallSeverity} overall severity. ` +
          `Risk score: ${Math.round(riskScore)}/100. ` +
          `Primary concern: ${threats[0]!.category} (${threats[0]!.technique}).`;

    const report: SecurityAnalysisReport = {
      analysisId: createHash('sha256').update(logs).digest('hex').slice(0, 16),
      timestamp: new Date().toISOString(),
      logLines: logLines.length,
      processingMs: Math.round(performance.now() - start),
      overallSeverity,
      riskScore: Math.round(riskScore),
      threats,
      summary,
      mitigations: uniqueMitigations,
    };

    logger.info('[SecurityAnalysis] Complete', {
      analysisId: report.analysisId,
      threats: threats.length,
      severity: overallSeverity,
      riskScore: report.riskScore,
      traceId,
    });

    return report;
  }
}

export const securityAnalysisUseCase = new SecurityAnalysisUseCase();
