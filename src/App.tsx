import { useState } from "react";
import "./App.css";

// ─── Types ────────────────────────────────────────────────────────────────────

type Role = "Teamlead" | "Project Manager" | "Team Member" | "Manager";
type AssignmentType = "Project" | "Base Service" | "Charge On" | "Internal Initiative";
type Tab = "overview" | "assignments" | "projects" | "services" | "add";

type Period = {
  id: number;
  startWeek: number;
  endWeek: number;
  allocationPercent: number;
};

type Assignment = {
  id: number;
  name: string;
  team: string;
  country: string;
  skillset: string;
  level: string;
  type: AssignmentType;
  workName: string;
  projectId: number | null;
  periods: Period[];
  confirmed: boolean;
  confirmedBy: string | null;
};

type Project = {
  id: number;
  name: string;
  projectManager: string;
};

type BaseService = {
  name: string;
  team: string;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const WEEKS = Array.from({ length: 52 }, (_, i) => i + 1);
const PREVIEW_WEEKS = WEEKS.slice(0, 12);
const TEAMS = ["Development", "Platform", "PMO"];
const COUNTRIES = ["Sweden", "Poland"];
const LEVELS = ["Junior", "Mid", "Senior"];
const TYPES: AssignmentType[] = ["Project", "Base Service", "Charge On", "Internal Initiative"];

const INITIAL_SERVICES: BaseService[] = [
  { name: "Integration Support", team: "Development" },
  { name: "Infrastructure Support", team: "Platform" },
  { name: "Cloud Operations", team: "Platform" },
  { name: "Application Support", team: "Development" },
  { name: "Bug Fixing", team: "Development" },
  { name: "Maintenance", team: "Development" },
  { name: "PMO Governance", team: "PMO" },
  { name: "Reporting", team: "PMO" },
];

// ─── Icons ────────────────────────────────────────────────────────────────────

const Icon = ({ name }: { name: string }) => {
  const icons: Record<string, JSX.Element> = {
    grid: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
    users: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2"/><path d="M16 3.13a4 4 0 010 7.75M21 21v-2a4 4 0 00-3-3.87"/></svg>,
    briefcase: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/></svg>,
    tool: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>,
    plus: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
    trash: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>,
    user: <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 20v-1a8 8 0 0116 0v1"/></svg>,
    check: <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>,
    lock: <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>,
    calendar: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/></svg>,
  };
  return icons[name] ?? null;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getAllocForWeek(a: Assignment, week: number): number {
  return a.periods
    .filter((p) => week >= p.startWeek && week <= p.endWeek)
    .reduce((sum, p) => sum + p.allocationPercent, 0);
}

function getTotalAllocForPerson(assignments: Assignment[], name: string, week: number): number {
  return assignments
    .filter((a) => a.name.toLowerCase() === name.toLowerCase())
    .reduce((sum, a) => sum + getAllocForWeek(a, week), 0);
}

function getVisibleAssignments(assignments: Assignment[], role: Role): Assignment[] {
  return assignments.filter((a) => role !== "Team Member" || a.confirmed);
}

function getPeople(assignments: Assignment[]): Assignment[] {
  const map = new Map<string, Assignment>();
  assignments.forEach((a) => {
    if (!map.has(a.name.toLowerCase())) map.set(a.name.toLowerCase(), a);
  });
  return Array.from(map.values());
}

function countryDot(country: string) {
  return country === "Sweden" ? "dot-se" : "dot-pl";
}

function allocClass(total: number) {
  if (total > 100) return "alloc-over";
  if (total === 100) return "alloc-full";
  if (total > 0) return "alloc-part";
  return "";
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [tab, setTab] = useState<Tab>("overview");
  const [role, setRole] = useState<Role>("Teamlead");
  const [userName, setUserName] = useState("Martina Vallgren");

  const [projects, setProjects] = useState<Project[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [baseServices, setBaseServices] = useState<BaseService[]>(INITIAL_SERVICES);

  // Add-planning form
  const [addType, setAddType] = useState<AssignmentType>("Project");
  const [aName, setAName] = useState("");
  const [aTeam, setATeam] = useState("Development");
  const [aCountry, setACountry] = useState("Sweden");
  const [aSkillset, setASkillset] = useState("");
  const [aLevel, setALevel] = useState("Junior");
  const [aProjId, setAProjId] = useState<number | "">("");
  const [aService, setAService] = useState("");
  const [aWorkName, setAWorkName] = useState("");
  const [aStart, setAStart] = useState(1);
  const [aEnd, setAEnd] = useState(4);
  const [aPct, setAPct] = useState(80);
  const [addMsg, setAddMsg] = useState<{ text: string; ok: boolean } | null>(null);

  // Add-project form
  const [showProjForm, setShowProjForm] = useState(false);
  const [projName, setProjName] = useState("");
  const [projPm, setProjPm] = useState("");

  // Add-service form
  const [svcName, setSvcName] = useState("");
  const [svcTeam, setSvcTeam] = useState("Development");

  const canEdit = role === "Teamlead" || role === "Manager";
  const visible = getVisibleAssignments(assignments, role);
  const people = getPeople(visible);

  // ── Assignment actions ────────────────────────────────────────────────────

  function addAssignment() {
    if (!aName.trim() || !aSkillset.trim()) {
      flash("Please fill in name and skillset.", false);
      return;
    }
    let workName = "";
    if (addType === "Project") {
      const proj = projects.find((p) => p.id === aProjId);
      if (!proj) { flash("Please select a project.", false); return; }
      workName = proj.name;
    } else if (addType === "Base Service") {
      if (!aService) { flash("Please select a base service.", false); return; }
      workName = aService;
    } else {
      if (!aWorkName.trim()) { flash("Please enter a work name.", false); return; }
      workName = aWorkName.trim();
    }

    const period: Period = { id: Date.now(), startWeek: aStart, endWeek: aEnd, allocationPercent: aPct };
    const existing = assignments.find(
      (a) =>
        a.name.toLowerCase() === aName.trim().toLowerCase() &&
        a.type === addType &&
        a.workName.toLowerCase() === workName.toLowerCase()
    );

    if (existing) {
      setAssignments(assignments.map((a) =>
        a.id === existing.id
          ? { ...a, periods: [...a.periods, period], confirmed: false, confirmedBy: null }
          : a
      ));
    } else {
      setAssignments([...assignments, {
        id: Date.now(),
        name: aName.trim(),
        team: aTeam,
        country: aCountry,
        skillset: aSkillset.trim(),
        level: aLevel,
        type: addType,
        workName,
        projectId: addType === "Project" ? Number(aProjId) : null,
        periods: [period],
        confirmed: false,
        confirmedBy: null,
      }]);
    }

    flash("Entry added!", true);
    setAName(""); setASkillset(""); setAProjId(""); setAService(""); setAWorkName("");
    setAStart(1); setAEnd(4); setAPct(80);
  }

  function confirmAssignment(id: number) {
    setAssignments(assignments.map((a) =>
      a.id === id ? { ...a, confirmed: true, confirmedBy: userName } : a
    ));
  }

  function deleteAssignment(id: number) {
    setAssignments(assignments.filter((a) => a.id !== id));
  }

  function deletePeriod(assignmentId: number, periodId: number) {
    setAssignments(assignments.map((a) =>
      a.id === assignmentId
        ? { ...a, periods: a.periods.filter((p) => p.id !== periodId), confirmed: false, confirmedBy: null }
        : a
    ));
  }

  // ── Project actions ───────────────────────────────────────────────────────

  function addProject() {
    if (!projName.trim()) return;
    setProjects([...projects, { id: Date.now(), name: projName.trim(), projectManager: projPm.trim() }]);
    setProjName(""); setProjPm(""); setShowProjForm(false);
  }

  function deleteProject(id: number) {
    setProjects(projects.filter((p) => p.id !== id));
  }

  // ── Service actions ───────────────────────────────────────────────────────

  function addService() {
    if (!svcName.trim()) return;
    setBaseServices([...baseServices, { name: svcName.trim(), team: svcTeam }]);
    setSvcName("");
  }

  function deleteService(name: string) {
    setBaseServices(baseServices.filter((s) => s.name !== name));
  }

  function flash(text: string, ok: boolean) {
    setAddMsg({ text, ok });
    setTimeout(() => setAddMsg(null), 3000);
  }

  // ─── Tab titles ───────────────────────────────────────────────────────────

  const TAB_TITLES: Record<Tab, string> = {
    overview: "Overview",
    assignments: "Assignments",
    projects: "Projects",
    services: "Base Services",
    add: "Add Planning",
  };

  // ─── Render: Overview ─────────────────────────────────────────────────────

  function renderOverview() {
    const overbooked = people.filter((p) =>
      WEEKS.some((w) => getTotalAllocForPerson(visible, p.name, w) > 100)
    ).length;
    const confirmedCount = assignments.filter((a) => a.confirmed).length;

    return (
      <>
        <div className="metric-grid">
          <div className="metric-card">
            <div className="metric-label">People</div>
            <div className="metric-value">{people.length}</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Assignments</div>
            <div className="metric-value">{assignments.length}</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Confirmed</div>
            <div className="metric-value green">{confirmedCount}</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Overbooked</div>
            <div className="metric-value red">{overbooked}</div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">
              <Icon name="calendar" />
              Total allocation per person
            </span>
            <span className="card-subtitle">Weeks 1–12 of 52</span>
          </div>
          {people.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">👥</div>
              No allocations yet. Add planning to get started.
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Person</th>
                    <th>Team</th>
                    <th>Country</th>
                    <th>Skill</th>
                    <th>Level</th>
                    {PREVIEW_WEEKS.map((w) => (
                      <th key={w} className="alloc-cell">W{w}</th>
                    ))}
                    <th>…</th>
                  </tr>
                </thead>
                <tbody>
                  {people.map((p) => (
                    <tr key={p.name}>
                      <td>
                        <span className={`person-dot ${countryDot(p.country)}`} />
                        <strong>
                          {role === "Project Manager" &&
                          visible.some((a) => a.name === p.name && !a.confirmed)
                            ? "Planned resource"
                            : p.name}
                        </strong>
                      </td>
                      <td>{p.team}</td>
                      <td>{p.country}</td>
                      <td>{p.skillset}</td>
                      <td>{p.level}</td>
                      {PREVIEW_WEEKS.map((w) => {
                        const total = getTotalAllocForPerson(visible, p.name, w);
                        return (
                          <td key={w} className={`alloc-cell ${allocClass(total)}`}>
                            {total > 0 ? `${total}%` : "–"}
                          </td>
                        );
                      })}
                      <td style={{ color: "#9ca3af", fontSize: 11 }}>W13–52</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </>
    );
  }

  // ─── Render: Assignments ──────────────────────────────────────────────────

  function renderAssignments() {
    return (
      <div className="card">
        <div className="card-header">
          <span className="card-title"><Icon name="users" /> All assignments</span>
          <span className="card-subtitle">Weeks 1–12 of 52 shown</span>
        </div>
        {visible.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            No assignments yet.
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Resource</th>
                  <th>Team</th>
                  <th>Type</th>
                  <th>Work</th>
                  {PREVIEW_WEEKS.map((w) => (
                    <th key={w} className="alloc-cell">W{w}</th>
                  ))}
                  <th>Status</th>
                  <th>Periods</th>
                  {canEdit && <th />}
                </tr>
              </thead>
              <tbody>
                {visible.map((a) => {
                  const displayName =
                    !a.confirmed && role === "Project Manager" ? "Planned resource" : a.name;
                  return (
                    <tr key={a.id}>
                      <td>
                        <strong>{displayName}</strong>
                        <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 1 }}>
                          {a.country} · {a.skillset} · {a.level}
                        </div>
                      </td>
                      <td>{a.team}</td>
                      <td><span className="badge badge-type">{a.type}</span></td>
                      <td>{a.workName}</td>
                      {PREVIEW_WEEKS.map((w) => {
                        const total = getAllocForWeek(a, w);
                        return (
                          <td key={w} className={`alloc-cell ${allocClass(total)}`}>
                            {total > 0 ? `${total}%` : "–"}
                          </td>
                        );
                      })}
                      <td>
                        <span className={a.confirmed ? "badge badge-confirmed" : "badge badge-planned"}>
                          {a.confirmed ? "Confirmed" : "Planned"}
                        </span>
                        {a.confirmed && (
                          <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 2 }}>
                            by {a.confirmedBy}
                          </div>
                        )}
                        {!a.confirmed && canEdit && (
                          <div style={{ marginTop: 4 }}>
                            <button className="btn btn-confirm btn-sm" onClick={() => confirmAssignment(a.id)}>
                              <Icon name="check" /> Confirm
                            </button>
                          </div>
                        )}
                      </td>
                      <td>
                        {a.periods.map((p) => (
                          <span key={p.id} className="period-tag">
                            W{p.startWeek}–{p.endWeek}: {p.allocationPercent}%
                            {canEdit && (
                              <span
                                className="period-remove"
                                onClick={() => deletePeriod(a.id, p.id)}
                                title="Remove period"
                              >
                                ✕
                              </span>
                            )}
                          </span>
                        ))}
                      </td>
                      {canEdit && (
                        <td>
                          <button className="btn btn-danger btn-sm" onClick={() => deleteAssignment(a.id)}>
                            <Icon name="trash" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  // ─── Render: Projects ─────────────────────────────────────────────────────

  function renderProjects() {
    return (
      <div className="card">
        <div className="card-header">
          <span className="card-title"><Icon name="briefcase" /> Projects</span>
          {canEdit && (
            <button className="btn btn-primary btn-sm" onClick={() => setShowProjForm((v) => !v)}>
              <Icon name="plus" /> New project
            </button>
          )}
        </div>
        <div className="card-body">
          {showProjForm && (
            <div className="inline-form">
              <div className="form-grid" style={{ gridTemplateColumns: "1fr 1fr auto", alignItems: "flex-end" }}>
                <div className="form-group">
                  <label className="form-label">Project name</label>
                  <input
                    className="form-input"
                    placeholder="e.g. Platform Renewal"
                    value={projName}
                    onChange={(e) => setProjName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addProject()}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Project manager</label>
                  <input
                    className="form-input"
                    placeholder="Name"
                    value={projPm}
                    onChange={(e) => setProjPm(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addProject()}
                  />
                </div>
                <button className="btn btn-primary" onClick={addProject}>Add</button>
              </div>
            </div>
          )}
          {projects.length === 0 ? (
            <div className="empty-state" style={{ padding: "24px 0" }}>
              <div className="empty-state-icon">💼</div>
              No projects yet.
            </div>
          ) : (
            projects.map((p) => (
              <div key={p.id} className="project-row">
                <div>
                  <div className="project-name">{p.name}</div>
                  <div className="project-pm">PM: {p.projectManager || "—"}</div>
                </div>
                {canEdit && (
                  <button className="btn btn-danger btn-sm" onClick={() => deleteProject(p.id)}>
                    <Icon name="trash" />
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  // ─── Render: Base Services ────────────────────────────────────────────────

  function renderServices() {
    return (
      <div className="card">
        <div className="card-header">
          <span className="card-title"><Icon name="tool" /> Base Services</span>
        </div>
        <div className="card-body">
          {canEdit && (
            <div className="inline-form">
              <div className="form-row" style={{ alignItems: "flex-end" }}>
                <div className="form-group">
                  <label className="form-label">Team</label>
                  <select className="form-select" value={svcTeam} onChange={(e) => setSvcTeam(e.target.value)} style={{ width: 140 }}>
                    {TEAMS.map((t) => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Service name</label>
                  <input
                    className="form-input"
                    placeholder="e.g. API Support"
                    value={svcName}
                    onChange={(e) => setSvcName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addService()}
                  />
                </div>
                <button className="btn btn-primary" onClick={addService}>
                  <Icon name="plus" /> Add
                </button>
              </div>
            </div>
          )}
          {TEAMS.map((team) => {
            const svcs = baseServices.filter((s) => s.team === team);
            return (
              <div key={team} className="service-team-group">
                <div className="service-team-label">{team}</div>
                {svcs.length === 0 ? (
                  <div style={{ fontSize: 12, color: "#9ca3af", paddingBottom: 6 }}>No services</div>
                ) : (
                  svcs.map((s) => (
                    <div key={s.name} className="service-row">
                      <span>{s.name}</span>
                      {canEdit && (
                        <button className="btn btn-danger btn-sm" onClick={() => deleteService(s.name)}>
                          <Icon name="trash" />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ─── Render: Add Planning ─────────────────────────────────────────────────

  function renderAdd() {
    if (!canEdit) {
      return (
        <div className="card">
          <div className="locked-state">
            <Icon name="lock" />
            <span>Only Teamlead and Manager can add planning.</span>
          </div>
        </div>
      );
    }

    const filteredServices = baseServices.filter((s) => s.team === aTeam);

    return (
      <div className="card">
        <div className="card-header">
          <span className="card-title"><Icon name="plus" /> New planning entry</span>
        </div>
        <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 24 }}>

          {/* Assignment type */}
          <div className="add-section">
            <div className="form-section-title">Assignment type</div>
            <div className="type-tabs">
              {TYPES.map((t) => (
                <div
                  key={t}
                  className={`type-tab${addType === t ? " active" : ""}`}
                  onClick={() => { setAddType(t); setAProjId(""); setAService(""); setAWorkName(""); }}
                >
                  {t}
                </div>
              ))}
            </div>
          </div>

          {/* Person details */}
          <div className="add-section">
            <div className="form-section-title">Person details</div>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Full name *</label>
                <input className="form-input" placeholder="Person's name" value={aName} onChange={(e) => setAName(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Team</label>
                <select className="form-select" value={aTeam} onChange={(e) => { setATeam(e.target.value); setAService(""); }}>
                  {TEAMS.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Country</label>
                <select className="form-select" value={aCountry} onChange={(e) => setACountry(e.target.value)}>
                  {COUNTRIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Skillset *</label>
                <input className="form-input" placeholder="e.g. React, DevOps" value={aSkillset} onChange={(e) => setASkillset(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Level</label>
                <select className="form-select" value={aLevel} onChange={(e) => setALevel(e.target.value)}>
                  {LEVELS.map((l) => <option key={l}>{l}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Assignment */}
          <div className="add-section">
            <div className="form-section-title">Assignment</div>
            {addType === "Project" && (
              <div className="form-group" style={{ maxWidth: 300 }}>
                <label className="form-label">Project *</label>
                <select className="form-select" value={aProjId} onChange={(e) => setAProjId(Number(e.target.value))}>
                  <option value="">Select project…</option>
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                {projects.length === 0 && (
                  <div className="form-hint">No projects yet — add one in the Projects tab.</div>
                )}
              </div>
            )}
            {addType === "Base Service" && (
              <div className="form-group" style={{ maxWidth: 300 }}>
                <label className="form-label">Base service *</label>
                <select className="form-select" value={aService} onChange={(e) => setAService(e.target.value)}>
                  <option value="">Select service…</option>
                  {filteredServices.map((s) => <option key={s.name}>{s.name}</option>)}
                </select>
              </div>
            )}
            {(addType === "Charge On" || addType === "Internal Initiative") && (
              <div className="form-group" style={{ maxWidth: 300 }}>
                <label className="form-label">Work name *</label>
                <input className="form-input" placeholder="Name of work item" value={aWorkName} onChange={(e) => setAWorkName(e.target.value)} />
              </div>
            )}
          </div>

          {/* Period & allocation */}
          <div className="add-section">
            <div className="form-section-title">Period &amp; allocation</div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">From week</label>
                <input className="form-input input-narrow" type="number" min={1} max={52} value={aStart} onChange={(e) => setAStart(Number(e.target.value))} />
              </div>
              <div style={{ color: "#9ca3af", paddingBottom: 8, fontSize: 18 }}>→</div>
              <div className="form-group">
                <label className="form-label">To week</label>
                <input className="form-input input-narrow" type="number" min={1} max={52} value={aEnd} onChange={(e) => setAEnd(Number(e.target.value))} />
              </div>
              <div className="form-group">
                <label className="form-label">Allocation</label>
                <div className="input-addon">
                  <input className="form-input input-narrow" type="number" min={0} max={200} value={aPct} onChange={(e) => setAPct(Number(e.target.value))} />
                  <span className="input-addon-label">%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Submit */}
          <div>
            <button className="btn btn-primary btn-block" onClick={addAssignment}>
              <Icon name="check" /> Add planning entry
            </button>
            {addMsg && (
              <div className={`add-msg ${addMsg.ok ? "success" : "error"}`}>
                {addMsg.text}
              </div>
            )}
          </div>

        </div>
      </div>
    );
  }

  // ─── Nav helper ───────────────────────────────────────────────────────────

  function navItem(id: Tab, iconName: string, label: string) {
    return (
      <div className={`nav-item${tab === id ? " active" : ""}`} onClick={() => setTab(id)}>
        <Icon name={iconName} />
        {label}
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="rp-app">
      {/* Sidebar */}
      <div className="sidebar">
        <div className="sidebar-logo">
          <span className="sidebar-logo-dot" />
          Resource Planner
        </div>
        <div className="sidebar-section-label">Views</div>
        {navItem("overview",     "grid",      "Overview")}
        {navItem("assignments",  "users",     "Assignments")}
        {navItem("projects",     "briefcase", "Projects")}
        {navItem("services",     "tool",      "Base Services")}
        <div className="sidebar-divider" />
        {navItem("add", "plus", "Add Planning")}
        <div className="sidebar-spacer" />
        <div className="sidebar-footer">
          {assignments.length} assignment{assignments.length !== 1 ? "s" : ""} · {projects.length} project{projects.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Main */}
      <div className="main">
        <div className="topbar">
          <span className="topbar-title">{TAB_TITLES[tab]}</span>
          <div className="topbar-right">
            <div className="role-pill">
              <Icon name="user" />
              <select value={role} onChange={(e) => setRole(e.target.value as Role)}>
                <option value="Teamlead">Teamlead</option>
                <option value="Project Manager">Project Manager</option>
                <option value="Team Member">Team Member</option>
                <option value="Manager">Manager</option>
              </select>
            </div>
            <input
              className="user-input"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="Your name"
            />
          </div>
        </div>

        <div className="content">
          {tab === "overview"    && renderOverview()}
          {tab === "assignments" && renderAssignments()}
          {tab === "projects"    && renderProjects()}
          {tab === "services"    && renderServices()}
          {tab === "add"         && renderAdd()}
        </div>
      </div>
    </div>
  );
}
 {/* 2 test */}
 
