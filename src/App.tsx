import { FormEvent, useMemo, useState } from 'react';
import { Building2, CalendarDays, ChevronRight, CircleDollarSign, Home, Menu, Moon, Plus, Search, Settings, Sun, Users, Wrench, X } from 'lucide-react';

type View = 'overview' | 'properties' | 'tenants' | 'maintenance' | 'financials';
type Property = { id: number; name: string; address: string; units: number; occupied: number; monthlyRent: number; status: 'Stable' | 'Attention' };
type WorkOrder = { id: number; title: string; property: string; tenant: string; priority: 'Urgent' | 'High' | 'Normal'; status: 'New' | 'Scheduled' | 'Completed'; created: string };

const properties: Property[] = [
  { id: 1, name: 'North Loop Flats', address: '725 Washington Ave N, Minneapolis', units: 24, occupied: 23, monthlyRent: 42800, status: 'Stable' },
  { id: 2, name: 'Cedar Riverside Homes', address: '1815 Riverside Ave, Minneapolis', units: 18, occupied: 16, monthlyRent: 29400, status: 'Attention' },
  { id: 3, name: 'Summit View Residences', address: '1040 Grand Ave, St. Paul', units: 12, occupied: 12, monthlyRent: 21600, status: 'Stable' },
];

const initialOrders: WorkOrder[] = [
  { id: 381, title: 'No heat in bedroom', property: 'Cedar Riverside Homes', tenant: 'Amina Yusuf', priority: 'Urgent', status: 'New', created: 'Today, 8:42 AM' },
  { id: 380, title: 'Kitchen faucet leaking', property: 'North Loop Flats', tenant: 'Daniel Brooks', priority: 'High', status: 'Scheduled', created: 'Yesterday' },
  { id: 379, title: 'Replace hallway light', property: 'Summit View Residences', tenant: 'Common Area', priority: 'Normal', status: 'Completed', created: 'Jul 27' },
];

const nav: { id: View; label: string; icon: React.ReactNode }[] = [
  { id: 'overview', label: 'Overview', icon: <Home size={18} /> },
  { id: 'properties', label: 'Properties', icon: <Building2 size={18} /> },
  { id: 'tenants', label: 'Tenants', icon: <Users size={18} /> },
  { id: 'maintenance', label: 'Maintenance', icon: <Wrench size={18} /> },
  { id: 'financials', label: 'Financials', icon: <CircleDollarSign size={18} /> },
];

export default function App() {
  const [view, setView] = useState<View>('overview');
  const [dark, setDark] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [orders, setOrders] = useState(initialOrders);
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState('');

  const occupancy = Math.round((properties.reduce((sum, p) => sum + p.occupied, 0) / properties.reduce((sum, p) => sum + p.units, 0)) * 100);
  const monthlyRent = properties.reduce((sum, p) => sum + p.monthlyRent, 0);
  const filteredOrders = useMemo(() => orders.filter(order => [order.title, order.property, order.tenant, order.status].join(' ').toLowerCase().includes(search.toLowerCase())), [orders, search]);

  const advanceOrder = (id: number) => setOrders(current => current.map(order => order.id === id ? { ...order, status: order.status === 'New' ? 'Scheduled' : order.status === 'Scheduled' ? 'Completed' : 'New' } : order));

  return <div className={dark ? 'app dark' : 'app'}>
    <aside className={mobileOpen ? 'sidebar open' : 'sidebar'}>
      <div className="brand"><div className="logo"><Building2 size={20} /></div><div><strong>EstateOS</strong><span>Property operations</span></div><button className="icon mobile-close" onClick={() => setMobileOpen(false)}><X size={19}/></button></div>
      <nav>{nav.map(item => <button key={item.id} className={view === item.id ? 'nav-item active' : 'nav-item'} onClick={() => { setView(item.id); setMobileOpen(false); }}>{item.icon}<span>{item.label}</span></button>)}</nav>
      <div className="sidebar-footer"><button className="nav-item"><Settings size={18}/><span>Settings</span></button><div className="user"><div className="avatar">AM</div><div><strong>Aziz Mire</strong><span>Portfolio Manager</span></div></div></div>
    </aside>

    <main>
      <header className="topbar"><button className="icon menu" onClick={() => setMobileOpen(true)}><Menu size={20}/></button><div><p className="eyebrow">Portfolio workspace</p><h1>{nav.find(item => item.id === view)?.label}</h1></div><div className="top-actions"><div className="search"><Search size={17}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search portfolio" /></div><button className="icon" onClick={() => setDark(value => !value)}>{dark ? <Sun size={19}/> : <Moon size={19}/>}</button><button className="primary" onClick={() => setModalOpen(true)}><Plus size={17}/> New request</button></div></header>

      <section className="page">
        {view === 'overview' && <Overview occupancy={occupancy} monthlyRent={monthlyRent} orders={filteredOrders} onAdvance={advanceOrder} onViewMaintenance={() => setView('maintenance')} />}
        {view === 'properties' && <Properties />}
        {view === 'tenants' && <Tenants />}
        {view === 'maintenance' && <Maintenance orders={filteredOrders} onAdvance={advanceOrder} />}
        {view === 'financials' && <Financials monthlyRent={monthlyRent} />}
      </section>
    </main>
    {modalOpen && <RequestModal onClose={() => setModalOpen(false)} onCreate={order => { setOrders(current => [{ ...order, id: Math.max(...current.map(item => item.id)) + 1, created: 'Just now', status: 'New' }, ...current]); setModalOpen(false); setView('maintenance'); }} />}
  </div>;
}

function Overview({ occupancy, monthlyRent, orders, onAdvance, onViewMaintenance }: { occupancy: number; monthlyRent: number; orders: WorkOrder[]; onAdvance: (id: number) => void; onViewMaintenance: () => void }) {
  return <><div className="hero"><div><p className="eyebrow">Wednesday, July 29</p><h2>Your portfolio is performing well.</h2><p>Occupancy remains strong. One urgent maintenance request needs attention today.</p></div><div className="hero-score"><span>Portfolio health</span><strong>92</strong><small>Excellent</small></div></div>
  <div className="metrics"><Metric label="Monthly rent roll" value={`$${monthlyRent.toLocaleString()}`} note="Across 54 units"/><Metric label="Occupancy" value={`${occupancy}%`} note="51 of 54 units leased"/><Metric label="Open requests" value={String(orders.filter(o => o.status !== 'Completed').length)} note="1 urgent"/><Metric label="Rent collected" value="96.8%" note="$90,760 received"/></div>
  <div className="layout"><section className="panel wide"><div className="panel-head"><div><p className="eyebrow">Live operations</p><h3>Maintenance queue</h3></div><button className="text-button" onClick={onViewMaintenance}>View all <ChevronRight size={16}/></button></div><OrderTable orders={orders.slice(0, 3)} onAdvance={onAdvance}/></section><section className="panel"><p className="eyebrow">Upcoming</p><h3>Lease calendar</h3><Timeline date="Aug 1" title="5 rent payments due" text="Automated reminders scheduled"/><Timeline date="Aug 14" title="Lease renewal" text="Unit 304 · North Loop Flats"/><Timeline date="Aug 31" title="3 leases expire" text="Review renewal offers"/></section></div></>;
}

function Properties() { return <div className="property-grid">{properties.map(property => <article className="property-card" key={property.id}><div className="property-image"><Building2 size={34}/><span className={property.status === 'Stable' ? 'status stable' : 'status attention'}>{property.status}</span></div><div className="property-body"><p className="eyebrow">{property.occupied}/{property.units} occupied</p><h3>{property.name}</h3><p>{property.address}</p><div className="property-stats"><div><span>Occupancy</span><strong>{Math.round(property.occupied/property.units*100)}%</strong></div><div><span>Monthly rent</span><strong>${property.monthlyRent.toLocaleString()}</strong></div></div></div></article>)}</div>; }
function Tenants() { const tenants = [['Amina Yusuf','Cedar Riverside Homes · 2B','Current'],['Daniel Brooks','North Loop Flats · 407','Current'],['Elena Martinez','Summit View Residences · 3','Renewal due'],['Marcus Reed','North Loop Flats · 212','Current']]; return <section className="panel"><div className="panel-head"><div><p className="eyebrow">Resident directory</p><h3>Active tenants</h3></div></div><div className="tenant-list">{tenants.map(([name, unit, status]) => <div className="tenant-row" key={name}><div className="avatar small">{name.split(' ').map(n => n[0]).join('')}</div><div><strong>{name}</strong><span>{unit}</span></div><span className="tenant-status">{status}</span><button className="icon"><ChevronRight size={17}/></button></div>)}</div></section>; }
function Maintenance({ orders, onAdvance }: { orders: WorkOrder[]; onAdvance: (id: number) => void }) { return <section className="panel"><div className="panel-head"><div><p className="eyebrow">Service operations</p><h3>Maintenance requests</h3></div></div><OrderTable orders={orders} onAdvance={onAdvance}/></section>; }
function Financials({ monthlyRent }: { monthlyRent: number }) { return <><div className="metrics"><Metric label="Scheduled rent" value={`$${monthlyRent.toLocaleString()}`} note="July 2026"/><Metric label="Collected" value="$90,760" note="96.8% collection rate"/><Metric label="Operating expenses" value="$28,430" note="31% of revenue"/><Metric label="Net operating income" value="$62,330" note="Up 4.6% this month"/></div><section className="panel"><p className="eyebrow">Portfolio revenue</p><h3>Six-month performance</h3><div className="bars">{[72,78,74,84,88,96].map((value, index) => <div key={index}><span style={{height: `${value}%`}}></span><small>{['Feb','Mar','Apr','May','Jun','Jul'][index]}</small></div>)}</div></section></>; }
function Metric({ label, value, note }: { label: string; value: string; note: string }) { return <article className="metric"><span>{label}</span><strong>{value}</strong><small>{note}</small></article>; }
function Timeline({ date, title, text }: { date: string; title: string; text: string }) { return <div className="timeline"><div className="date"><CalendarDays size={16}/><span>{date}</span></div><div><strong>{title}</strong><p>{text}</p></div></div>; }
function OrderTable({ orders, onAdvance }: { orders: WorkOrder[]; onAdvance: (id: number) => void }) { return <div className="table-wrap"><table><thead><tr><th>Request</th><th>Property</th><th>Priority</th><th>Status</th><th></th></tr></thead><tbody>{orders.map(order => <tr key={order.id}><td><strong>{order.title}</strong><small>#{order.id} · {order.tenant}</small></td><td>{order.property}</td><td><span className={`pill ${order.priority.toLowerCase()}`}>{order.priority}</span></td><td><span className="stage">{order.status}</span></td><td><button className="text-button" onClick={() => onAdvance(order.id)}>Advance</button></td></tr>)}</tbody></table></div>; }
function RequestModal({ onClose, onCreate }: { onClose: () => void; onCreate: (order: Omit<WorkOrder, 'id' | 'status' | 'created'>) => void }) { const [title,setTitle]=useState(''); const [property,setProperty]=useState(properties[0].name); const [tenant,setTenant]=useState(''); const [priority,setPriority]=useState<WorkOrder['priority']>('Normal'); const submit=(e:FormEvent)=>{e.preventDefault();onCreate({title,property,tenant,priority});}; return <div className="overlay" onMouseDown={onClose}><form className="modal" onSubmit={submit} onMouseDown={e=>e.stopPropagation()}><div className="panel-head"><div><p className="eyebrow">New work order</p><h3>Create maintenance request</h3></div><button type="button" className="icon" onClick={onClose}><X size={18}/></button></div><label>Issue<input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Describe the problem" required/></label><label>Property<select value={property} onChange={e=>setProperty(e.target.value)}>{properties.map(p=><option key={p.id}>{p.name}</option>)}</select></label><label>Tenant or area<input value={tenant} onChange={e=>setTenant(e.target.value)} placeholder="Tenant name or common area" required/></label><label>Priority<select value={priority} onChange={e=>setPriority(e.target.value as WorkOrder['priority'])}><option>Normal</option><option>High</option><option>Urgent</option></select></label><button className="primary full" type="submit">Create request</button></form></div>; }
