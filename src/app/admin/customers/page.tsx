'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Inbox,
  Search,
  Plus,
  AlertTriangle,
  Calendar,
  DollarSign,
  Phone,
  Mail,
  Edit2,
  Trash2,
  Eye,
  CheckCircle2,
  Clock,
  UserCheck,
  X,
  Sparkles,
  ShieldAlert,
} from 'lucide-react';
import { removeVietnameseDiacritics, matchesCustomerSearch } from '@/lib/utils/vietnamese';
import { isValidAustralianMobile, formatAustralianMobile } from '@/lib/utils/validation';

interface Customer {
  id: string;
  name?: string;
  full_name: string;
  phone: string;
  email: string | null;
  address: string | null;
  preferred_language: 'en' | 'vi';
  nail_shape?: string;
  nail_shape_preference?: string | null;
  nail_length?: string;
  nail_length_preference?: string | null;
  preferred_services: string[];
  preferred_products?: string[];
  allergies?: string | null;
  allergies_sensitivities?: string | null;
  general_notes?: string | null;
  notes?: string;
  total_visits: number;
  total_visits_count?: number;
  total_spent_aud: number;
  total_spend_cents?: number;
  first_visit_date: string | null;
  last_visit_date: string | null;
  is_active: boolean;
  visits?: any[];
  consultations?: any[];
}

interface Consultation {
  id: string;
  customer_id: string | null;
  customer_name: string;
  phone: string;
  email: string | null;
  preferred_language: 'en' | 'vi';
  preferred_date: string | null;
  preferred_time: string | null;
  services_requested: string[];
  notes: string | null;
  status: 'new' | 'contacted' | 'booked' | 'completed' | 'cancelled';
  converted_customer_id?: string;
  created_at: string;
}

const NAIL_SHAPES = ['Almond', 'Coffin', 'Square', 'Oval', 'Stiletto', 'Squoval'];
const NAIL_LENGTHS = ['Short', 'Medium', 'Long', 'Extra Long'];
const COMMON_ALLERGENS = ['Acetone', 'Latex', 'UV Lamps / UV Light', 'Acrylic Monomer'];
const PRODUCT_OPTIONS = [
  'SNS Dipping Powder',
  'Gel Art & Design',
  'Acrylic & Extensions',
  'Russian E-File Manicure',
  'Pedicure',
  'Chrome Finish',
];

export default function AdminCustomersPortal() {
  const [activeTab, setActiveTab] = useState<'customers' | 'inquiries'>('customers');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [inquiries, setInquiries] = useState<Consultation[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [shapeFilter, setShapeFilter] = useState('all');
  const [allergyFilter, setAllergyFilter] = useState(false);
  const [inquiryStatusFilter, setInquiryStatusFilter] = useState('all');

  // Customer Modals State
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [customerForm, setCustomerForm] = useState({
    full_name: '',
    phone: '',
    email: '',
    address: '',
    preferred_language: 'en' as 'en' | 'vi',
    nail_shape_preference: 'Almond',
    nail_length_preference: 'Medium',
    preferred_services: [] as string[],
    allergies_sensitivities: '',
    general_notes: '',
  });

  // Customer Detail Drawer State
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);

  // Log Visit Modal State
  const [isLogVisitModalOpen, setIsLogVisitModalOpen] = useState(false);
  const [visitForm, setVisitForm] = useState({
    staff_id: '',
    visit_date: new Date().toISOString().slice(0, 10),
    service_name: 'SNS Dipping Powder',
    price_aud: 75,
    tip_aud: 0,
    payment_method: 'EFTPOS',
    notes: '',
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [custRes, inqRes, staffRes] = await Promise.all([
        fetch('/api/admin/customers').then((r) => r.json()),
        fetch('/api/admin/inquiries').then((r) => r.json()),
        fetch('/api/admin/staff').then((r) => r.json()),
      ]);

      if (custRes.success) setCustomers(custRes.customers || []);
      if (inqRes.success) setInquiries(inqRes.inquiries || []);
      if (staffRes.success) {
        setStaffList(staffRes.staff || []);
        if (staffRes.staff?.length > 0 && !visitForm.staff_id) {
          setVisitForm((prev) => ({ ...prev, staff_id: staffRes.staff[0].id }));
        }
      }
    } catch {
      setFeedback({ type: 'error', message: 'Failed to load CRM data.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openCustomerModal = (customer?: Customer) => {
    if (customer) {
      setEditingCustomer(customer);
      setCustomerForm({
        full_name: customer.full_name || customer.name || '',
        phone: customer.phone,
        email: customer.email || '',
        address: customer.address || '',
        preferred_language: customer.preferred_language || 'en',
        nail_shape_preference: customer.nail_shape_preference || customer.nail_shape || 'Almond',
        nail_length_preference: customer.nail_length_preference || customer.nail_length || 'Medium',
        preferred_services: customer.preferred_services || customer.preferred_products || [],
        allergies_sensitivities: customer.allergies_sensitivities || customer.allergies || '',
        general_notes: customer.general_notes || customer.notes || '',
      });
    } else {
      setEditingCustomer(null);
      setCustomerForm({
        full_name: '',
        phone: '',
        email: '',
        address: '',
        preferred_language: 'en',
        nail_shape_preference: 'Almond',
        nail_length_preference: 'Medium',
        preferred_services: ['SNS Dipping Powder'],
        allergies_sensitivities: '',
        general_notes: '',
      });
    }
    setIsCustomerModalOpen(true);
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerForm.full_name || customerForm.full_name.trim().length < 2) {
      setFeedback({ type: 'error', message: 'Name must be at least 2 characters.' });
      return;
    }
    if (!isValidAustralianMobile(customerForm.phone)) {
      setFeedback({ type: 'error', message: 'Valid Australian mobile required (e.g. 0412 345 678).' });
      return;
    }

    try {
      const endpoint = editingCustomer
        ? `/api/admin/customers/${editingCustomer.id}`
        : '/api/admin/customers';
      const method = editingCustomer ? 'PUT' : 'POST';

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customerForm),
      });

      const data = await res.json();
      if (data.success) {
        setFeedback({
          type: 'success',
          message: editingCustomer ? 'Customer profile updated.' : 'Customer profile created.',
        });
        setIsCustomerModalOpen(false);
        fetchData();
      } else {
        setFeedback({ type: 'error', message: data.error || 'Failed to save customer.' });
      }
    } catch {
      setFeedback({ type: 'error', message: 'Network error saving customer.' });
    }
  };

  const handleSoftDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to soft-delete ${name}? History will be retained.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/customers/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setFeedback({ type: 'success', message: 'Customer soft-deleted successfully.' });
        if (selectedCustomer?.id === id) {
          setIsDetailDrawerOpen(false);
        }
        fetchData();
      } else {
        setFeedback({ type: 'error', message: data.error || 'Failed to delete.' });
      }
    } catch {
      setFeedback({ type: 'error', message: 'Network error during delete.' });
    }
  };

  const openCustomerDetail = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/customers/${id}`);
      const data = await res.json();
      if (data.success) {
        setSelectedCustomer(data.customer);
        setIsDetailDrawerOpen(true);
      }
    } catch {
      setFeedback({ type: 'error', message: 'Failed to load customer profile details.' });
    }
  };

  const handleLogVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;

    try {
      const totalAud = Number(visitForm.price_aud) + Number(visitForm.tip_aud || 0);
      const totalCents = Math.round(totalAud * 100);

      const res = await fetch('/api/admin/visits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: selectedCustomer.id,
          staff_id: visitForm.staff_id || (staffList[0]?.id || null),
          visit_date: visitForm.visit_date,
          services_rendered: [
            { name: visitForm.service_name, price_aud: Number(visitForm.price_aud), price_cents: Math.round(Number(visitForm.price_aud) * 100) },
          ],
          total_amount_cents: totalCents,
          total_amount_aud: totalAud,
          price_charged_aud: Number(visitForm.price_aud),
          tip_aud: Number(visitForm.tip_aud || 0),
          payment_method: visitForm.payment_method,
          notes: visitForm.notes,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setFeedback({ type: 'success', message: 'Service visit logged & revenue synced.' });
        setIsLogVisitModalOpen(false);
        openCustomerDetail(selectedCustomer.id);
        fetchData();
      } else {
        setFeedback({ type: 'error', message: data.error || 'Failed to log visit.' });
      }
    } catch {
      setFeedback({ type: 'error', message: 'Network error logging visit.' });
    }
  };

  const handleUpdateInquiryStatus = async (
    id: string,
    status: Consultation['status'],
    convertToCustomer: boolean = false
  ) => {
    try {
      const res = await fetch(`/api/admin/inquiries/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          convert_to_customer: convertToCustomer,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setFeedback({
          type: 'success',
          message: convertToCustomer
            ? `Inquiry booked and converted to client profile (ID: ${data.inquiry?.converted_customer_id || 'linked'}).`
            : `Inquiry status changed to ${status}.`,
        });
        fetchData();
      } else {
        setFeedback({ type: 'error', message: data.error || 'Failed to update status.' });
      }
    } catch {
      setFeedback({ type: 'error', message: 'Network error updating inquiry.' });
    }
  };

  // Filtered Customers
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      if (!c.is_active) return false;

      if (shapeFilter !== 'all') {
        const shape = c.nail_shape_preference || c.nail_shape;
        if (shape !== shapeFilter) return false;
      }

      if (allergyFilter) {
        const allergies = c.allergies_sensitivities || c.allergies;
        if (!allergies || allergies === 'None' || allergies.toLowerCase() === 'none' || allergies.trim() === '') {
          return false;
        }
      }

      if (searchQuery.trim()) {
        return matchesCustomerSearch(
          {
            full_name: c.full_name,
            name: c.name,
            phone: c.phone,
            email: c.email,
          },
          searchQuery
        );
      }

      return true;
    });
  }, [customers, shapeFilter, allergyFilter, searchQuery]);

  // Filtered Inquiries
  const filteredInquiries = useMemo(() => {
    return inquiries.filter((inq) => {
      if (inquiryStatusFilter !== 'all' && inq.status !== inquiryStatusFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        return matchesCustomerSearch(
          {
            full_name: inq.customer_name,
            phone: inq.phone,
            email: inq.email,
          },
          searchQuery
        );
      }
      return true;
    });
  }, [inquiries, inquiryStatusFilter, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-pink-400" />
            Customer Relationship Management (CRM)
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Search clients with accent-insensitive Vietnamese matching, track nail preferences, allergy safety alerts, and manage consultation triage.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => openCustomerModal()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-pink-600 hover:bg-pink-500 text-white font-medium rounded-lg text-sm transition-colors shadow-lg shadow-pink-900/30"
          >
            <Plus className="w-4 h-4" />
            Add New Client
          </button>
        </div>
      </div>

      {/* Global Feedback Banner */}
      {feedback && (
        <div
          className={`flex items-center justify-between p-4 rounded-lg border text-sm font-medium ${
            feedback.type === 'success'
              ? 'bg-emerald-950/70 border-emerald-800 text-emerald-300'
              : 'bg-rose-950/70 border-rose-800 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-400" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex gap-2 border-b border-slate-800">
        <button
          onClick={() => {
            setActiveTab('customers');
            setSearchQuery('');
          }}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'customers'
              ? 'border-pink-500 text-pink-400 bg-pink-950/20'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          Client Directory ({customers.filter((c) => c.is_active).length})
        </button>

        <button
          onClick={() => {
            setActiveTab('inquiries');
            setSearchQuery('');
          }}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'inquiries'
              ? 'border-purple-500 text-purple-400 bg-purple-950/20'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Inbox className="w-4 h-4" />
          Consultation Triage Inbox ({inquiries.filter((i) => i.status === 'new').length} New)
        </button>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              activeTab === 'customers'
                ? 'Search name (e.g. Nguyen, Giang), AU phone, email...'
                : 'Search client name, phone, email...'
            }
            className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500"
          />
        </div>

        {activeTab === 'customers' ? (
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* Shape Filter */}
            <select
              value={shapeFilter}
              onChange={(e) => setShapeFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-pink-500"
            >
              <option value="all">All Shapes</option>
              {NAIL_SHAPES.map((s) => (
                <option key={s} value={s}>
                  {s} Shape
                </option>
              ))}
            </select>

            {/* Allergy Filter Toggle */}
            <button
              onClick={() => setAllergyFilter(!allergyFilter)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                allergyFilter
                  ? 'bg-rose-950 border-rose-600 text-rose-300 shadow-sm'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
              Allergies Only
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-1.5">
            {['all', 'new', 'contacted', 'booked', 'completed', 'cancelled'].map((status) => (
              <button
                key={status}
                onClick={() => setInquiryStatusFilter(status)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold border capitalize transition-all ${
                  inquiryStatusFilter === status
                    ? 'bg-purple-950 border-purple-500 text-purple-300 shadow-sm'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main Tab 1: Customer Directory */}
      {activeTab === 'customers' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950 border-b border-slate-800 text-xs uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-5 py-3">Client Profile</th>
                  <th className="px-5 py-3">Phone & Email</th>
                  <th className="px-5 py-3">Preferences</th>
                  <th className="px-5 py-3">Allergy Alert</th>
                  <th className="px-5 py-3 text-right">Visits & Spend</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-slate-500">
                      Loading customer records...
                    </td>
                  </tr>
                ) : filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-slate-500">
                      No matching customer profiles found.
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((cust) => {
                    const allergies = cust.allergies_sensitivities || cust.allergies;
                    const hasAllergy = Boolean(
                      allergies &&
                        allergies !== 'None' &&
                        allergies.toLowerCase() !== 'none' &&
                        allergies.trim() !== ''
                    );
                    const nailShape = cust.nail_shape_preference || cust.nail_shape || 'Almond';
                    const nailLength = cust.nail_length_preference || cust.nail_length || 'Medium';

                    return (
                      <tr key={cust.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-white">
                              {cust.full_name || cust.name}
                            </span>
                            <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                              {cust.preferred_language || 'en'}
                            </span>
                          </div>
                          {cust.address && (
                            <p className="text-xs text-slate-400 mt-0.5 truncate max-w-xs">
                              {cust.address}
                            </p>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex flex-col text-xs space-y-0.5">
                            <span className="inline-flex items-center gap-1.5 text-slate-200 font-mono">
                              <Phone className="w-3 h-3 text-pink-400" />
                              {cust.phone}
                            </span>
                            {cust.email && (
                              <span className="inline-flex items-center gap-1.5 text-slate-400">
                                <Mail className="w-3 h-3 text-slate-500" />
                                {cust.email}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded text-xs bg-slate-800 text-pink-300 border border-slate-700">
                              {nailShape}
                            </span>
                            <span className="px-2 py-0.5 rounded text-xs bg-slate-800 text-purple-300 border border-slate-700">
                              {nailLength}
                            </span>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          {hasAllergy ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-950/80 text-rose-300 border border-rose-700 shadow-sm animate-pulse">
                              <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                              {allergies}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-500">None reported</span>
                          )}
                        </td>

                        <td className="px-5 py-4 text-right">
                          <div className="text-xs">
                            <span className="font-semibold text-white">
                              {cust.total_visits_count ?? cust.total_visits ?? 0} visits
                            </span>
                            <p className="text-emerald-400 font-mono">
                              ${Number(cust.total_spent_aud || (cust.total_spend_cents || 0) / 100).toFixed(2)} AUD
                            </p>
                          </div>
                        </td>

                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => openCustomerDetail(cust.id)}
                              className="p-1.5 rounded hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                              title="View History & Log Visit"
                            >
                              <Eye className="w-4 h-4 text-pink-400" />
                            </button>
                            <button
                              onClick={() => openCustomerModal(cust)}
                              className="p-1.5 rounded hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                              title="Edit Profile"
                            >
                              <Edit2 className="w-4 h-4 text-slate-400" />
                            </button>
                            <button
                              onClick={() => handleSoftDelete(cust.id, cust.full_name || cust.name || 'Client')}
                              className="p-1.5 rounded hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 transition-colors"
                              title="Soft Delete Client"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Main Tab 2: Consultation Inquiries Triage */}
      {activeTab === 'inquiries' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950 border-b border-slate-800 text-xs uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-5 py-3">Lead Contact</th>
                  <th className="px-5 py-3">Requested Timing</th>
                  <th className="px-5 py-3">Preferred Services & Notes</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Triage Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-slate-500">
                      Loading consultation inquiries...
                    </td>
                  </tr>
                ) : filteredInquiries.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-slate-500">
                      No inquiries found in this status view.
                    </td>
                  </tr>
                ) : (
                  filteredInquiries.map((inq) => {
                    const statusColors: Record<string, string> = {
                      new: 'bg-blue-950 text-blue-300 border-blue-700',
                      contacted: 'bg-amber-950 text-amber-300 border-amber-700',
                      booked: 'bg-purple-950 text-purple-300 border-purple-700',
                      completed: 'bg-emerald-950 text-emerald-300 border-emerald-700',
                      cancelled: 'bg-slate-800 text-slate-400 border-slate-700',
                    };

                    return (
                      <tr key={inq.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-white">{inq.customer_name}</span>
                            <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                              {inq.preferred_language}
                            </span>
                          </div>
                          <div className="text-xs text-slate-400 space-y-0.5 mt-1 font-mono">
                            <a
                              href={`tel:${inq.phone}`}
                              className="text-pink-400 hover:underline flex items-center gap-1"
                            >
                              <Phone className="w-3 h-3" />
                              {inq.phone}
                            </a>
                            {inq.email && <div>{inq.email}</div>}
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <div className="text-xs text-slate-300">
                            {inq.preferred_date ? (
                              <span className="inline-flex items-center gap-1 text-slate-200">
                                <Calendar className="w-3.5 h-3.5 text-purple-400" />
                                {inq.preferred_date}
                              </span>
                            ) : (
                              <span className="text-slate-500">Flexible Date</span>
                            )}
                            {inq.preferred_time && (
                              <span className="block text-slate-400 text-[11px] mt-0.5">
                                at {inq.preferred_time}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <div className="text-xs">
                            <div className="flex flex-wrap gap-1 mb-1">
                              {inq.services_requested && inq.services_requested.length > 0 ? (
                                inq.services_requested.map((srv, i) => (
                                  <span
                                    key={i}
                                    className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 text-[11px]"
                                  >
                                    {srv}
                                  </span>
                                ))
                              ) : (
                                <span className="text-slate-500">General Consultation</span>
                              )}
                            </div>
                            {inq.notes && (
                              <p className="text-slate-400 text-xs italic bg-slate-950 p-2 rounded border border-slate-800 max-w-md">
                                &quot;{inq.notes}&quot;
                              </p>
                            )}
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
                              statusColors[inq.status] || 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            {inq.status}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-right">
                          <div className="flex flex-col items-end gap-1.5">
                            {inq.status === 'new' && (
                              <button
                                onClick={() => handleUpdateInquiryStatus(inq.id, 'contacted')}
                                className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded text-xs font-medium transition-colors"
                              >
                                Mark Contacted
                              </button>
                            )}

                            {inq.status !== 'booked' && inq.status !== 'completed' && (
                              <button
                                onClick={() => handleUpdateInquiryStatus(inq.id, 'booked', true)}
                                className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded text-xs font-semibold shadow-md transition-colors"
                              >
                                <UserCheck className="w-3.5 h-3.5" />
                                Convert to Client & Book
                              </button>
                            )}

                            {inq.status === 'booked' && (
                              <button
                                onClick={() => handleUpdateInquiryStatus(inq.id, 'completed')}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-medium transition-colors"
                              >
                                Mark Completed
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Customer Create/Edit Modal */}
      {isCustomerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-slate-800">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-pink-400" />
                {editingCustomer ? 'Edit Client Profile' : 'Add New Client Profile'}
              </h2>
              <button
                onClick={() => setIsCustomerModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomer} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={customerForm.full_name}
                    onChange={(e) => setCustomerForm({ ...customerForm, full_name: e.target.value })}
                    placeholder="e.g. Nguyễn Thị Mai Lan"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-pink-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Australian Mobile *
                  </label>
                  <input
                    type="text"
                    required
                    value={customerForm.phone}
                    onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })}
                    placeholder="0412 345 678 or +61 412 345 678"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-pink-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={customerForm.email}
                    onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })}
                    placeholder="client@example.com.au"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-pink-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Preferred Language
                  </label>
                  <select
                    value={customerForm.preferred_language}
                    onChange={(e) =>
                      setCustomerForm({
                        ...customerForm,
                        preferred_language: e.target.value as 'en' | 'vi',
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-pink-500"
                  >
                    <option value="en">English (Australia)</option>
                    <option value="vi">Tiếng Việt (Vietnamese)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Address
                </label>
                <input
                  type="text"
                  value={customerForm.address}
                  onChange={(e) => setCustomerForm({ ...customerForm, address: e.target.value })}
                  placeholder="Street, Suburb, NSW 2000"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-pink-500"
                />
              </div>

              {/* Nail Preferences */}
              <div className="border-t border-slate-800 pt-4 space-y-4">
                <h3 className="text-sm font-bold text-pink-400 uppercase tracking-wide flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" />
                  Nail Preferences & Style
                </h3>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-2">
                    Nail Shape
                  </label>
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                    {NAIL_SHAPES.map((shape) => (
                      <button
                        type="button"
                        key={shape}
                        onClick={() =>
                          setCustomerForm({ ...customerForm, nail_shape_preference: shape })
                        }
                        className={`py-2 px-3 text-xs font-semibold rounded-lg border text-center transition-all ${
                          customerForm.nail_shape_preference === shape
                            ? 'bg-pink-950 border-pink-500 text-pink-300 shadow-md'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {shape}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-2">
                    Nail Length
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {NAIL_LENGTHS.map((len) => (
                      <button
                        type="button"
                        key={len}
                        onClick={() =>
                          setCustomerForm({ ...customerForm, nail_length_preference: len })
                        }
                        className={`py-2 px-3 text-xs font-semibold rounded-lg border text-center transition-all ${
                          customerForm.nail_length_preference === len
                            ? 'bg-purple-950 border-purple-500 text-purple-300 shadow-md'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {len}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-2">
                    Preferred Products & Services
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {PRODUCT_OPTIONS.map((prod) => {
                      const isSelected = customerForm.preferred_services.includes(prod);
                      return (
                        <button
                          type="button"
                          key={prod}
                          onClick={() => {
                            const next = isSelected
                              ? customerForm.preferred_services.filter((p) => p !== prod)
                              : [...customerForm.preferred_services, prod];
                            setCustomerForm({ ...customerForm, preferred_services: next });
                          }}
                          className={`py-2 px-3 text-xs font-medium rounded-lg border text-left transition-all ${
                            isSelected
                              ? 'bg-pink-950/60 border-pink-500 text-pink-200'
                              : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          {isSelected ? '✓ ' : '+ '}
                          {prod}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Allergy Alerts & Sensitivities */}
              <div className="border-t border-slate-800 pt-4 space-y-3">
                <h3 className="text-sm font-bold text-rose-400 uppercase tracking-wide flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-rose-400" />
                  Allergy & Chemical Sensitivity Warning
                </h3>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-2">
                    Quick Preset Allergens
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {COMMON_ALLERGENS.map((allergen) => {
                      const isPresent = customerForm.allergies_sensitivities?.includes(allergen);
                      return (
                        <button
                          type="button"
                          key={allergen}
                          onClick={() => {
                            const cur = customerForm.allergies_sensitivities || '';
                            let next = '';
                            if (isPresent) {
                              next = cur
                                .replace(allergen, '')
                                .replace(/,\s*,/g, ',')
                                .trim();
                            } else {
                              next = cur ? `${cur}, ${allergen}` : allergen;
                            }
                            setCustomerForm({ ...customerForm, allergies_sensitivities: next });
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                            isPresent
                              ? 'bg-rose-950 border-rose-500 text-rose-300'
                              : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          {isPresent ? '⚠ ' : '+ '}
                          {allergen}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Specific Allergy / Sensitivity Details
                  </label>
                  <textarea
                    rows={2}
                    value={customerForm.allergies_sensitivities}
                    onChange={(e) =>
                      setCustomerForm({
                        ...customerForm,
                        allergies_sensitivities: e.target.value,
                      })
                    }
                    placeholder="e.g. Severe Acetone soak-off sensitivity, mild latex reaction. Nitrile gloves required."
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Technician Notes
                  </label>
                  <textarea
                    rows={2}
                    value={customerForm.general_notes}
                    onChange={(e) =>
                      setCustomerForm({ ...customerForm, general_notes: e.target.value })
                    }
                    placeholder="General client preferences, tea choices, cuticle sensitivity..."
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-pink-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCustomerModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-pink-600 hover:bg-pink-500 text-white font-medium rounded-lg text-sm transition-colors shadow-lg shadow-pink-900/30"
                >
                  {editingCustomer ? 'Save Changes' : 'Create Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Customer Detail Drawer */}
      {isDetailDrawerOpen && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/75 backdrop-blur-sm">
          <div className="bg-slate-900 border-l border-slate-800 w-full max-w-xl h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-6 border-b border-slate-800 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-white">
                    {selectedCustomer.full_name || selectedCustomer.name}
                  </h2>
                  <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                    {selectedCustomer.preferred_language || 'en'}
                  </span>
                </div>
                <div className="text-xs text-slate-400 mt-1 space-y-0.5">
                  <p className="font-mono text-pink-400">{selectedCustomer.phone}</p>
                  {selectedCustomer.email && <p>{selectedCustomer.email}</p>}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setIsDetailDrawerOpen(false);
                    openCustomerModal(selectedCustomer);
                  }}
                  className="p-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
                  title="Edit Profile"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsDetailDrawerOpen(false)}
                  className="p-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Prominent High-Contrast Allergy Warning Banner */}
            {(selectedCustomer.allergies_sensitivities || selectedCustomer.allergies) && (
              <div className="m-6 p-4 rounded-xl bg-rose-950/90 border border-rose-600 shadow-lg text-rose-200 flex items-start gap-3">
                <AlertTriangle className="w-6 h-6 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-rose-300 text-sm uppercase tracking-wide">
                    Client Allergy Safety Alert
                  </h4>
                  <p className="text-xs mt-1 leading-relaxed">
                    {selectedCustomer.allergies_sensitivities || selectedCustomer.allergies}
                  </p>
                </div>
              </div>
            )}

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto px-6 space-y-6 pb-6">
              {/* Preferences Card */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Nail Profile & Preferences
                </h4>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500">Shape Preference:</span>
                    <p className="font-semibold text-pink-400">
                      {selectedCustomer.nail_shape_preference || selectedCustomer.nail_shape || 'Almond'}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-500">Length:</span>
                    <p className="font-semibold text-purple-400">
                      {selectedCustomer.nail_length_preference || selectedCustomer.nail_length || 'Medium'}
                    </p>
                  </div>
                </div>

                {selectedCustomer.preferred_services && selectedCustomer.preferred_services.length > 0 && (
                  <div>
                    <span className="text-slate-500 text-xs block mb-1">Preferred Services:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedCustomer.preferred_services.map((srv, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300 text-xs"
                        >
                          {srv}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {selectedCustomer.general_notes && (
                  <div>
                    <span className="text-slate-500 text-xs block mb-1">Notes:</span>
                    <p className="text-xs text-slate-300 bg-slate-900 p-2.5 rounded border border-slate-800">
                      {selectedCustomer.general_notes || selectedCustomer.notes}
                    </p>
                  </div>
                )}
              </div>

              {/* Service Visit History */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-pink-400" />
                    Visit History ({selectedCustomer.visits?.length || 0})
                  </h4>
                  <button
                    onClick={() => setIsLogVisitModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-pink-600 hover:bg-pink-500 text-white text-xs font-semibold rounded-lg transition-colors shadow-md"
                  >
                    <Plus className="w-3 h-3" />
                    Log Visit
                  </button>
                </div>

                {(!selectedCustomer.visits || selectedCustomer.visits.length === 0) ? (
                  <div className="p-6 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
                    No service visits recorded yet. Click &quot;+ Log Visit&quot; to log the first treatment.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedCustomer.visits.map((vis) => (
                      <div
                        key={vis.id}
                        className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-white">
                              {vis.services_rendered?.[0]?.name || 'Salon Treatment'}
                            </span>
                            <span className="text-[10px] font-mono text-slate-500 uppercase px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800">
                              {vis.payment_method || 'EFTPOS'}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400 block mt-0.5">
                            {vis.visit_date?.slice(0, 10)}
                          </span>
                        </div>

                        <div className="text-right">
                          <span className="text-xs font-bold text-emerald-400 font-mono">
                            ${Number(vis.total_paid_aud || (vis.total_amount_cents || 0) / 100).toFixed(2)} AUD
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Log Visit Modal */}
      {isLogVisitModalOpen && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-slate-800">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                Log Completed Treatment Visit
              </h2>
              <button
                onClick={() => setIsLogVisitModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleLogVisit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
                  Client
                </label>
                <div className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200">
                  {selectedCustomer.full_name || selectedCustomer.name}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
                  Technician
                </label>
                <select
                  value={visitForm.staff_id}
                  onChange={(e) => setVisitForm({ ...visitForm, staff_id: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-pink-500"
                >
                  {staffList.map((stf) => (
                    <option key={stf.id} value={stf.id}>
                      {stf.name || stf.full_name} ({stf.role})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
                  Service Name
                </label>
                <input
                  type="text"
                  required
                  value={visitForm.service_name}
                  onChange={(e) => setVisitForm({ ...visitForm, service_name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-pink-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
                    Price (AUD)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={visitForm.price_aud}
                    onChange={(e) => setVisitForm({ ...visitForm, price_aud: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-pink-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
                    Tip (AUD)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={visitForm.tip_aud}
                    onChange={(e) => setVisitForm({ ...visitForm, tip_aud: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-pink-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
                  Payment Method
                </label>
                <select
                  value={visitForm.payment_method}
                  onChange={(e) => setVisitForm({ ...visitForm, payment_method: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-white focus:outline-none focus:border-pink-500"
                >
                  <option value="EFTPOS">EFTPOS</option>
                  <option value="Card">Credit Card</option>
                  <option value="Cash">Cash</option>
                  <option value="Afterpay">Afterpay</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsLogVisitModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg text-sm shadow-md"
                >
                  Confirm & Sync Revenue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
