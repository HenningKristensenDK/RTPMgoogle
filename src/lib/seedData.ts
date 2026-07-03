// Shared seed data definition, consumed by both the client-side first-run
// seeder (src/lib/seed.ts) and the standalone admin script (scripts/seed.ts).

export const SEED_PROJECT = {
  id: "datacenter-vejle-phase-1",
  name: "Viking Project",
  description:
    "Greenfield hyperscale data center build in Vejle, Denmark. Phase 1 covers civil works, MEP infrastructure and IT/data fit-out.",
};

export const WORKSTREAMS = [
  "Civil Works",
  "MEP Infrastructure",
  "IT/Data Infrastructure",
  "Quality",
  "HSE",
  "Permit and Authorities",
];

export interface SeedParty {
  name: string;
  organization: string;
  role: string;
}

export interface SeedRole {
  id: string;
  workstream: string;
  accountable: SeedParty;
  consulted: SeedParty[];
  responsibleCustomer: SeedParty | null;
  responsibleContractor: SeedParty | null;
  informedCustomer: SeedParty[];
  informedContractor: SeedParty[];
  description: string;
  interactionSummary: string;
}

const ACCOUNTABLE = { name: "Henning Kristensen", organization: "Customer PMO", role: "Project director" };

export const SEED_ROLES: SeedRole[] = [
  {
    id: "civil-works",
    workstream: "Civil Works",
    accountable: ACCOUNTABLE,
    consulted: [{ name: "Anna López", organization: "NT Advisor", role: "Structural advisor" }],
    responsibleCustomer: null,
    responsibleContractor: { name: "Jens Larsen", organization: "HD Contractor", role: "Site manager" },
    informedCustomer: [],
    informedContractor: [
      { name: "Peter Koch", organization: "HD Contractor", role: "MEP lead" },
      { name: "Bharat Khunti", organization: "HD Contractor", role: "QA/QC manager" },
    ],
    description: "Foundations, structural concrete and building envelope works.",
    interactionSummary: "Contractor executes the works, Customer's advisor inspects before pour.",
  },
  {
    id: "mep-infrastructure",
    workstream: "MEP Infrastructure",
    accountable: ACCOUNTABLE,
    consulted: [{ name: "Thomas Olsen", organization: "NT Advisor", role: "MEP advisor" }],
    responsibleCustomer: null,
    responsibleContractor: { name: "Peter Koch", organization: "HD Contractor", role: "MEP lead" },
    informedCustomer: [{ name: "Sindhu K", organization: "Customer PMO", role: "PMO lead" }],
    informedContractor: [{ name: "Rasmus Iversen", organization: "EQ Supplier", role: "Account manager" }],
    description: "Electrical, mechanical and utility infrastructure.",
    interactionSummary: "Contractor installs equipment, Customer's advisor witnesses factory acceptance tests.",
  },
  {
    id: "it-data-infrastructure",
    workstream: "IT/Data Infrastructure",
    accountable: ACCOUNTABLE,
    consulted: [{ name: "Anna López", organization: "NT Advisor", role: "Structural advisor" }],
    responsibleCustomer: { name: "Sindhu K", organization: "Customer PMO", role: "PMO lead" },
    responsibleContractor: { name: "Ming Zhang", organization: "FO Sub-Contractor", role: "IT infrastructure lead" },
    informedCustomer: [],
    informedContractor: [
      { name: "Jens Larsen", organization: "HD Contractor", role: "Site manager" },
      { name: "Peter Koch", organization: "HD Contractor", role: "MEP lead" },
      { name: "Bharat Khunti", organization: "HD Contractor", role: "QA/QC manager" },
      { name: "Rasmus Iversen", organization: "EQ Supplier", role: "Account manager" },
    ],
    description: "IT fit-out, data hall racking and liquid cooling.",
    interactionSummary: "Sub-contractor fits out racks and cooling, main contractor coordinates site access.",
  },
  {
    id: "quality",
    workstream: "Quality",
    accountable: ACCOUNTABLE,
    consulted: [{ name: "Thomas Olsen", organization: "NT Advisor", role: "MEP advisor" }],
    responsibleCustomer: null,
    responsibleContractor: { name: "Bharat Khunti", organization: "HD Contractor", role: "QA/QC manager" },
    informedCustomer: [{ name: "Sindhu K", organization: "Customer PMO", role: "PMO lead" }],
    informedContractor: [],
    description: "Quality assurance, inspection and NCR management.",
    interactionSummary: "Contractor's QA/QC manager closes non-conformances, Customer's advisor reviews evidence before sign-off.",
  },
  {
    id: "hse",
    workstream: "HSE",
    accountable: ACCOUNTABLE,
    consulted: [{ name: "Thomas Olsen", organization: "NT Advisor", role: "HSE advisor" }],
    responsibleCustomer: { name: "Sindhu K", organization: "Customer PMO", role: "PMO lead" },
    responsibleContractor: { name: "Jens Lorenzen", organization: "HD Contractor", role: "HSE coordinator" },
    informedCustomer: [],
    informedContractor: [],
    description: "Health, safety and environmental compliance.",
    interactionSummary: "Contractor's HSE coordinator manages daily compliance, Customer's advisor audits monthly.",
  },
  {
    id: "permit-and-authorities",
    workstream: "Permit and Authorities",
    accountable: ACCOUNTABLE,
    consulted: [{ name: "Rohan Sameer", organization: "NT Advisor", role: "Permitting advisor" }],
    responsibleCustomer: { name: "Sindhu K", organization: "Customer PMO", role: "PMO lead" },
    responsibleContractor: null,
    informedCustomer: [],
    informedContractor: [{ name: "Ming Zhang", organization: "FO Sub-Contractor", role: "IT infrastructure lead" }],
    description: "Building permits, grid connection approvals and regulatory compliance.",
    interactionSummary: "Customer's PMO lead manages authority submissions, advisor supports technical justification.",
  },
];

export interface SeedOrganization {
  orgId: string;
  name: string;
  tier: number;
  parentOrgId: string | null;
  roleType: string;
}

export const SEED_ORGANIZATIONS: SeedOrganization[] = [
  { orgId: "customer", name: "Customer PMO", tier: 0, parentOrgId: null, roleType: "Home organization" },
  { orgId: "wsp-denmark", name: "NT Advisor", tier: 0, parentOrgId: "customer", roleType: "Advisor" },
  { orgId: "mt-hojgaard", name: "HD Contractor", tier: 1, parentOrgId: "customer", roleType: "Main contractor" },
  { orgId: "nordic-fitout", name: "FO Sub-Contractor", tier: 2, parentOrgId: "mt-hojgaard", roleType: "Sub-contractor" },
  { orgId: "eq-supplier", name: "EQ Supplier", tier: 3, parentOrgId: "mt-hojgaard", roleType: "Vendor" },
];

export interface SeedRisk {
  riskId: string;
  title: string;
  status: "identified" | "assessed" | "mitigated" | "resolved";
  priority: "low" | "medium" | "high" | "critical";
  recurrence: "none" | "daily" | "weekly" | "monthly";
  workstreamIds: string[];
  notes: string;
  checklist: { id: string; text: string; completed: boolean }[];
  dueOffsetDays: number;
}

export const SEED_RISKS: SeedRisk[] = [
  {
    riskId: "RK-001",
    title: "Groundwater ingress in foundation excavation",
    status: "assessed",
    priority: "high",
    recurrence: "weekly",
    workstreamIds: ["civil-works"],
    notes: "High water table observed during trial pits in the north-east plot. Risk of flooding the foundation excavation and delaying the concrete pour.",
    checklist: [
      { id: "c1", text: "Commission geotechnical survey", completed: true },
      { id: "c2", text: "Design dewatering plan", completed: false },
      { id: "c3", text: "Procure well-point pumps", completed: false },
    ],
    dueOffsetDays: 14,
  },
  {
    riskId: "RK-002",
    title: "Grid connection capacity not confirmed for Phase 1 load",
    status: "identified",
    priority: "critical",
    recurrence: "none",
    workstreamIds: ["mep-infrastructure", "it-data-infrastructure"],
    notes: "Energinet has not confirmed the 60kV grid connection capacity required for Phase 1 IT load. Could block energisation milestone.",
    checklist: [
      { id: "c1", text: "Submit grid capacity request to Energinet", completed: true },
      { id: "c2", text: "Confirm transformer lead times", completed: false },
    ],
    dueOffsetDays: 30,
  },
  {
    riskId: "RK-003",
    title: "Structural cement supplier delivery delay",
    status: "mitigated",
    priority: "medium",
    recurrence: "monthly",
    workstreamIds: ["civil-works"],
    notes: "Primary cement supplier flagged a 3-week delay. Secondary supplier engaged as backup to protect the slab pour schedule.",
    checklist: [
      { id: "c1", text: "Qualify secondary supplier", completed: true },
      { id: "c2", text: "Update procurement schedule", completed: true },
      { id: "c3", text: "Confirm buffer stock on site", completed: false },
    ],
    dueOffsetDays: 7,
  },
  {
    riskId: "RK-004",
    title: "HV Transformer delivery � 110 week lead time",
    status: "assessed",
    priority: "critical",
    recurrence: "weekly",
    workstreamIds: ["mep-infrastructure", "it-data-infrastructure"],
    notes: "Main 60MVA power transformer lead time extended to 110 weeks. Current forecast delivery is 6 weeks behind Baseline ROS Date. Energisation milestone at risk.",
    checklist: [
      { id: "c1", text: "Issue PO within 60 days of NTP", completed: true },
      { id: "c2", text: "Expedite vendor manufacturing progress", completed: false },
      { id: "c3", text: "Evaluate temporary transformer rental", completed: false },
    ],
    dueOffsetDays: 21,
  },
  {
    riskId: "RK-005",
    title: "MV Switchgear FAT failure � NCR raised",
    status: "mitigated",
    priority: "high",
    recurrence: "weekly",
    workstreamIds: ["mep-infrastructure"],
    notes: "Protection relay injection test failed on first witness. NCR raised. Cure period active � 18 days remaining before contractor installation window opens.",
    checklist: [
      { id: "c1", text: "NCR resolution plan accepted by vendor", completed: true },
      { id: "c2", text: "Re-test scheduled with QM witness", completed: false },
      { id: "c3", text: "Level 1 green tag sign-off pending", completed: false },
    ],
    dueOffsetDays: 18,
  },
  {
    riskId: "RK-006",
    title: "Energinet grid connection maturation phase delay",
    status: "identified",
    priority: "critical",
    recurrence: "none",
    workstreamIds: ["mep-infrastructure", "it-data-infrastructure"],
    notes: "Energinet maturation phase approval running 8 weeks behind programme. Hard constraint on utility energisation milestone. Zero float available.",
    checklist: [
      { id: "c1", text: "Escalate to Energinet senior liaison", completed: false },
      { id: "c2", text: "Submit supplementary project maturity documentation", completed: false },
    ],
    dueOffsetDays: 10,
  },
  {
    riskId: "RK-007",
    title: "MEP / OFCI interface scope gap � HV cable termination",
    status: "identified",
    priority: "medium",
    recurrence: "none",
    workstreamIds: ["civil-works", "mep-infrastructure"],
    notes: "Scope boundary dispute between MEP contractor and OFCI installation team on HV cable termination. Neither party has accepted responsibility. Level 3 pre-commissioning at risk.",
    checklist: [
      { id: "c1", text: "Issue Interface Control Document", completed: false },
      { id: "c2", text: "Chair joint scope resolution meeting", completed: false },
    ],
    dueOffsetDays: 20,
  },
  {
    riskId: "RK-008",
    title: "Generator set delivery � port congestion Hamburg",
    status: "assessed",
    priority: "medium",
    recurrence: "weekly",
    workstreamIds: ["mep-infrastructure"],
    notes: "2.5MW diesel generator vessel delayed at Hamburg due to port congestion. Oversize transport permit for onward road delivery not yet approved by Vejdirektoratet.",
    checklist: [
      { id: "c1", text: "Expedite permit application", completed: false },
      { id: "c2", text: "Evaluate alternative route via Fredericia port", completed: false },
    ],
    dueOffsetDays: 25,
  },
  {
    riskId: "RK-009",
    title: "Level 4 commissioning sequence conflict � UPS delay",
    status: "resolved",
    priority: "high",
    recurrence: "none",
    workstreamIds: ["mep-infrastructure", "it-data-infrastructure"],
    notes: "UPS installation was 3 weeks behind schedule. Level 4 integrated systems test could not commence without full UPS energisation. CxA confirmed zero residual impact after recovery plan executed.",
    checklist: [
      { id: "c1", text: "Recovery plan approved", completed: true },
      { id: "c2", text: "CxA Level 4 sign-off complete", completed: true },
    ],
    dueOffsetDays: 0,
  },
  {
    riskId: "RK-010",
    title: "Piling contractor resource shortage",
    status: "identified",
    priority: "high",
    recurrence: "weekly",
    workstreamIds: ["civil-works"],
    notes: "Main piling contractor reports 40% crew shortage due to competing projects in the region. Risk to foundation programme of 4-6 weeks.",
    checklist: [
      { id: "c1", text: "Request resource recovery plan from contractor", completed: false },
      { id: "c2", text: "Identify alternative piling subcontractor", completed: false },
    ],
    dueOffsetDays: 15,
  },
  {
    riskId: "RK-011",
    title: "Building permit amendment required � data hall height increase",
    status: "assessed",
    priority: "high",
    recurrence: "none",
    workstreamIds: ["civil-works", "it-data-infrastructure"],
    notes: "Design change increases data hall clear height by 800mm. Building permit amendment required from Vejle Kommune. Estimated 8-12 week processing time.",
    checklist: [
      { id: "c1", text: "Submit permit amendment application", completed: true },
      { id: "c2", text: "Confirm no work stoppage required during review", completed: false },
    ],
    dueOffsetDays: 60,
  },
  {
    riskId: "RK-012",
    title: "Chilled water plant delivery delay � custom manifolds",
    status: "identified",
    priority: "high",
    recurrence: "weekly",
    workstreamIds: ["mep-infrastructure"],
    notes: "Custom chilled water distribution manifolds have 48-week lead time. Current schedule assumes 35 weeks. Risk of 13-week delay to Level 3 mechanical commissioning.",
    checklist: [
      { id: "c1", text: "Review design for standard component substitution", completed: false },
      { id: "c2", text: "Explore alternative vendor", completed: false },
    ],
    dueOffsetDays: 35,
  },
  {
    riskId: "RK-013",
    title: "IT infrastructure scope change � liquid cooling upgrade",
    status: "assessed",
    priority: "medium",
    recurrence: "none",
    workstreamIds: ["mep-infrastructure", "it-data-infrastructure"],
    notes: "Client has requested upgrade from air-cooled to rear-door liquid cooling for AI rack rows. Structural and MEP impact assessment required. NEC4 compensation event likely.",
    checklist: [
      { id: "c1", text: "Issue Early Warning notice", completed: true },
      { id: "c2", text: "Prepare compensation event quotation", completed: false },
      { id: "c3", text: "Structural impact assessment", completed: false },
    ],
    dueOffsetDays: 28,
  },
  {
    riskId: "RK-014",
    title: "Fire suppression system design approval delayed",
    status: "identified",
    priority: "medium",
    recurrence: "none",
    workstreamIds: ["civil-works", "mep-infrastructure"],
    notes: "Beredskabsstyrelsen (Danish Emergency Management Agency) reviewing the inert gas suppression system design. Approval required before installation can commence.",
    checklist: [
      { id: "c1", text: "Submit design for regulatory review", completed: true },
      { id: "c2", text: "Prepare response to technical queries", completed: false },
    ],
    dueOffsetDays: 45,
  },
  {
    riskId: "RK-015",
    title: "Crane access route � weight restriction on local road",
    status: "mitigated",
    priority: "low",
    recurrence: "none",
    workstreamIds: ["civil-works"],
    notes: "Heavy lift crane transport route crosses a municipal road with 40-tonne weight limit. Special transport permit obtained. Reinforcement of road surface agreed with Vejle Kommune.",
    checklist: [
      { id: "c1", text: "Special transport permit obtained", completed: true },
      { id: "c2", text: "Road reinforcement works complete", completed: true },
    ],
    dueOffsetDays: 5,
  },
  {
    riskId: "RK-016",
    title: "BMS integration scope � contractor interface not defined",
    status: "identified",
    priority: "high",
    recurrence: "weekly",
    workstreamIds: ["mep-infrastructure", "it-data-infrastructure"],
    notes: "BMS/EPMS integration scope boundary between MEP contractor and IT infrastructure team not formally defined. Risk of duplicate or missing scope at Level 4 commissioning.",
    checklist: [
      { id: "c1", text: "Issue BMS Interface Control Document", completed: false },
      { id: "c2", text: "Joint scope alignment workshop", completed: false },
    ],
    dueOffsetDays: 22,
  },
  {
    riskId: "RK-017",
    title: "Concrete pour quality � cold weather risk",
    status: "mitigated",
    priority: "medium",
    recurrence: "none",
    workstreamIds: ["civil-works"],
    notes: "Foundation slab pour scheduled for January. Risk of concrete quality issues if temperature drops below -5�C. Cold weather concreting plan prepared and approved.",
    checklist: [
      { id: "c1", text: "Cold weather concreting plan approved", completed: true },
      { id: "c2", text: "Heated enclosure procurement confirmed", completed: true },
      { id: "c3", text: "Temperature monitoring protocol in place", completed: true },
    ],
    dueOffsetDays: 3,
  },
  {
    riskId: "RK-018",
    title: "Substation land title � boundary dispute with adjacent owner",
    status: "assessed",
    priority: "high",
    recurrence: "none",
    workstreamIds: ["it-data-infrastructure"],
    notes: "Legal dispute with adjacent landowner over 12m strip required for substation access road. Title transfer blocked pending court mediation.",
    checklist: [
      { id: "c1", text: "Legal counsel appointed", completed: true },
      { id: "c2", text: "Mediation session scheduled", completed: false },
      { id: "c3", text: "Alternative access route assessed", completed: false },
    ],
    dueOffsetDays: 40,
  },
  {
    riskId: "RK-019",
    title: "EIA environmental monitoring � protected species survey",
    status: "resolved",
    priority: "medium",
    recurrence: "none",
    workstreamIds: ["civil-works", "it-data-infrastructure"],
    notes: "Environmental Impact Assessment required protected species survey before ground clearance. Survey completed � no protected species found. Clearance to proceed issued.",
    checklist: [
      { id: "c1", text: "Protected species survey completed", completed: true },
      { id: "c2", text: "Environmental clearance issued", completed: true },
    ],
    dueOffsetDays: 0,
  },
  {
    riskId: "RK-020",
    title: "Workforce HSE � contractor safety culture audit failed",
    status: "assessed",
    priority: "high",
    recurrence: "weekly",
    workstreamIds: ["civil-works", "mep-infrastructure"],
    notes: "Independent HSE audit identified 7 critical non-conformances with the main contractor safety management system. Stop-work authority exercised on 2 work fronts.",
    checklist: [
      { id: "c1", text: "Corrective action plan submitted by contractor", completed: true },
      { id: "c2", text: "Re-audit scheduled in 4 weeks", completed: false },
      { id: "c3", text: "Safety stand-down completed", completed: true },
    ],
    dueOffsetDays: 28,
  },
];
