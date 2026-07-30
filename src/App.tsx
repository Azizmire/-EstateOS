import { FormEvent, ReactNode, useEffect, useMemo, useState } from 'react';
import {
  BarChart3, Bell, Building2, CalendarRange, Check, ChevronRight, CircleDollarSign,
  ClipboardList, FileUp, Home, KeyRound, LogOut, Menu, Moon, Plus, Search, ShieldCheck,
  Sun, Upload, Users, Wrench, X,
} from 'lucide-react';
import { ApiError, loadWorkspace, login, logout, request, type Role, type Session, uploadFile } from './api';
import {
  type LeaseRecord, type PaymentRecord, type PropertyRecord,
  type TenantRecord, type Workspace, type WorkOrder,
} from './models';

type View = 'overview' | 'properties' | 'tenants' | 'leases' | 'maintenance' | 'financials' | 'reports' | 'files' | 'admin';
type ActionType = 'maintenance' | 'property' | 'tenant' | 'lease' | 'payment' | null;
type NavItem = { id: View; label: string; icon: ReactNode; roles: Role[] };

const nav: NavItem[] = [
  { id: 'overview', label: 'Overview', icon: <Home size={18}/>, roles: ['ADMIN','MANAGER','MAINTENANCE','TENANT','OWNER'] },
  { id: 'properties', label: 'Properties', icon: <Building2 size={18}/>, roles: ['ADMIN','MANAGER','OWNER'] },
  { id: 'tenants', label: 'Residents', icon: <Users size={18}/>, roles: ['ADMIN','MANAGER'] },
  { id: 'leases', label: 'Leases', icon: <CalendarRange size={18}/>, roles: ['ADMIN','MANAGER','TENANT'] },
  { id: 'maintenance', label: 'Maintenance', icon: <Wrench size={18}/>, roles: ['ADMIN','MANAGER','MAINTENANCE','TENANT','OWNER'] },
  { id: 'financials', label: 'Financials', icon: <CircleDollarSign size={18}/>, roles: ['ADMIN','MANAGER','TENANT','OWNER'] },
  { id: 'reports', label: 'Reports', icon: <BarChart3 size={18}/>, roles: ['ADMIN','MANAGER','OWNER'] },
  { id: 'files', label: 'Files', icon: <FileUp size={18}/>, roles: ['ADMIN','MANAGER','MAINTENANCE','TENANT'] },
  { id: 'admin', label: 'Administration', icon: <ShieldCheck size={18}/>, roles: ['ADMIN'] },
];

const money = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
const initials = (name: string) => name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();
const emptyWorkspace: Workspace = { properties: [], tenants: [], leases: [], maintenance: [], payments: [], notifications: [] };

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  if (!session) return <SignIn onSession={setSession}/>;
  return <WorkspaceApp session={session} onSignOut={() => { void logout(session); setSession(null); }}/>;
}

function SignIn({ onSession }: { onSession: (session: Session) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true); setError('');
    try { onSession(await login(email, password)); }
    catch (reason) { setError(reason instanceof ApiError ? reason.message : 'The EstateOS API is not available.'); }
    finally { setBusy(false); }
  };
  return <main className="signin-shell">
    <section className="signin-story">
      <div className="signin-brand"><span><Building2 size={24}/></span>EstateOS</div>
      <div className="signin-copy">
        <p className="eyebrow light">Property operations, unified</p>
        <h1>Run every property from one calm, capable workspace.</h1>
        <p>Leasing, residents, collections, maintenance, documents, and owner performance—without the spreadsheet sprawl.</p>
      </div>
      <div className="signin-proof">
        <div><strong>Unified</strong><span>portfolio operations</span></div>
        <div><strong>Scoped</strong><span>role-based access</span></div>
        <div><strong>Audited</strong><span>business activity</span></div>
      </div>
    </section>
    <section className="signin-panel">
      <form onSubmit={submit} className="signin-form">
        <div className="signin-mark"><KeyRound size={22}/></div>
        <p className="eyebrow">Secure workspace</p>
        <h2>Welcome back</h2>
        <p className="muted">Sign in to your EstateOS account.</p>
        <label>Email address<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" required autoComplete="email"/></label>
        <label>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Your password" required autoComplete="current-password"/></label>
        {error && <div className="form-error">{error}</div>}
        <button className="primary full" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        <small className="secure-note"><ShieldCheck size={14}/> Role-based access · audited activity · encrypted passwords</small>
      </form>
    </section>
  </main>;
}

function WorkspaceApp({ session, onSignOut }: { session: Session; onSignOut: () => void }) {
  const role = session.user.role;
  const allowedNav = nav.filter((item) => item.roles.includes(role));
  const [view, setView] = useState<View>('overview');
  const [data, setData] = useState<Workspace>(() => structuredClone(emptyWorkspace));
  const [loading, setLoading] = useState(true);
  const [syncError, setSyncError] = useState('');
  const [dark, setDark] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [action, setAction] = useState<ActionType>(null);
  const [toast, setToast] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    loadWorkspace(session)
      .then((payload) => {
        if (active) setData(normalizeWorkspace(payload, session.user.role));
      })
      .catch((reason) => {
        if (active) setSyncError(reason instanceof Error ? reason.message : 'Workspace data could not be loaded.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [session]);

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2600);
  };
  const primaryAction: Exclude<ActionType, null> =
    role === 'TENANT' || role === 'MAINTENANCE' ? 'maintenance'
      : view === 'leases' ? 'lease'
        : view === 'tenants' ? 'tenant'
          : view === 'financials' ? 'payment'
            : 'property';
  const selectView = (next: View) => { setView(next); setMobileOpen(false); setSearch(''); };
  const visibleMaintenance = useMemo(() => {
    let rows = data.maintenance;
    if (role === 'TENANT') rows = rows.filter((item) => item.tenant === session.user.name);
    if (role === 'MAINTENANCE') rows = rows.filter((item) => item.technician === session.user.name || item.status === 'NEW');
    const query = search.toLowerCase();
    return rows.filter((item) => Object.values(item).join(' ').toLowerCase().includes(query));
  }, [data.maintenance, role, search, session.user.name]);
  const advanceOrder = async (id: string) => {
    const order = data.maintenance.find((item) => item.id === id);
    if (!order) return;
    const transitions: Partial<Record<WorkOrder['status'], WorkOrder['status']>> = { NEW: 'ASSIGNED', ASSIGNED: 'IN_PROGRESS', IN_PROGRESS: 'COMPLETED', WAITING_PARTS: 'IN_PROGRESS' };
    const nextStatus = transitions[order.status];
    if (!nextStatus) return;
    await request(`/maintenance/${id}/updates`, { method: 'POST', body: JSON.stringify({ message: `Status advanced to ${nextStatus}`, status: nextStatus }) }, session.token);
    setData((current) => ({ ...current, maintenance: current.maintenance.map((item) => item.id === id ? { ...item, status: nextStatus } : item) }));
    notify(`Request moved to ${nextStatus.toLowerCase().replaceAll('_', ' ')}`);
  };

  return <div className={dark ? 'app dark' : 'app'}>
    <aside className={mobileOpen ? 'sidebar open' : 'sidebar'}>
      <div className="brand"><div className="logo"><Building2 size={20}/></div><div><strong>EstateOS</strong><span>Property operations</span></div><button className="icon mobile-close" onClick={() => setMobileOpen(false)} aria-label="Close menu"><X size={19}/></button></div>
      <nav>{allowedNav.map((item) => <button key={item.id} className={view === item.id ? 'nav-item active' : 'nav-item'} onClick={() => selectView(item.id)}>{item.icon}<span>{item.label}</span></button>)}</nav>
      <div className="sidebar-footer">
        <button className="nav-item" onClick={onSignOut}><LogOut size={18}/><span>Sign out</span></button>
        <div className="user"><div className="avatar">{initials(session.user.name)}</div><div><strong>{session.user.name}</strong><span>{role.toLowerCase().replace('_', ' ')}</span></div></div>
      </div>
    </aside>
    <main className="workspace-main">
      <header className="topbar">
        <button className="icon menu" onClick={() => setMobileOpen(true)} aria-label="Open menu"><Menu size={20}/></button>
        <div><p className="eyebrow">{role === 'TENANT' ? 'Resident portal' : role === 'OWNER' ? 'Owner portal' : 'Portfolio workspace'}</p><h1>{allowedNav.find((item) => item.id === view)?.label || 'Overview'}</h1></div>
        <div className="top-actions">
          <div className="search"><Search size={17}/><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search this view" aria-label="Search"/></div>
          <button className="icon notification-button" onClick={() => setNotificationsOpen(true)} aria-label="Notifications"><Bell size={18}/>{data.notifications.some((note) => !note.read) && <span/>}</button>
          <button className="icon" onClick={() => setDark((value) => !value)} aria-label="Toggle theme">{dark ? <Sun size={18}/> : <Moon size={18}/>}</button>
          {role !== 'OWNER' && <button className="primary" onClick={() => setAction(primaryAction)}><Plus size={17}/><span>{role === 'TENANT' ? 'Request service' : 'Add new'}</span></button>}
        </div>
      </header>
      <section className="page">
        {syncError && <div className="sync-error"><strong>Connection issue</strong><span>{syncError}</span><button onClick={onSignOut}>Return to sign in</button></div>}
        {loading && <div className="loading-state"><span/><span/><span/><p>Loading your EstateOS workspace…</p></div>}
        {!loading && <>
        {view === 'overview' && <Overview session={session} data={data} orders={visibleMaintenance} onView={selectView} onAdvance={advanceOrder}/>}
        {view === 'properties' && <Properties data={data} search={search} onAdd={() => setAction('property')}/>}
        {view === 'tenants' && <Tenants data={data} search={search} onAdd={() => setAction('tenant')}/>}
        {view === 'leases' && <Leases session={session} data={data} setData={setData} notify={notify} onAdd={() => setAction('lease')}/>}
        {view === 'maintenance' && <Maintenance orders={visibleMaintenance} onAdvance={advanceOrder} onAdd={() => setAction('maintenance')}/>}
        {view === 'financials' && <Financials role={role} data={data} onAdd={() => setAction('payment')}/>}
        {view === 'reports' && <Reports data={data}/>}
        {view === 'files' && <Files session={session} data={data} notify={notify}/>}
        {view === 'admin' && <Administration session={session} data={data} notify={notify}/>}
        </>}
      </section>
    </main>
    {action && <QuickCreate type={action} session={session} data={data} setData={setData} onClose={() => setAction(null)} notify={notify}/>}
    {notificationsOpen && <NotificationDrawer data={data} setData={setData} onClose={() => setNotificationsOpen(false)}/>}
    {toast && <div className="toast"><Check size={17}/>{toast}</div>}
  </div>;
}

function normalizeWorkspace(payload: unknown, role: Role): Workspace {
  const raw = payload as any;
  if (role === 'TENANT') {
    const tenant = raw.tenant;
    if (!tenant) return structuredClone(emptyWorkspace);
    const name = `${tenant.firstName} ${tenant.lastName}`;
    const leases: LeaseRecord[] = (tenant.leases || []).map((link: any) => ({
      id: link.lease.id, tenantId: tenant.id, unitId: link.lease.unit.id,
      tenant: name, property: link.lease.unit.property.name,
      unit: link.lease.unit.number, rent: Number(link.lease.monthlyRent),
      startDate: String(link.lease.startDate).slice(0, 10),
      endDate: String(link.lease.endDate).slice(0, 10), status: link.lease.status,
    }));
    return {
      properties: [...new Map(leases.map((lease) => [lease.property, {
        id: lease.property, name: lease.property, address: '', city: '', units: 1,
        occupied: 1, monthlyRent: lease.rent, openMaintenance: 0,
      }])).values()],
      tenants: [{ id: tenant.id, name, email: tenant.email, phone: tenant.phone || '', property: leases[0]?.property || '', unit: leases[0]?.unit || '', status: 'CURRENT' }],
      leases,
      maintenance: (tenant.maintenance || []).map((item: any) => ({
        id: item.id, title: item.title, property: item.property.name,
        unit: item.unit?.number || 'Common area', tenant: name, priority: item.priority,
        status: item.status, createdAt: new Date(item.createdAt).toLocaleDateString(),
      })),
      payments: (tenant.payments || []).map((item: any) => ({
        id: item.id, tenant: name,
        property: leases.find((lease) => lease.id === item.leaseId)?.property || '',
        amount: Number(item.amount), dueDate: String(item.dueDate).slice(0, 10), status: item.status,
      })),
      notifications: [],
    };
  }
  if (role === 'OWNER') {
    const properties: PropertyRecord[] = (raw.properties || []).map((item: any) => ({
      id: item.id, name: item.name, address: item.address1, city: `${item.city}, ${item.state}`,
      units: item.units.length, occupied: item.performance.occupiedUnits,
      monthlyRent: item.units.reduce((sum: number, unit: any) => sum + Number(unit.marketRent), 0),
      openMaintenance: item.performance.openMaintenance,
    }));
    return {
      ...structuredClone(emptyWorkspace), properties,
      maintenance: (raw.properties || []).flatMap((property: any) =>
        property.maintenance.map((item: any) => ({
          id: item.id, title: item.title, property: property.name, unit: '—',
          tenant: 'Resident', priority: item.priority, status: item.status,
          createdAt: new Date(item.createdAt).toLocaleDateString(),
        }))),
      summary: (raw.properties || []).reduce((totals: NonNullable<Workspace['summary']>, item: any) => ({
        revenue: totals.revenue + Number(item.performance?.revenue || 0),
        expenses: totals.expenses + Number(item.performance?.expenses || 0),
        netOperatingIncome: totals.netOperatingIncome + Number(item.performance?.netOperatingIncome || 0),
      }), { revenue: 0, expenses: 0, netOperatingIncome: 0 }),
    };
  }
  if (role === 'MAINTENANCE') {
    return {
      ...structuredClone(emptyWorkspace),
      maintenance: (raw.maintenance?.requests || []).map(normalizeMaintenance),
      notifications: normalizeNotifications(raw.notifications?.notifications || []),
    };
  }
  const propertyRows = raw.properties?.properties || [];
  const tenantRows = raw.tenants?.tenants || [];
  const leaseRows = raw.leases?.leases || [];
  return {
    properties: propertyRows.map((item: any) => ({
      id: item.id, name: item.name, address: item.address1, city: `${item.city}, ${item.state}`,
      units: item.units.length,
      occupied: item.units.filter((unit: any) => unit.status === 'OCCUPIED').length,
      monthlyRent: item.units.reduce((sum: number, unit: any) => sum + Number(unit.marketRent), 0),
      openMaintenance: item._count?.maintenance || 0,
      unitOptions: item.units.map((unit: any) => ({ id: unit.id, number: unit.number, status: unit.status })),
    })),
    tenants: tenantRows.map((item: any) => {
      const current = item.leases?.find((link: any) => ['ACTIVE','EXPIRING'].includes(link.lease.status))?.lease;
      return { id: item.id, name: `${item.firstName} ${item.lastName}`, email: item.email, phone: item.phone || '', property: current?.unit.property.name || 'Unassigned', unit: current?.unit.number || '—', status: current ? 'CURRENT' : 'INACTIVE' };
    }),
    leases: leaseRows.map((item: any) => {
      const primary = item.tenants?.find((link: any) => link.primary)?.tenant;
      return { id: item.id, tenantId: primary?.id, unitId: item.unit.id, tenant: primary ? `${primary.firstName} ${primary.lastName}` : 'Resident', property: item.unit.property.name, unit: item.unit.number, rent: Number(item.monthlyRent), startDate: String(item.startDate).slice(0, 10), endDate: String(item.endDate).slice(0, 10), status: item.status };
    }),
    maintenance: (raw.maintenance?.requests || []).map(normalizeMaintenance),
    payments: (raw.payments?.payments || []).map((item: any) => ({
      id: item.id, tenant: `${item.tenant.firstName} ${item.tenant.lastName}`,
      property: item.lease.unit.property.name, amount: Number(item.amount),
      dueDate: String(item.dueDate).slice(0, 10), status: item.status,
    })),
    notifications: normalizeNotifications(raw.notifications?.notifications || []),
  };
}

function normalizeMaintenance(item: any): WorkOrder {
  return {
    id: item.id, title: item.title, property: item.property.name,
    unit: item.unit?.number || 'Common area',
    tenant: item.tenant ? `${item.tenant.firstName} ${item.tenant.lastName}` : 'Common area',
    priority: item.priority, status: item.status, technician: item.assignedTechnician?.name,
    createdAt: new Date(item.createdAt).toLocaleDateString(),
  };
}

function normalizeNotifications(items: any[]) {
  return items.map((item) => ({
    id: item.id, title: item.title, message: item.message, read: Boolean(item.readAt),
    createdAt: new Date(item.createdAt).toLocaleString(),
  }));
}

function Overview({ session, data, orders, onView, onAdvance }: { session: Session; data: Workspace; orders: WorkOrder[]; onView: (view: View) => void; onAdvance: (id: string) => void }) {
  const role = session.user.role;
  const rent = data.properties.reduce((sum, item) => sum + item.monthlyRent, 0);
  const totalUnits = data.properties.reduce((sum, item) => sum + item.units, 0);
  const occupied = data.properties.reduce((sum, item) => sum + item.occupied, 0);
  const occupancy = totalUnits ? Math.round(occupied / totalUnits * 1000) / 10 : 0;
  const collected = data.payments.filter((item) => item.status === 'PAID').reduce((sum, item) => sum + item.amount, 0);
  const tenantLease = data.leases.find((item) => item.tenant === session.user.name);
  const nextPayment = data.payments.filter((item) => item.status === 'PENDING').sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];
  const upcomingLeases = [...data.leases].filter((lease) => ['ACTIVE', 'EXPIRING'].includes(lease.status)).sort((a, b) => a.endDate.localeCompare(b.endDate)).slice(0, 3);
  const currentDate = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date());
  if (role === 'TENANT') return <div className="stack">
    <Hero eyebrow="Your home at a glance" title={`Welcome home, ${session.user.name.split(' ')[0]}.`} text="Track your lease, payments, documents, and service requests from one place." score="Current"/>
    <div className="metrics"><Metric label="Next payment" value={nextPayment ? money(nextPayment.amount) : 'None due'} note={nextPayment ? `Due ${new Date(`${nextPayment.dueDate}T00:00:00`).toLocaleDateString()}` : 'No pending charges'}/><Metric label="Lease status" value={tenantLease?.status || 'No active lease'} note={tenantLease ? `Through ${new Date(`${tenantLease.endDate}T00:00:00`).toLocaleDateString()}` : 'Contact property management'}/><Metric label="Open requests" value={String(orders.filter((item) => item.status !== 'COMPLETED').length)} note="We’ll keep you updated"/><Metric label="Payments" value={String(data.payments.length)} note="Ledger entries"/></div>
    <section className="panel"><PanelHead eyebrow="Service history" title="Your maintenance requests" action={<button className="text-button" onClick={() => onView('maintenance')}>View all <ChevronRight size={16}/></button>}/><OrderTable orders={orders} onAdvance={onAdvance} readonly/></section>
  </div>;
  if (role === 'MAINTENANCE') return <div className="stack">
    <Hero eyebrow="Field operations" title={`Welcome, ${session.user.name.split(' ')[0]}.`} text="Review assigned and unassigned service requests in priority order." score={`${orders.filter((item) => item.status !== 'COMPLETED').length} open`}/>
    <div className="metrics"><Metric label="Assigned to you" value={String(orders.filter((item) => item.technician === session.user.name).length)} note="Across the portfolio"/><Metric label="Urgent" value={String(orders.filter((item) => item.priority === 'URGENT').length)} note="Respond immediately"/><Metric label="In progress" value={String(orders.filter((item) => item.status === 'IN_PROGRESS').length)} note="Active work"/><Metric label="Completed" value={String(orders.filter((item) => item.status === 'COMPLETED').length)} note="Visible work orders"/></div>
    <section className="panel"><PanelHead eyebrow="Work queue" title="Assigned requests"/><OrderTable orders={orders} onAdvance={onAdvance}/></section>
  </div>;
  return <div className="stack">
    <Hero eyebrow={role === 'OWNER' ? 'Owner performance' : currentDate} title={role === 'OWNER' ? 'Your portfolio performance.' : 'Your portfolio overview.'} text="Metrics below are calculated from current EstateOS records." score={`${occupancy}% occupied`}/>
    <div className="metrics"><Metric label="Monthly rent roll" value={money(rent)} note={`Across ${totalUnits} units`}/><Metric label="Occupancy" value={`${occupancy}%`} note={`${occupied} of ${totalUnits} units leased`}/><Metric label="Open requests" value={String(orders.filter((item) => !['COMPLETED','CANCELLED'].includes(item.status)).length)} note={`${orders.filter((item) => item.priority === 'URGENT').length} urgent`}/><Metric label={role === 'OWNER' ? 'Net operating income' : 'Rent collected'} value={role === 'OWNER' ? money(data.summary?.netOperatingIncome || 0) : `${Math.round(collected / Math.max(1, data.payments.reduce((sum, item) => sum + item.amount, 0)) * 1000) / 10}%`} note={role === 'OWNER' ? 'Revenue less recorded expenses' : `${money(collected)} received`}/></div>
    <div className="layout"><section className="panel"><PanelHead eyebrow="Live operations" title="Maintenance queue" action={<button className="text-button" onClick={() => onView('maintenance')}>View all <ChevronRight size={16}/></button>}/><OrderTable orders={orders.slice(0, 3)} onAdvance={onAdvance} readonly={role === 'OWNER'}/></section><section className="panel"><p className="eyebrow">Upcoming</p><h3>Lease expirations</h3>{upcomingLeases.map((lease) => <Timeline key={lease.id} date={new Date(`${lease.endDate}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} title={`${lease.tenant} lease ends`} text={`Unit ${lease.unit} · ${lease.property}`}/>)}{!upcomingLeases.length && <Empty text="No upcoming lease expirations."/>}</section></div>
  </div>;
}

function Hero({ eyebrow, title, text, score }: { eyebrow: string; title: string; text: string; score: string }) { return <div className="hero"><div><p className="eyebrow">{eyebrow}</p><h2>{title}</h2><p>{text}</p></div><div className="hero-score"><span>Portfolio health</span><strong>{score}</strong><small>On track</small></div></div>; }
function Metric({ label, value, note }: { label: string; value: string; note: string }) { return <article className="metric"><span>{label}</span><strong>{value}</strong><small>{note}</small></article>; }
function PanelHead({ eyebrow, title, action }: { eyebrow: string; title: string; action?: ReactNode }) { return <div className="panel-head"><div><p className="eyebrow">{eyebrow}</p><h3>{title}</h3></div>{action}</div>; }
function Timeline({ date, title, text }: { date: string; title: string; text: string }) { return <div className="timeline"><div className="date"><CalendarRange size={16}/><span>{date}</span></div><div><strong>{title}</strong><p>{text}</p></div></div>; }

function Properties({ data, search, onAdd }: { data: Workspace; search: string; onAdd: () => void }) {
  const rows = data.properties.filter((item) => `${item.name} ${item.address} ${item.city}`.toLowerCase().includes(search.toLowerCase()));
  return <div className="stack"><div className="section-intro"><div><p className="eyebrow">Portfolio directory</p><h2>Properties and unit health</h2><p>See occupancy, rent potential, and open work at every building.</p></div><button className="primary" onClick={onAdd}><Plus size={17}/>Add property</button></div><div className="property-grid">{rows.map((property) => <article className="property-card" key={property.id}><div className="property-image"><Building2 size={34}/><span className={property.openMaintenance > 1 ? 'status attention' : 'status stable'}>{property.openMaintenance > 1 ? 'Needs attention' : 'Stable'}</span></div><div className="property-body"><p className="eyebrow">{property.occupied}/{property.units} occupied</p><h3>{property.name}</h3><p>{property.address}<br/>{property.city}</p><div className="property-stats"><div><span>Occupancy</span><strong>{Math.round(property.occupied / property.units * 100)}%</strong></div><div><span>Monthly rent</span><strong>{money(property.monthlyRent)}</strong></div><div><span>Open work</span><strong>{property.openMaintenance}</strong></div><div><span>Units</span><strong>{property.units}</strong></div></div></div></article>)}</div></div>;
}

function Tenants({ data, search, onAdd }: { data: Workspace; search: string; onAdd: () => void }) {
  const rows = data.tenants.filter((item) => Object.values(item).join(' ').toLowerCase().includes(search.toLowerCase()));
  return <section className="panel"><PanelHead eyebrow="Resident directory" title={`${rows.length} active residents`} action={<button className="primary" onClick={onAdd}><Plus size={17}/>Add resident</button>}/><div className="tenant-list">{rows.map((tenant) => <div className="tenant-row" key={tenant.id}><div className="avatar small">{initials(tenant.name)}</div><div><strong>{tenant.name}</strong><span>{tenant.email} · {tenant.phone}</span></div><div><strong>{tenant.property}</strong><span>Unit {tenant.unit}</span></div><span className="tenant-status">{tenant.status}</span><button className="icon" aria-label={`View ${tenant.name}`}><ChevronRight size={17}/></button></div>)}</div></section>;
}

function Leases({ session, data, setData, notify, onAdd }: { session: Session; data: Workspace; setData: React.Dispatch<React.SetStateAction<Workspace>>; notify: (message: string) => void; onAdd: () => void }) {
  const rows = session.user.role === 'TENANT' ? data.leases.filter((item) => item.tenant === session.user.name) : data.leases;
  const lifecycle = async (lease: LeaseRecord, action: 'renew' | 'move-out') => {
    const body = action === 'renew'
      ? { startDate: lease.endDate, endDate: `${Number(lease.endDate.slice(0, 4)) + 1}${lease.endDate.slice(4)}`, monthlyRent: Math.round(lease.rent * 1.03), activate: false }
      : { endDate: new Date().toISOString(), reason: 'Move-out completed in EstateOS', terminated: false };
    await request(`/leases/${lease.id}/${action}`, { method: 'POST', body: JSON.stringify(body) }, session.token);
    setData((current) => ({ ...current, leases: current.leases.map((item) => item.id === lease.id ? { ...item, status: action === 'renew' ? 'EXPIRING' : 'ENDED' } : item) }));
    notify(action === 'renew' ? 'Renewal draft created' : 'Move-out completed and unit released');
  };
  return <section className="panel"><PanelHead eyebrow="Lease lifecycle" title="Leases, renewals, and move-outs" action={session.user.role !== 'TENANT' ? <button className="primary" onClick={onAdd}><Plus size={17}/>New lease</button> : undefined}/><div className="table-wrap"><table><thead><tr><th>Resident</th><th>Property</th><th>Term</th><th>Rent</th><th>Status</th>{session.user.role !== 'TENANT' && <th/>}</tr></thead><tbody>{rows.map((lease) => <tr key={lease.id}><td><strong>{lease.tenant}</strong><small>Unit {lease.unit}</small></td><td>{lease.property}</td><td>{lease.startDate}<small>to {lease.endDate}</small></td><td>{money(lease.rent)}</td><td><Status value={lease.status}/></td>{session.user.role !== 'TENANT' && <td><div className="row-actions">{['ACTIVE','EXPIRING'].includes(lease.status) && <><button className="text-button" onClick={() => lifecycle(lease, 'renew')}>Renew</button><button className="text-button danger-text" onClick={() => lifecycle(lease, 'move-out')}>Move out</button></>}</div></td>}</tr>)}</tbody></table></div></section>;
}

function Maintenance({ orders, onAdvance, onAdd }: { orders: WorkOrder[]; onAdvance: (id: string) => void; onAdd: () => void }) { return <section className="panel"><PanelHead eyebrow="Service operations" title={`${orders.filter((item) => !['COMPLETED','CANCELLED'].includes(item.status)).length} open requests`} action={<button className="primary" onClick={onAdd}><Plus size={17}/>New request</button>}/><OrderTable orders={orders} onAdvance={onAdvance}/></section>; }
function OrderTable({ orders, onAdvance, readonly = false }: { orders: WorkOrder[]; onAdvance: (id: string) => void; readonly?: boolean }) { return <div className="table-wrap"><table><thead><tr><th>Request</th><th>Property</th><th>Priority</th><th>Status</th>{!readonly && <th/>}</tr></thead><tbody>{orders.map((order) => <tr key={order.id}><td><strong>{order.title}</strong><small>#{order.id} · {order.tenant} · {order.unit}</small></td><td>{order.property}<small>{order.technician ? `Assigned to ${order.technician}` : 'Unassigned'}</small></td><td><span className={`pill ${order.priority.toLowerCase()}`}>{order.priority}</span></td><td><Status value={order.status}/></td>{!readonly && <td>{!['COMPLETED','CANCELLED'].includes(order.status) && <button className="text-button" onClick={() => onAdvance(order.id)}>Advance</button>}</td>}</tr>)}</tbody></table>{!orders.length && <Empty text="No maintenance requests match this view."/>}</div>; }

function Financials({ role, data, onAdd }: { role: Role; data: Workspace; onAdd: () => void }) {
  const scheduled = data.payments.reduce((sum, item) => sum + item.amount, 0);
  const collected = data.payments.filter((item) => item.status === 'PAID').reduce((sum, item) => sum + item.amount, 0);
  const outstanding = data.payments.filter((item) => ['PENDING', 'LATE'].includes(item.status)).reduce((sum, item) => sum + item.amount, 0);
  const netOperatingIncome = data.summary?.netOperatingIncome ?? collected;
  return <div className="stack"><div className="metrics"><Metric label="Scheduled charges" value={money(scheduled)} note="Visible ledger"/><Metric label="Collected" value={money(collected)} note={`${scheduled ? Math.round(collected / scheduled * 1000) / 10 : 0}% collection rate`}/><Metric label="Outstanding" value={money(outstanding)} note="Pending and late"/><Metric label="Net operating income" value={money(netOperatingIncome)} note="Recorded revenue less expenses"/></div><section className="panel"><PanelHead eyebrow="Payment ledger" title="Rent and other charges" action={['ADMIN','MANAGER'].includes(role) ? <button className="primary" onClick={onAdd}><Plus size={17}/>Record payment</button> : undefined}/><div className="table-wrap"><table><thead><tr><th>Resident</th><th>Property</th><th>Due date</th><th>Amount</th><th>Status</th></tr></thead><tbody>{data.payments.map((payment) => <tr key={payment.id}><td><strong>{payment.tenant}</strong><small>Rent payment</small></td><td>{payment.property}</td><td>{payment.dueDate}</td><td>{money(payment.amount)}</td><td><Status value={payment.status}/></td></tr>)}</tbody></table></div></section></div>;
}

function Reports({ data }: { data: Workspace }) {
  const annualizedRevenue = data.properties.reduce((sum, item) => sum + item.monthlyRent, 0) * 12;
  const expenseRatio = data.summary?.revenue ? Math.round((data.summary.expenses / data.summary.revenue) * 1000) / 10 : 0;
  const completed = data.maintenance.filter((item) => item.status === 'COMPLETED').length;
  return <div className="stack"><div className="section-intro"><div><p className="eyebrow">Decision intelligence</p><h2>Portfolio reporting</h2><p>Revenue, occupancy, expenses, and service health from current records.</p></div><button className="secondary" onClick={() => window.print()}><ClipboardList size={17}/>Export report</button></div><div className="metrics"><Metric label="Annualized rent roll" value={money(annualizedRevenue)} note="Based on current units"/><Metric label="Expense ratio" value={`${expenseRatio}%`} note="Recorded expenses/revenue"/><Metric label="Active leases" value={String(data.leases.filter((item) => ['ACTIVE','EXPIRING'].includes(item.status)).length)} note="Current records"/><Metric label="Completed work" value={String(completed)} note={`${data.maintenance.length} total requests`}/></div><section className="panel"><PanelHead eyebrow="Property comparison" title="Occupancy"/>{data.properties.map((property) => <div className="progress-row" key={property.id}><div><strong>{property.name}</strong><span>{property.occupied}/{property.units} units</span></div><div className="progress"><span style={{ width: `${property.units ? property.occupied / property.units * 100 : 0}%` }}/></div><strong>{property.units ? Math.round(property.occupied / property.units * 100) : 0}%</strong></div>)}</section></div>;
}

function Files({ session, data, notify }: { session: Session; data: Workspace; notify: (message: string) => void }) {
  const canUpload = session.user.role !== 'TENANT';
  const [kind, setKind] = useState<'property-image'|'lease-document'|'maintenance-attachment'>(session.user.role === 'MAINTENANCE' ? 'maintenance-attachment' : 'property-image');
  const [target, setTarget] = useState(session.user.role === 'MAINTENANCE' ? data.maintenance[0]?.id || '' : data.properties[0]?.id || '');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [recentFiles, setRecentFiles] = useState<any[]>([]);
  useEffect(() => {
    request<{ files: any[] }>('/files', {}, session.token)
      .then((result) => setRecentFiles(result.files))
      .catch(() => undefined);
  }, [session]);
  const targets = kind === 'property-image' ? data.properties.map((item) => ({ id: item.id, label: item.name })) : kind === 'lease-document' ? data.leases.map((item) => ({ id: item.id, label: `${item.tenant} · ${item.unit}` })) : data.maintenance.map((item) => ({ id: item.id, label: `#${item.id} · ${item.title}` }));
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!file || !target) return;
    setBusy(true);
    try {
      const field = kind === 'property-image' ? 'propertyId' : kind === 'lease-document' ? 'leaseId' : 'requestId';
      const result = await uploadFile(session, kind, field, target, file);
      setRecentFiles((current) => [result.file, ...current]);
      notify(`${file.name} uploaded and secured`);
      setFile(null);
    } finally { setBusy(false); }
  };
  return <div className={canUpload ? 'layout files-layout' : 'stack'}>{canUpload && <section className="panel"><PanelHead eyebrow="Secure uploads" title="Add a document or image"/><form className="upload-form" onSubmit={submit}><label>File category<select value={kind} onChange={(e) => { setKind(e.target.value as typeof kind); setTarget(''); }}>{session.user.role !== 'MAINTENANCE' && <><option value="property-image">Property image</option><option value="lease-document">Lease document</option></>}<option value="maintenance-attachment">Maintenance attachment</option></select></label><label>Attach to<select value={target} onChange={(e) => setTarget(e.target.value)} required><option value="">Choose a record</option>{targets.map((item) => <option value={item.id} key={item.id}>{item.label}</option>)}</select></label><label className="dropzone"><Upload size={24}/><strong>{file?.name || 'Choose a file'}</strong><span>Images, PDFs, and supported documents are validated before storage.</span><input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} required/></label><button className="primary full" disabled={busy || !file}>{busy ? 'Uploading…' : 'Upload securely'}</button></form></section>}<section className="panel"><PanelHead eyebrow="Document center" title="Recently added"/>{recentFiles.map((item) => <div className="file-row" key={item.id}><div className="file-icon"><FileUp size={18}/></div><div><strong>{item.originalFilename}</strong><span>{String(item.category).toLowerCase().replaceAll('_', ' ')} · {new Date(item.createdAt).toLocaleDateString()}</span></div><Status value="VERIFIED"/></div>)}{!recentFiles.length && <Empty text="No files have been added yet."/>}</section></div>;
}

function Administration({ session, data, notify }: { session: Session; data: Workspace; notify: (message: string) => void }) {
  const [users, setUsers] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setError('');
    setLoading(true);
    Promise.all([
      request<{ users: any[] }>('/admin/users', {}, session.token),
      request<{ logs: any[] }>('/admin/audit?limit=20', {}, session.token),
      request<{ metrics: any }>('/admin/metrics', {}, session.token),
    ]).then(([userResult, auditResult, metricResult]) => {
      setUsers(userResult.users); setLogs(auditResult.logs); setMetrics(metricResult.metrics);
    }).catch((reason) => setError(reason instanceof Error ? reason.message : 'Administration data could not be loaded.'))
      .finally(() => setLoading(false));
  }, [session]);
  const changeAccess = async (userId: string, role: Role, tenantId?: string, propertyIds: string[] = []) => {
    const result = await request<{ user: any }>(`/admin/users/${userId}/access`, { method: 'PATCH', body: JSON.stringify({ role, tenantId: tenantId || null, propertyIds }) }, session.token);
    setUsers((current) => current.map((user) => user.id === userId ? { ...user, ...result.user, tenantProfile: tenantId ? data.tenants.find((item) => item.id === tenantId) : null, ownedProperties: propertyIds.map((propertyId) => ({ property: data.properties.find((item) => item.id === propertyId) })) } : user));
    notify('User access updated');
  };
  return <div className="stack">
    {error && <div className="sync-error"><strong>Administration unavailable</strong><span>{error}</span></div>}
    {loading && <div className="loading-state"><span/><span/><span/><p>Loading administration data…</p></div>}
    <div className="metrics"><Metric label="Active users" value={String(users.length)} note="Loaded accounts"/><Metric label="Audit events" value={String(logs.length)} note="Most recent activity"/><Metric label="API uptime" value={metrics ? `${Math.floor(metrics.uptimeSeconds / 60)}m` : 'Unavailable'} note="Current process"/><Metric label="Security alerts" value="Not configured" note="Connect monitoring provider"/></div>
    <div className="layout">
      <section className="panel"><PanelHead eyebrow="Access control" title="Workspace users"/>{users.map((user) => <AccessEditor key={user.id} user={user} data={data} onSave={changeAccess}/>)}</section>
      <section className="panel"><PanelHead eyebrow="Audit trail" title="Recent activity"/>{logs.map((log) => <div className="audit-row" key={log.id}><span/><div><strong>{log.action}</strong><small>{log.actor?.name || 'System'} · {new Date(log.createdAt).toLocaleString()}</small></div></div>)}</section>
    </div>
    <section className="panel"><PanelHead eyebrow="Data coverage" title="System records"/><div className="record-grid"><div><strong>{data.properties.length}</strong><span>Properties</span></div><div><strong>{data.tenants.length}</strong><span>Residents</span></div><div><strong>{data.leases.length}</strong><span>Leases</span></div><div><strong>{data.maintenance.length}</strong><span>Work orders</span></div><div><strong>{data.payments.length}</strong><span>Payments</span></div></div></section>
  </div>;
}

function AccessEditor({ user, data, onSave }: { user: any; data: Workspace; onSave: (userId: string, role: Role, tenantId?: string, propertyIds?: string[]) => Promise<void> }) {
  const [role, setRole] = useState<Role>(user.role);
  const [tenantId, setTenantId] = useState(user.tenantProfile?.id || '');
  const [propertyIds, setPropertyIds] = useState<string[]>((user.ownedProperties || []).map((item: any) => item.property.id));
  const [busy, setBusy] = useState(false);
  const valid = role !== 'TENANT' || Boolean(tenantId);
  return <div className="role-row">
    <div className="avatar small">{initials(user.name)}</div>
    <div><strong>{user.name}</strong><span>{user.email}</span></div>
    <div>
      <select aria-label={`Role for ${user.name}`} value={role} onChange={(event) => setRole(event.target.value as Role)}>{['ADMIN','MANAGER','MAINTENANCE','TENANT','OWNER'].map((item) => <option key={item}>{item}</option>)}</select>
      {role === 'TENANT' && <select aria-label={`Resident for ${user.name}`} value={tenantId} onChange={(event) => setTenantId(event.target.value)} required><option value="">Choose resident</option>{data.tenants.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}</select>}
      {role === 'OWNER' && <select multiple aria-label={`Properties for ${user.name}`} value={propertyIds} onChange={(event) => setPropertyIds(Array.from(event.currentTarget.selectedOptions, (option) => option.value))}>{data.properties.map((property) => <option key={property.id} value={property.id}>{property.name}</option>)}</select>}
      <button className="text-button" disabled={busy || !valid} onClick={async () => { setBusy(true); try { await onSave(user.id, role, tenantId, propertyIds); } finally { setBusy(false); } }}>{busy ? 'Saving…' : 'Save access'}</button>
    </div>
  </div>;
}

function QuickCreate({ type, session, data, setData, onClose, notify }: { type: Exclude<ActionType, null>; session: Session; data: Workspace; setData: React.Dispatch<React.SetStateAction<Workspace>>; onClose: () => void; notify: (message: string) => void }) {
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const id = crypto.randomUUID();
    if (type === 'maintenance') {
      const property = data.properties.find((item) => item.id === form.get('propertyId')) || data.properties[0];
      const tenantLease = data.leases.find((item) => item.tenant === session.user.name);
      const order: WorkOrder = { id: id.slice(0, 6), title: String(form.get('title')), property: property?.name || tenantLease?.property || 'Property', unit: String(form.get('unit') || tenantLease?.unit || 'Common area'), tenant: session.user.role === 'TENANT' ? session.user.name : String(form.get('tenant') || 'Common area'), priority: String(form.get('priority')) as WorkOrder['priority'], status: 'NEW', createdAt: 'Just now' };
      const path = session.user.role === 'TENANT' ? '/portal/tenant/maintenance' : '/maintenance';
      const payload = session.user.role === 'TENANT'
        ? { unitId: tenantLease?.unitId, title: order.title, description: form.get('description'), priority: order.priority }
        : { propertyId: property.id, title: order.title, description: form.get('description'), priority: order.priority };
      const result = await request<{ request: any }>(path, { method: 'POST', body: JSON.stringify(payload) }, session.token);
      order.id = result.request.id;
      order.createdAt = new Date(result.request.createdAt).toLocaleDateString();
      setData((current) => ({ ...current, maintenance: [order, ...current.maintenance] }));
    }
    if (type === 'property') {
      const property: PropertyRecord = { id, name: String(form.get('name')), address: String(form.get('address')), city: `${form.get('city')}, ${form.get('state')}`, units: Number(form.get('units')), occupied: 0, monthlyRent: 0, openMaintenance: 0 };
      const result = await request<{ property: any }>('/properties', { method: 'POST', body: JSON.stringify({ name: property.name, address1: property.address, city: form.get('city'), state: form.get('state'), postalCode: form.get('postalCode'), unitCount: property.units }) }, session.token);
      property.id = result.property.id;
      property.units = result.property.units.length;
      property.unitOptions = result.property.units.map((unit: any) => ({ id: unit.id, number: unit.number, status: unit.status }));
      setData((current) => ({ ...current, properties: [property, ...current.properties] }));
    }
    if (type === 'tenant') {
      const tenant: TenantRecord = { id, name: `${form.get('firstName')} ${form.get('lastName')}`, email: String(form.get('email')), phone: String(form.get('phone')), property: 'Unassigned', unit: '—', status: 'APPLICANT' };
      const result = await request<{ tenant: any }>('/tenants', { method: 'POST', body: JSON.stringify({ firstName: form.get('firstName'), lastName: form.get('lastName'), email: tenant.email, phone: tenant.phone }) }, session.token);
      tenant.id = result.tenant.id;
      setData((current) => ({ ...current, tenants: [...current.tenants, tenant] }));
    }
    if (type === 'lease') {
      const tenant = data.tenants.find((item) => item.id === form.get('tenantId')) || data.tenants[0];
      const property = data.properties.find((item) => item.unitOptions?.some((unit) => unit.id === form.get('unitId'))) || data.properties[0];
      const unit = property.unitOptions?.find((item) => item.id === form.get('unitId'));
      const lease: LeaseRecord = {
        id, tenantId: tenant.id, unitId: unit?.id, tenant: tenant.name, property: property.name,
        unit: unit?.number || '—', rent: Number(form.get('monthlyRent')),
        startDate: String(form.get('startDate')), endDate: String(form.get('endDate')), status: 'DRAFT',
      };
      {
        const result = await request<{ lease: any }>('/leases', {
         method: 'POST',
        body: JSON.stringify({
          unitId: lease.unitId, tenantIds: [tenant.id], primaryTenantId: tenant.id,
          startDate: lease.startDate, endDate: lease.endDate, monthlyRent: lease.rent,
          securityDeposit: Number(form.get('securityDeposit')), status: 'DRAFT',
        }),
        }, session.token);
        lease.id = result.lease.id;
      }
      setData((current) => ({ ...current, leases: [lease, ...current.leases] }));
    }
    if (type === 'payment') {
      const tenant = data.tenants.find((item) => item.id === form.get('tenantId')) || data.tenants[0];
      const lease = data.leases.find((item) => item.tenantId === tenant.id || item.tenant === tenant.name);
      const payment: PaymentRecord = { id, tenant: tenant.name, property: tenant.property, amount: Number(form.get('amount')), dueDate: String(form.get('dueDate')), status: 'PAID' };
      {
        const result = await request<{ payment: any }>('/payments', {
         method: 'POST',
        body: JSON.stringify({ tenantId: tenant.id, leaseId: lease?.id, amount: payment.amount, dueDate: payment.dueDate, type: 'RENT', status: 'PAID', paidAt: payment.dueDate }),
        }, session.token);
        payment.id = result.payment.id;
      }
      setData((current) => ({ ...current, payments: [payment, ...current.payments] }));
    }
    notify(`${type[0].toUpperCase()}${type.slice(1)} saved successfully`);
    onClose();
  };
  const titles = { maintenance: 'Create maintenance request', property: 'Add a property', tenant: 'Add a resident', lease: 'Create a lease', payment: 'Record a payment' };
  const units = data.properties.flatMap((property) => (property.unitOptions || []).filter((unit) => !unit.status || unit.status === 'VACANT').map((unit) => ({ ...unit, property: property.name })));
  return <div className="overlay" onMouseDown={onClose}><form className="modal" onSubmit={submit} onMouseDown={(e) => e.stopPropagation()}>
    <PanelHead eyebrow="Quick create" title={titles[type]} action={<button type="button" className="icon" onClick={onClose} aria-label="Close"><X size={18}/></button>}/>
    {type === 'maintenance' && <><label>Issue<input name="title" placeholder="Describe the problem" required/></label>{session.user.role !== 'TENANT' && <div className="form-grid"><label>Property<select name="propertyId" required>{data.properties.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label><label>Unit<input name="unit" placeholder="2B"/></label></div>}<label>Details<textarea name="description" placeholder="What is happening, and when did it start?" required minLength={10}/></label><label>Priority<select name="priority"><option>NORMAL</option><option>HIGH</option><option>URGENT</option><option>LOW</option></select></label></>}
    {type === 'property' && <><label>Property name<input name="name" required/></label><label>Street address<input name="address" required/></label><div className="form-grid three"><label>City<input name="city" required/></label><label>State<input name="state" defaultValue="MN" required/></label><label>ZIP code<input name="postalCode" required/></label></div><label>Number of units<input name="units" type="number" min="1" defaultValue="1" required/></label></>}
    {type === 'tenant' && <><div className="form-grid"><label>First name<input name="firstName" required/></label><label>Last name<input name="lastName" required/></label></div><label>Email<input name="email" type="email" required/></label><label>Phone<input name="phone" type="tel"/></label></>}
    {type === 'lease' && <><label>Resident<select name="tenantId" required>{data.tenants.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label><label>Available unit<select name="unitId" required>{units.map((item) => <option value={item.id} key={item.id}>{item.property} · Unit {item.number}</option>)}</select></label><div className="form-grid"><label>Start date<input name="startDate" type="date" required/></label><label>End date<input name="endDate" type="date" required/></label></div><div className="form-grid"><label>Monthly rent<input name="monthlyRent" type="number" min="1" step=".01" required/></label><label>Security deposit<input name="securityDeposit" type="number" min="0" step=".01" required/></label></div></>}
    {type === 'payment' && <><label>Resident<select name="tenantId">{data.tenants.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label><div className="form-grid"><label>Amount<input name="amount" type="number" min="0" step=".01" required/></label><label>Payment date<input name="dueDate" type="date" required/></label></div></>}
    <button className="primary full" type="submit">Save {type}</button>
  </form></div>;
}

function NotificationDrawer({ data, setData, onClose }: { data: Workspace; setData: React.Dispatch<React.SetStateAction<Workspace>>; onClose: () => void }) {
  const markAll = () => setData((current) => ({ ...current, notifications: current.notifications.map((item) => ({ ...item, read: true })) }));
  return <div className="drawer-overlay" onMouseDown={onClose}><aside className="drawer" onMouseDown={(e) => e.stopPropagation()}><PanelHead eyebrow="Activity center" title="Notifications" action={<button className="icon" onClick={onClose}><X size={18}/></button>}/><button className="text-button mark-all" onClick={markAll}>Mark all as read</button><div className="notification-list">{data.notifications.map((note) => <article className={note.read ? 'notification read' : 'notification'} key={note.id}><span className="notification-dot"/><div><strong>{note.title}</strong><p>{note.message}</p><small>{note.createdAt}</small></div></article>)}</div></aside></div>;
}

function Status({ value }: { value: string }) { return <span className={`stage ${value.toLowerCase().replaceAll('_', '-')}`}>{value.toLowerCase().replaceAll('_', ' ')}</span>; }
function Empty({ text }: { text: string }) { return <div className="empty"><ClipboardList size={24}/><p>{text}</p></div>; }
