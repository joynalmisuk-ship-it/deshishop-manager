import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  LayoutDashboard, 
  Smartphone, 
  SmartphoneNfc, 
  Copy, 
  History, 
  PlusCircle, 
  TrendingUp, 
  Wallet,
  Search,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCcw,
  Package,
  Printer,
  Download,
  Calendar,
  Filter,
  X,
  CheckCircle2,
  AlertCircle,
  Users,
  Edit,
  Trash2,
  FileText,
  Database as DatabaseIcon,
  LogIn,
  Image as ImageIcon,
  Store,
  CheckCircle,
  XCircle,
  Lock,
  Shield,
  CreditCard as CreditCardIcon,
  Eye,
  EyeOff,
  LifeBuoy,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  LineChart, 
  Line,
  AreaChart,
  Area
} from 'recharts';
import { Login } from './components/Login';
import Register from './components/Register';
import { Home } from './components/Home';
import { HeroSliderManagement } from './components/HeroSliderManagement';
import { AIAssistant } from './components/AIAssistant';
import { translations, Language } from './translations';
import { io } from 'socket.io-client';

// --- Types ---
interface User {
  id: number;
  username: string;
  role: 'admin' | 'shop_owner' | 'manager' | 'staff';
  name: string;
  created_at?: string;
  shop_id?: number;
}

interface Shop {
  id: number;
  name: string;
  address?: string;
  phone?: string;
  logo_url?: string;
  status: 'Pending' | 'Approved' | 'Suspended';
  plan: string;
  expiry_date?: string;
}

interface Order {
  id: number;
  customer_name: string;
  customer_phone: string;
  description: string;
  amount: number;
  status: 'Pending' | 'Completed' | 'Cancelled';
  timestamp: string;
}

interface Analytics {
  mfs: { total: number; profit: number };
  recharge: { total: number; profit: number };
  services: { total: number; pages: number };
  expenses: { total: number };
  inventory: number;
  mfsBalances: { [key: string]: number };
  rechargeBalances: { [key: string]: number };
  totalMfsBalance: number;
  totalRechargeBalance: number;
  cashInHand: number;
  totalBalance: number;
  totalProfit: number;
  totalCustomerDue: number;
  totalShops?: number;
}

interface SupportTicket {
  id: number;
  shop_id: number;
  user_id: number;
  subject: string;
  message: string;
  status: 'Open' | 'Resolved' | 'Closed';
  admin_reply?: string;
  created_at: string;
  updated_at: string;
  shop_name?: string;
  user_name?: string;
}

interface Vendor {
  id: number;
  name: string;
  phone: string;
  details: string;
  balance: number;
}

interface VendorTransaction {
  id: number;
  vendor_id: number;
  type: string;
  amount: number;
  description: string;
  timestamp: string;
}

interface Customer {
  id: number;
  name: string;
  phone: string;
  address: string;
  balance: number;
}

interface CustomerTransaction {
  id: number;
  customer_id: number;
  type: string;
  amount: number;
  description: string;
  timestamp: string;
}

interface InventoryItem {
  id: number;
  item_name: string;
  quantity: number;
  min_stock: number;
  unit: string;
  purchase_price: number;
  last_updated: string;
}

interface StockHistory {
  id: number;
  inventory_id: number;
  type: 'Add' | 'Remove';
  quantity: number;
  description: string;
  timestamp: string;
}

interface Transaction {
  id: number;
  operator: string;
  type?: string;
  amount: number;
  commission?: number;
  profit?: number;
  customer_phone: string;
  trx_id?: string;
  timestamp: string;
  service_type?: string;
  variant?: string;
  pages?: number;
  price?: number;
  shop_number_id?: number;
  paid_amount?: number;
  due_amount?: number;
  payment_status?: string;
  source?: string;
  cashback?: number;
}

// --- Components ---

const Card = ({ children, className = "", ...props }: { children: React.ReactNode; className?: string; [key: string]: any }) => (
  <div className={`bg-white rounded-2xl shadow-sm border border-slate-100 ${className.includes('p-') ? '' : 'p-6'} ${className}`} {...props}>
    {children}
  </div>
);

const StatCard = ({ title, value, icon: Icon, color }: { title: string; value: string | number; icon: any; color: string }) => (
  <Card className="flex items-center gap-3 p-4">
    <div className={`p-2 rounded-xl flex-shrink-0 ${color}`}>
      <Icon className="w-5 h-5 text-white" />
    </div>
    <div className="min-w-0">
      <p className="text-[10px] font-bold text-slate-400 uppercase truncate">{title}</p>
      <h3 className="text-lg font-black text-slate-900 truncate">{value}</h3>
    </div>
  </Card>
);

const UserManagementSection = ({ token, shops, fetchWithAuth, currentUser, currentShop, t, formatDate }: { token: string; shops: Shop[]; fetchWithAuth: any; currentUser: User | null; currentShop: Shop | null; t: any; formatDate: any }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [role, setRole] = useState<'admin' | 'shop_owner' | 'manager' | 'staff'>('staff');
  const [shopId, setShopId] = useState<number>(currentShop?.id || shops[0]?.id || 1);
  const [loading, setLoading] = useState(false);

  const fetchUsers = async () => {
    try {
      const res = await fetchWithAuth('/api/users');
      if (res.ok) {
        setUsers(await res.json());
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [currentShop]); // Re-fetch users if the active shop changes

  useEffect(() => {
    if (currentShop) setShopId(currentShop.id);
  }, [currentShop]);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetchWithAuth('/api/users', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password, name, role, shop_id: shopId })
      });
      
      if (res.ok) {
        setUsername('');
        setPassword('');
        setName('');
        setRole('staff');
        fetchUsers();
        alert('User added successfully');
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to add user');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const [deletingUser, setDeletingUser] = useState<User | null>(null);

  const confirmDeleteUser = async () => {
    if (!deletingUser) return;
    try {
      const res = await fetchWithAuth(`/api/users/${deletingUser.id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchUsers();
        setDeletingUser(null);
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete user');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const [resettingUser, setResettingUser] = useState<User | null>(null);
  const [newPasswordValue, setNewPasswordValue] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  const handleResetPasswordAction = async () => {
    if (!resettingUser || !newPasswordValue) return;
    
    try {
      const res = await fetchWithAuth(`/api/users/${resettingUser.id}/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPasswordValue })
      });
      if (res.ok) {
        alert('Password reset successfully');
        setResettingUser(null);
        setNewPasswordValue('');
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to reset password');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAssignShop = async (user: User) => {
    const shopList = shops.map(s => `${s.id}: ${s.name}`).join('\n');
    const newShopIdStr = prompt(`Enter Shop ID to assign to ${user.name}:\n${shopList}`, user.shop_id?.toString());
    if (!newShopIdStr) return;
    
    const newShopId = parseInt(newShopIdStr);
    if (!shops.find(s => s.id === newShopId)) {
      alert('Invalid Shop ID');
      return;
    }

    try {
      const res = await fetchWithAuth(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shop_id: newShopId })
      });
      if (res.ok) {
        fetchUsers();
        alert('Shop assigned successfully');
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to assign shop');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Determine which roles the current user can assign
  const getAvailableRoles = () => {
    if (currentUser?.role === 'admin') return ['admin', 'shop_owner', 'manager', 'staff'];
    if (currentUser?.role === 'shop_owner') return ['manager', 'staff'];
    if (currentUser?.role === 'manager') return ['staff'];
    return [];
  };

  const availableRoles = getAvailableRoles();

  return (
    <div className="space-y-6">
      <Card>
        <h3 className="text-lg font-bold text-slate-800 mb-4">Add New Staff/User</h3>
        <form onSubmit={handleAddUser} className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-2 border border-slate-200 rounded-lg"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full p-2 border border-slate-200 rounded-lg"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-2 pr-10 border border-slate-200 rounded-lg"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as any)}
              className="w-full p-2 border border-slate-200 rounded-lg"
            >
              {availableRoles.map(r => (
                <option key={r} value={r}>{r.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Assign Shop</label>
            <select
              value={shopId}
              onChange={(e) => setShopId(parseInt(e.target.value))}
              className="w-full p-2 border border-slate-200 rounded-lg"
              disabled={currentUser?.role !== 'admin' && !(currentUser?.role === 'shop_owner' && currentShop?.plan === 'Premium')}
            >
              {shops.map(shop => (
                <option key={shop.id} value={shop.id}>{shop.name}</option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={loading || availableRoles.length === 0}
            className="bg-emerald-600 text-white py-2 px-4 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'Adding...' : 'Add User'}
          </button>
        </form>
      </Card>

      <Card>
        <h3 className="text-lg font-bold text-slate-800 mb-4">Existing Users</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-sm font-semibold text-slate-600">Name</th>
                <th className="px-6 py-3 text-sm font-semibold text-slate-600">Username</th>
                <th className="px-6 py-3 text-sm font-semibold text-slate-600">Role</th>
                <th className="px-6 py-3 text-sm font-semibold text-slate-600">Shop</th>
                <th className="px-6 py-3 text-sm font-semibold text-slate-600">Created At</th>
                <th className="px-6 py-3 text-sm font-semibold text-slate-600">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.length > 0 ? users.map((user) => (
                <tr key={`user-${user.id}`} className="hover:bg-slate-50">
                  <td className="px-6 py-3 text-sm font-medium text-slate-900">{user.name}</td>
                  <td className="px-6 py-3 text-sm text-slate-600">{user.username}</td>
                  <td className="px-6 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${
                      user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 
                      user.role === 'shop_owner' ? 'bg-amber-100 text-amber-700' :
                      user.role === 'manager' ? 'bg-indigo-100 text-indigo-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {user.role.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-sm text-slate-600">
                    {shops.find(s => s.id === user.shop_id)?.name || 'Unknown'}
                  </td>
                  <td className="px-6 py-3 text-sm text-slate-500">{formatDate(user.created_at, true)}</td>
                  <td className="px-6 py-3">
                    <div className="flex gap-2">
                      {(currentUser?.role === 'admin' || (currentUser?.role === 'shop_owner' && user.role !== 'admin' && user.role !== 'shop_owner')) && (
                        <>
                          <button
                            onClick={() => handleAssignShop(user)}
                            className="text-indigo-600 hover:text-indigo-800 p-1 hover:bg-indigo-50 rounded"
                            title="Assign Shop"
                          >
                            <Store className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setResettingUser(user)}
                            className="text-amber-600 hover:text-amber-800 p-1 hover:bg-amber-50 rounded"
                            title="Reset Password"
                          >
                            <Lock className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeletingUser(user)}
                            className="text-red-600 hover:text-red-800 p-1 hover:bg-red-50 rounded"
                            title="Delete User"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                     <div className="flex flex-col items-center gap-2">
                       <Search className="w-8 h-8 text-slate-300" />
                       {t.noDataFound}
                     </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Password Reset Modal */}
      {resettingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
          <Card className="max-w-md w-full relative">
            <button 
              onClick={() => {
                setResettingUser(null);
                setNewPasswordValue('');
              }}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Reset Password</h3>
            <p className="text-slate-500 mb-6 font-medium">Resetting password for: <span className="text-emerald-600">{resettingUser.name}</span></p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">{t.password}</label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={newPasswordValue}
                    onChange={(e) => setNewPasswordValue(e.target.value)}
                    className="w-full p-2 pr-10 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                    placeholder="Enter new password"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-600 transition-colors"
                  >
                    {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setResettingUser(null);
                    setNewPasswordValue('');
                  }}
                  className="flex-1 py-3 px-4 border border-slate-200 rounded-xl text-slate-600 font-bold hover:bg-slate-50 transition-all"
                >
                  {t.cancel}
                </button>
                <button
                  onClick={handleResetPasswordAction}
                  disabled={!newPasswordValue}
                  className="flex-1 py-3 px-4 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition-all disabled:opacity-50"
                >
                  {t.save}
                </button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
          <Card className="max-w-md w-full relative">
            <button 
              onClick={() => setDeletingUser(null)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex flex-col items-center text-center p-4">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <Trash2 className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">{t.confirmDelete}</h3>
              <p className="text-slate-500 mb-6 font-medium">
                {t.areYouSure}<br />
                User: <span className="text-red-600 font-bold">{deletingUser.name}</span>
              </p>
              
              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setDeletingUser(null)}
                  className="flex-1 py-3 px-4 border border-slate-200 rounded-xl text-slate-600 font-bold hover:bg-slate-50 transition-all"
                >
                  {t.cancel}
                </button>
                <button
                  onClick={confirmDeleteUser}
                  className="flex-1 py-3 px-4 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 shadow-lg shadow-red-200 transition-all font-bold"
                >
                  {t.delete}
                </button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

const ShopRequestsSection = ({ fetchWithAuth, currentUser, shops, t, formatDate }: { fetchWithAuth: any; currentUser: User | null; shops: Shop[]; t: any; formatDate: any }) => {
  const [requests, setRequests] = useState<any[]>([]);
  const [requestType, setRequestType] = useState<'new_shop' | 'upgrade'>('new_shop');
  const [shopId, setShopId] = useState<number | ''>('');
  const [shopName, setShopName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedPlan, setSelectedPlan] = useState('Standard');
  const [loading, setLoading] = useState(false);

  const fetchRequests = async () => {
    try {
      const res = await fetchWithAuth('/api/shop-requests');
      if (res.ok) {
        setRequests(await res.json());
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetchWithAuth('/api/shop-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          shop_name: requestType === 'new_shop' ? shopName : (shops.find(s => s.id === shopId)?.name || ''), 
          address, 
          phone,
          shop_id: requestType === 'upgrade' ? shopId : undefined,
          plan: requestType === 'upgrade' ? selectedPlan : 'Free Trial'
        })
      });
      if (res.ok) {
        setShopName('');
        setAddress('');
        setPhone('');
        setShopId('');
        fetchRequests();
        alert('Shop request submitted successfully');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id: number, status: string) => {
    try {
      const res = await fetchWithAuth(`/api/shop-requests/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        fetchRequests();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {currentUser?.role === 'shop_owner' && (
        <Card>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-slate-800">{t.shopRequests}</h3>
            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button 
                onClick={() => setRequestType('new_shop')}
                className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${requestType === 'new_shop' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                {t.newShop}
              </button>
              <button 
                onClick={() => setRequestType('upgrade')}
                className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${requestType === 'upgrade' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                {t.upgradePackage}
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmitRequest} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            {requestType === 'new_shop' ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t.name}</label>
                  <input
                    type="text"
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t.address}</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t.phone}</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg"
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t.selectShop}</label>
                  <select
                    value={shopId}
                    onChange={(e) => setShopId(parseInt(e.target.value))}
                    className="w-full p-2 border border-slate-200 rounded-lg"
                    required
                  >
                    <option value="">{t.selectShop}</option>
                    {shops.filter(s => s.status === 'Approved').map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.plan})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t.selectPlan}</label>
                  <select
                    value={selectedPlan}
                    onChange={(e) => setSelectedPlan(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg"
                    required
                  >
                    <option value="Standard">{t.standard}</option>
                    <option value="Premium">{t.premium}</option>
                  </select>
                </div>
                <div className="md:col-span-1"></div>
              </>
            )}
            <button
              type="submit"
              disabled={loading || (requestType === 'upgrade' && !shopId)}
              className="bg-emerald-600 text-white py-2 px-4 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
            >
              {loading ? t.pending : t.save}
            </button>
          </form>
        </Card>
      )}

      <Card>
        <h3 className="text-lg font-bold text-slate-800 mb-4">
          {currentUser?.role === 'admin' ? 'All Shop Requests' : 'My Shop Requests'}
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {currentUser?.role === 'admin' && <th className="px-6 py-3 text-sm font-semibold text-slate-600">Requester</th>}
                <th className="px-6 py-3 text-sm font-semibold text-slate-600">Shop Name</th>
                <th className="px-6 py-3 text-sm font-semibold text-slate-600">Address</th>
                <th className="px-6 py-3 text-sm font-semibold text-slate-600">Phone</th>
                <th className="px-6 py-3 text-sm font-semibold text-slate-600">Plan</th>
                <th className="px-6 py-3 text-sm font-semibold text-slate-600">Status</th>
                <th className="px-6 py-3 text-sm font-semibold text-slate-600">Date</th>
                {currentUser?.role === 'admin' && <th className="px-6 py-3 text-sm font-semibold text-slate-600">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {requests.length > 0 ? requests.map((req) => (
                <tr key={`req-${req.id}`} className="hover:bg-slate-50">
                  {currentUser?.role === 'admin' && <td className="px-6 py-3 text-sm text-slate-900">{req.requester_name}</td>}
                  <td className="px-6 py-3 text-sm text-slate-900 font-medium">{req.shop_name}</td>
                  <td className="px-6 py-3 text-sm text-slate-600">{req.address}</td>
                  <td className="px-6 py-3 text-sm text-slate-600">{req.phone}</td>
                  <td className="px-6 py-3 text-sm text-slate-600">{req.plan || 'Free Trial'}</td>
                  <td className="px-6 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${
                      req.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' :
                      req.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {req.status}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-sm text-slate-600">
                    {formatDate(req.created_at, true)}
                  </td>
                  {currentUser?.role === 'admin' && req.status === 'Pending' && (
                    <td className="px-6 py-3 flex gap-2">
                      <button
                        onClick={() => handleUpdateStatus(req.id, 'Approved')}
                        className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                        title="Approve"
                      >
                        <CheckCircle className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(req.id, 'Rejected')}
                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                        title="Reject"
                      >
                        <XCircle className="w-5 h-5" />
                      </button>
                    </td>
                  )}
                </tr>
              )) : (
                <tr>
                  <td colSpan={currentUser?.role === 'admin' ? 8 : 7} className="px-6 py-12 text-center text-slate-500">
                     <div className="flex flex-col items-center gap-2">
                       <Search className="w-8 h-8 text-slate-300" />
                       {t.noDataFound}
                     </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'mfs' | 'recharge' | 'services' | 'other' | 'expenses' | 'vendors' | 'customers' | 'history' | 'inventory' | 'settings' | 'users' | 'hero-slider' | 'shop-requests'>('dashboard');
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [mfsBalances, setMfsBalances] = useState<{ [key: string]: number }>({});
  const [rechargeBalances, setRechargeBalances] = useState<{ [key: string]: number }>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [dateRange, setDateRange] = useState('all');
  const [customRange, setCustomRange] = useState({ start: '', end: '' });
  const [selectedInvoice, setSelectedInvoice] = useState<Transaction | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [shops, setShops] = useState<Shop[]>([]);
  const [currentShop, setCurrentShop] = useState<Shop | null>(null);
  const [activeShopId, setActiveShopId] = useState<number | null>(null);
  const [view, setView] = useState<'home' | 'login' | 'register' | 'app'>('home');
  const [showDailyReport, setShowDailyReport] = useState(false);
  const [lang, setLang] = useState<Language>((localStorage.getItem('lang') as Language) || 'bn');
  const [refreshKey, setRefreshKey] = useState(0);
  const [timezoneOffset, setTimezoneOffset] = useState('6');

  const t = translations[lang];

  const toggleLang = () => {
    const newLang = lang === 'en' ? 'bn' : 'en';
    setLang(newLang);
    localStorage.setItem('lang', newLang);
  };

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const storedShopId = localStorage.getItem('activeShopId');
    if (token && storedUser) {
      try {
        const user = JSON.parse(storedUser);
        setCurrentUser(user);
        setActiveShopId(storedShopId ? parseInt(storedShopId) : user.shop_id || 1);
        setView('app');
      } catch (err) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('activeShopId');
        setToken(null);
        setCurrentUser(null);
        setActiveShopId(null);
        setView('home');
      }
    }
  }, [token]);

  const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
    const headers: any = {
      ...options.headers,
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    if (activeShopId) {
      headers['x-shop-id'] = activeShopId.toString();
    }
    
    try {
      const response = await fetch(url, { ...options, headers });
      if (response.status === 401 && token) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('activeShopId');
        setToken(null);
        setCurrentUser(null);
        setActiveShopId(null);
        setView('login');
      }
      
      // Check if the response is JSON
      const contentType = response.headers.get('content-type');
      if (contentType && !contentType.includes('application/json')) {
        // If it's not JSON, it might be an HTML error page
        if (contentType.includes('text/html')) {
          const text = await response.text();
          // Log the first bit of HTML to help debugging
          console.error(`Expected JSON but got HTML. Status: ${response.status}. Preview: ${text.substring(0, 100)}`);
          throw new Error(`Server returned HTML instead of JSON (Status ${response.status}). This usually means the API route is missing or there is a server error.`);
        }
      }
      
      return response;
    } catch (error: any) {
      console.error(`Fetch error for ${url}:`, error);
      throw error;
    }
  };

  const handleTransactionComplete = (tx: Transaction) => {
    fetchAnalytics();
    fetchTransactions();
    setSelectedInvoice(tx);
    setRefreshKey(prev => prev + 1);
  };

  const fetchShops = async () => {
    try {
      const res = await fetchWithAuth('/api/shops');
      if (res.ok) {
        const data = await res.json();
        setShops(data);
        const activeId = activeShopId || (currentUser?.shop_id || 1);
        const shop = data.find((s: any) => s.id === activeId);
        setCurrentShop(shop || null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (view === 'app') {
      fetchShops();
    }
  }, [currentUser, view, activeShopId]);

  const handleLogin = (newToken: string, user: User) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(user));
    const initialShopId = user.shop_id || 1;
    localStorage.setItem('activeShopId', initialShopId.toString());
    setToken(newToken);
    setCurrentUser(user);
    setActiveShopId(initialShopId);
    setView('app');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('activeShopId');
    setToken(null);
    setCurrentUser(null);
    setActiveShopId(null);
    setView('home');
  };

  const fetchAnalytics = async () => {
    try {
      const [analyticsRes, mfsRes, rechargeRes, settingsRes] = await Promise.all([
        fetchWithAuth('/api/analytics'),
        fetchWithAuth('/api/mfs/balances'),
        fetchWithAuth('/api/recharge/balances'),
        fetchWithAuth('/api/settings')
      ]);
      
      if (analyticsRes.ok) {
        const data = await analyticsRes.json();
        setAnalytics(data);
      }
      
      if (mfsRes.ok) {
        const mfsData = await mfsRes.json();
        setMfsBalances(mfsData);
      }

      if (rechargeRes.ok) {
        const rechargeData = await rechargeRes.json();
        setRechargeBalances(rechargeData);
      }

      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        const tz = settingsData.find((s: any) => s.key === 'timezone_offset')?.value;
        if (tz) setTimezoneOffset(tz);
      }
    } catch (err) {
      console.error("Failed to fetch data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (view === 'app' && token) {
      fetchAnalytics();
    } else {
      setLoading(false);
    }
  }, [view, token, activeShopId]);

  const [mfsInitialType, setMfsInitialType] = useState<string>('Cash-in');
  const [scale, setScale] = useState(1);

  useEffect(() => {
    if (currentUser?.role === 'admin' && view === 'app') {
      fetchShops();
    }
  }, [currentUser, view]);

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const baseWidth = 1280; // Target desktop width
      if (width < baseWidth) {
        const s = width / baseWidth;
        document.body.style.zoom = s.toString();
        document.body.style.minWidth = "1280px";
      } else {
        document.body.style.zoom = "1";
        document.body.style.minWidth = "auto";
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      document.body.style.zoom = "1";
      document.body.style.minWidth = "auto";
    };
  }, []);

  const handleTabChange = (tab: any, initialType?: string) => {
    setActiveTab(tab);
    if (initialType) setMfsInitialType(initialType);
    if (tab === 'history') fetchTransactions();
  };

  const formatDate = (timestamp: string | null | undefined, dateOnly: boolean = false) => {
    if (!timestamp) return '-';
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return '-';
      const offset = parseFloat(timezoneOffset) || 0;
      const utcTime = date.getTime();
      const localTime = new Date(utcTime + (offset * 3600000));
      
      return localTime.toLocaleString('en-US', {
        timeZone: 'UTC',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: dateOnly ? undefined : '2-digit',
        minute: dateOnly ? undefined : '2-digit',
        second: dateOnly ? undefined : '2-digit',
        hour12: true
      });
    } catch (e) {
      return '-';
    }
  };

  const fetchTransactions = async (query = searchQuery, range = dateRange, custom = customRange) => {
    try {
      let url = `/api/history?search=${query}`;
      
      let startDate = '';
      let endDate = '';
      const now = new Date();

      if (range === 'daily') {
        const d = new Date();
        d.setHours(0,0,0,0);
        startDate = d.toISOString();
      } else if (range === 'weekly') {
        const d = new Date();
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
        const monday = new Date(d.setDate(diff));
        monday.setHours(0,0,0,0);
        startDate = monday.toISOString();
      } else if (range === 'monthly') {
        const d = new Date();
        const firstDay = new Date(d.getFullYear(), d.getMonth(), 1);
        startDate = firstDay.toISOString();
      } else if (range === 'yearly') {
        const d = new Date();
        const firstDay = new Date(d.getFullYear(), 0, 1);
        startDate = firstDay.toISOString();
      } else if (range === 'custom' && custom.start && custom.end) {
        startDate = new Date(custom.start).toISOString();
        const end = new Date(custom.end);
        end.setHours(23,59,59,999);
        endDate = end.toISOString();
      }

      if (startDate) url += `&startDate=${startDate}`;
      if (endDate) url += `&endDate=${endDate}`;

      const res = await fetchWithAuth(url);
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) throw new Error("Received non-JSON response");
      const data = await res.json();
      setTransactions(data);
    } catch (err) {
      console.error("Failed to fetch transactions:", err);
    }
  };

  const handleAddStock = async () => {
    const rims = prompt("How many rims to add? (1 rim = 500 pages)");
    if (!rims || isNaN(parseInt(rims))) return;
    
    const pages = parseInt(rims) * 500;
    try {
      await fetchWithAuth('/api/inventory/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: pages })
      });
      fetchAnalytics();
      alert(`Added ${rims} rims (${pages} pages) to stock.`);
    } catch (err) {
      console.error(err);
    }
  };

  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [paymentId, setPaymentId] = useState<number | null>(null);

  useEffect(() => {
    if (view === 'app' && activeShopId) {
      const socketBase = import.meta.env.BASE_URL.replace(/\/$/, '');
      const socket = io({
        path: `${socketBase}/socket.io`,
        transports: ['websocket', 'polling']
      });

      socket.on('connect', () => {
        console.log('Connected to socket server');
        socket.emit('join_shop', activeShopId);
      });

      socket.on('new_history_entry', (entry: Transaction) => {
        console.log('New history entry received:', entry);
        setTransactions(prev => {
          if (prev.some(t => t.id === entry.id && t.source === entry.source)) return prev;
          return [entry, ...prev].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 300);
        });
        fetchAnalytics(); 
        setRefreshKey(prev => prev + 1);
      });

      socket.on('history_entry_deleted', ({ id, source }) => {
        console.log('History entry deleted:', id, source);
        setTransactions(prev => prev.filter(t => !(t.id === parseInt(id) && t.source === source)));
        fetchAnalytics();
        setRefreshKey(prev => prev + 1);
      });

      return () => {
        socket.disconnect();
      };
    }
  }, [view, activeShopId]);

  if (view === 'home') {
    return (
      <Home 
        onLoginClick={() => setView('login')} 
        onRegisterClick={(plan, pid) => {
          setSelectedPlan(plan || 'Free Trial');
          setPaymentId(pid || null);
          setView('register');
        }}
        lang={lang}
        onLangToggle={toggleLang}
      />
    );
  }

  if (view === 'register') {
    return (
      <Register 
        onBack={() => setView('login')} 
        plan={selectedPlan || 'Free Trial'}
        paymentId={paymentId || undefined}
        onSuccess={() => {
          setView('login');
        }}
        lang={lang}
      />
    );
  }

  if (view === 'login' || !currentUser) {
    return (
      <Login 
        onLogin={handleLogin} 
        onBack={() => setView('home')} 
        onRegister={() => setView('register')}
        lang={lang}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pl-64">
      {/* Sidebar - Desktop */}
      <aside className="flex flex-col fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-slate-200 p-6 overflow-y-auto">
        <div className="flex items-center justify-between mb-10 px-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center overflow-hidden">
              {currentShop?.logo_url ? (
                <img 
                  src={currentShop.logo_url} 
                  alt="Logo" 
                  className="w-full h-full object-contain bg-white"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <LayoutDashboard className="text-white w-6 h-6" />
              )}
            </div>
            <h1 className="text-xl font-bold tracking-tight truncate">{currentShop?.name || 'DeshiShop Manager'}</h1>
          </div>
          <button 
            onClick={toggleLang}
            className="px-2 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-200 transition-all"
          >
            {lang === 'en' ? 'BN' : 'EN'}
          </button>
        </div>

        <nav className="space-y-2 flex-1">
          <NavItem active={activeTab === 'dashboard'} onClick={() => handleTabChange('dashboard')} icon={LayoutDashboard} label={t.dashboard} />
          <NavItem active={activeTab === 'mfs'} onClick={() => handleTabChange('mfs')} icon={Wallet} label={t.mfs} />
          <NavItem active={activeTab === 'recharge'} onClick={() => handleTabChange('recharge')} icon={Smartphone} label={t.recharge} />
          <NavItem active={activeTab === 'services'} onClick={() => handleTabChange('services')} icon={Copy} label={t.services} />
          <NavItem active={activeTab === 'expenses'} onClick={() => handleTabChange('expenses')} icon={ArrowDownLeft} label={t.expenses} />
          <NavItem active={activeTab === 'vendors'} onClick={() => handleTabChange('vendors')} icon={Users} label={t.vendors} />
          <NavItem active={activeTab === 'inventory'} onClick={() => handleTabChange('inventory')} icon={Package} label={t.inventory} />
          <NavItem active={activeTab === 'customers'} onClick={() => handleTabChange('customers')} icon={Users} label={t.customers} />
          <NavItem active={activeTab === 'history'} onClick={() => handleTabChange('history')} icon={History} label={t.history} />
          <NavItem active={activeTab === 'settings'} onClick={() => handleTabChange('settings')} icon={PlusCircle} label={t.settings} />
          {(currentUser?.role === 'admin' || currentUser?.role === 'shop_owner' || currentUser?.role === 'manager') && (
            <NavItem active={activeTab === 'users'} onClick={() => handleTabChange('users')} icon={Users} label={t.users} />
          )}
          {currentUser?.role === 'admin' && (
            <NavItem active={activeTab === 'shop-requests'} onClick={() => handleTabChange('shop-requests')} icon={Store} label={t.shopRequests} />
          )}
          {currentUser?.role === 'admin' && (
            <NavItem active={activeTab === 'hero-slider'} onClick={() => handleTabChange('hero-slider')} icon={ImageIcon} label={t.heroSlider} />
          )}
          <NavItem active={activeTab === 'support'} onClick={() => handleTabChange('support')} icon={LifeBuoy} label={t.support} />
          
          <div className="pt-4 mt-4 border-t border-slate-100 space-y-2">
            <button 
              onClick={() => handleTabChange('settings')}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-600 hover:bg-slate-50 transition-all font-medium"
            >
              <Store className="w-5 h-5 text-slate-400" />
              Change Shop
            </button>
            <button 
              onClick={() => setShowDailyReport(true)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-600 hover:bg-slate-50 transition-all font-medium"
            >
              <FileText className="w-5 h-5 text-slate-400" />
              Daily Report
            </button>
            <button 
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-600 hover:bg-red-50 transition-all font-medium"
            >
              <LogIn className="w-5 h-5 rotate-180" />
              {t.logout}
            </button>
          </div>
        </nav>
      </aside>

      <AIAssistant fetchWithAuth={fetchWithAuth} />

      {/* Main Content */}
      <main className="p-8 max-w-6xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 capitalize">
              {activeTab === 'dashboard' ? (currentShop?.name || t.dashboard) : (t[activeTab as keyof typeof t] || activeTab)}
            </h2>
            <p className="text-slate-500">{t.welcome}, {currentUser?.name} ({currentUser?.role})</p>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={fetchAnalytics}
              className="p-2 hover:bg-slate-200 rounded-full transition-colors"
              title="Refresh Data"
            >
              <RefreshCcw className={`w-5 h-5 text-slate-600 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </header>

        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <DashboardModule 
              analytics={analytics} 
              onTabChange={handleTabChange} 
              onAddStock={handleAddStock} 
              onCompleteSale={handleTransactionComplete}
              fetchWithAuth={fetchWithAuth}
              currentUser={currentUser}
              currentShop={currentShop}
              t={t}
              formatDate={formatDate}
            />
          )}

          {activeTab === 'mfs' && (
            <MFSModule 
              initialType={mfsInitialType} 
              onComplete={handleTransactionComplete} 
              externalBalances={mfsBalances}
              refreshBalances={fetchAnalytics}
              fetchWithAuth={fetchWithAuth}
              currentUser={currentUser}
            />
          )}
          {activeTab === 'recharge' && (
            <RechargeModule 
              onComplete={handleTransactionComplete} 
              externalBalances={rechargeBalances}
              refreshBalances={fetchAnalytics}
              fetchWithAuth={fetchWithAuth}
              currentUser={currentUser}
            />
          )}
          {activeTab === 'services' && <ServicesModule onComplete={handleTransactionComplete} fetchWithAuth={fetchWithAuth} currentUser={currentUser} />}
          {activeTab === 'other' && <OtherSalesModule onComplete={handleTransactionComplete} fetchWithAuth={fetchWithAuth} currentUser={currentUser} />}
          {activeTab === 'expenses' && <ExpenseModule onComplete={handleTransactionComplete} fetchWithAuth={fetchWithAuth} currentUser={currentUser} />}
          {activeTab === 'vendors' && <VendorsModule fetchWithAuth={fetchWithAuth} currentUser={currentUser} t={t} formatDate={formatDate} />}
          {activeTab === 'customers' && <CustomersModule fetchWithAuth={fetchWithAuth} currentUser={currentUser} refreshKey={refreshKey} t={t} formatDate={formatDate} />}
          {activeTab === 'inventory' && <InventoryModule fetchWithAuth={fetchWithAuth} currentUser={currentUser} t={t} formatDate={formatDate} />}
          {activeTab === 'support' && <SupportModule fetchWithAuth={fetchWithAuth} currentUser={currentUser} formatDate={formatDate} />}
          {activeTab === 'settings' && (currentUser?.role === 'admin' || currentUser?.role === 'shop_owner') && (
            <div className="space-y-8">
              {(currentUser?.role === 'admin' || (currentUser?.role === 'shop_owner' && (currentShop?.plan === 'Premium' || shops.some(s => s.plan === 'Premium')))) && shops.length > 0 && (
                <Card>
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <Store className="w-5 h-5 text-emerald-600" />
                    Shop Selection / দোকান নির্বাচন
                  </h3>
                  <div className="max-w-xs space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-600 mb-2">Active Shop</label>
                      <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 shadow-sm">
                        <Store className="w-5 h-5 text-slate-400" />
                        <select 
                          value={activeShopId || ''} 
                          onChange={(e) => {
                            const id = parseInt(e.target.value);
                            setActiveShopId(id);
                            localStorage.setItem('activeShopId', id.toString());
                            fetchAnalytics();
                          }}
                          className="text-base font-bold text-slate-700 outline-none bg-transparent w-full"
                        >
                          {shops.map(shop => (
                            <option key={shop.id} value={shop.id}>{shop.name} ({shop.plan})</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </Card>
              )}
              {currentUser?.role === 'admin' && <PaymentGatewaySettings fetchWithAuth={fetchWithAuth} />}
              <SettingsModule onComplete={() => { fetchAnalytics(); fetchShops(); }} fetchWithAuth={fetchWithAuth} fetchShops={fetchShops} currentUser={currentUser} formatDate={formatDate} />
              {currentUser?.role === 'admin' && <BackupModule fetchWithAuth={fetchWithAuth} formatDate={formatDate} />}
            </div>
          )}
          {activeTab === 'users' && (currentUser?.role === 'admin' || currentUser?.role === 'shop_owner' || currentUser?.role === 'manager') && <UserManagementSection token={token!} shops={shops} fetchWithAuth={fetchWithAuth} currentUser={currentUser} currentShop={currentShop} t={t} formatDate={formatDate} />}
          {activeTab === 'shop-requests' && currentUser?.role === 'admin' && <ShopRequestsSection fetchWithAuth={fetchWithAuth} currentUser={currentUser} shops={shops} t={t} formatDate={formatDate} />}
          {activeTab === 'hero-slider' && currentUser?.role === 'admin' && (
            <div className="p-6">
              <HeroSliderManagement fetchWithAuth={fetchWithAuth} />
            </div>
          )}
          {activeTab === 'history' && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row gap-4 items-center">
                <div className="relative flex-1 w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <input 
                    type="text" 
                    placeholder="Search by Phone or TrxID..." 
                    className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      fetchTransactions(e.target.value);
                    }}
                  />
                </div>
                <button 
                  onClick={() => setShowDailyReport(true)}
                  className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 whitespace-nowrap"
                >
                  <Download className="w-5 h-5" />
                  {t.dailyReport}
                </button>
                <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
                  {[
                    { label: 'All', value: 'all' },
                    { label: 'Daily', value: 'daily' },
                    { label: 'Weekly', value: 'weekly' },
                    { label: 'Monthly', value: 'monthly' },
                    { label: 'Yearly', value: 'yearly' },
                    { label: 'Custom', value: 'custom' }
                  ].map((r) => (
                    <button
                      key={r.value}
                      onClick={() => {
                        setDateRange(r.value);
                        if (r.value !== 'custom') fetchTransactions(searchQuery, r.value);
                      }}
                      className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${
                        dateRange === r.value 
                          ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-100' 
                          : 'bg-white text-slate-600 border border-slate-200 hover:border-emerald-200'
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              {dateRange === 'custom' && (
                <Card className="p-4 border-emerald-100 bg-emerald-50/30">
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-emerald-600" />
                      <span className="text-sm font-bold text-slate-600">Custom Range:</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input 
                        type="date" 
                        className="p-2 rounded-lg border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                        value={customRange.start}
                        onChange={(e) => setCustomRange({ ...customRange, start: e.target.value })}
                      />
                      <span className="text-slate-400">to</span>
                      <input 
                        type="date" 
                        className="p-2 rounded-lg border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                        value={customRange.end}
                        onChange={(e) => setCustomRange({ ...customRange, end: e.target.value })}
                      />
                    </div>
                    <button 
                      onClick={() => fetchTransactions(searchQuery, 'custom', customRange)}
                      className="px-6 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 transition-colors"
                    >
                      Apply Filter
                    </button>
                  </div>
                </Card>
              )}

              <Card className="overflow-hidden p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 border-bottom border-slate-200">
                      <tr>
                        <th className="px-6 py-4 text-sm font-semibold text-slate-600">Time</th>
                        <th className="px-6 py-4 text-sm font-semibold text-slate-600">Operator/Service</th>
                        <th className="px-6 py-4 text-sm font-semibold text-slate-600">Type</th>
                        <th className="px-6 py-4 text-sm font-semibold text-slate-600">Amount</th>
                        <th className="px-6 py-4 text-sm font-semibold text-slate-600">Phone</th>
                        <th className="px-6 py-4 text-sm font-semibold text-slate-600">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {transactions.length > 0 ? transactions.map((tx, idx) => (
                        <tr key={`${tx.source || 'tx'}-${tx.id}-${idx}`} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 text-sm text-slate-500">{formatDate(tx.timestamp)}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded-md text-xs font-bold uppercase ${
                              tx.operator === 'bKash' ? 'bg-pink-100 text-pink-700' :
                              tx.operator === 'Nagad' ? 'bg-orange-100 text-orange-700' :
                              tx.operator === 'Rocket' ? 'bg-blue-100 text-blue-700' :
                              'bg-slate-100 text-slate-700'
                            }`}>
                              {tx.operator || tx.service_type}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm font-medium">
                            {tx.source === 'mfs' && tx.type === 'Payment' ? (
                              <span className="text-emerald-600 font-bold">MFS Payment Received</span>
                            ) : (
                              tx.type || tx.variant
                            )}
                            {tx.cashback > 0 && (
                              <div className="text-[10px] text-emerald-500 font-bold">Cashback: ৳{tx.cashback}</div>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm font-bold">৳{tx.amount || tx.price}</td>
                          <td className="px-6 py-4 text-sm text-slate-600">{tx.customer_phone || '-'}</td>
                          <td className="px-6 py-4">
                            <div className="flex gap-2">
                              <button 
                                onClick={() => setSelectedInvoice(tx)}
                                className="p-2 hover:bg-emerald-50 text-emerald-600 rounded-lg transition-colors"
                                title="Print Invoice"
                              >
                                <Printer className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={async () => {
                                  setSelectedInvoice(tx);
                                }}
                                className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors"
                                title="Download PDF"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={async () => {
                                  if (!confirm('Are you sure you want to delete this transaction?')) return;
                                  try {
                                    const res = await fetchWithAuth(`/api/history/${tx.id}?source=${tx.source}`, { method: 'DELETE' });
                                    if (res.ok) {
                                      fetchTransactions(searchQuery);
                                      fetchAnalytics();
                                    }
                                  } catch (err) {
                                    console.error(err);
                                  }
                                }}
                                className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                                title="Delete Transaction"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                             <div className="flex flex-col items-center gap-2">
                               <Search className="w-8 h-8 text-slate-300" />
                               {t.noDataFound}
                             </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}
        </AnimatePresence>
      </main>

      {/* Invoice Modal */}
      <AnimatePresence>
        {selectedInvoice && (
          <InvoiceModal 
            transaction={selectedInvoice} 
            onClose={() => setSelectedInvoice(null)} 
            formatDate={formatDate}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showDailyReport && analytics && (
          <DailyReportModal 
            analytics={analytics} 
            onClose={() => setShowDailyReport(false)} 
            fetchWithAuth={fetchWithAuth}
            formatDate={formatDate}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function DashboardModule({ 
  analytics, 
  onTabChange, 
  onAddStock,
  onCompleteSale,
  fetchWithAuth,
  currentUser,
  currentShop,
  t,
  formatDate
}: { 
  analytics: Analytics | null; 
  onTabChange: (tab: string, type?: string) => void; 
  onAddStock: () => void;
  onCompleteSale: (tx: Transaction) => void;
  fetchWithAuth: any;
  currentUser: User | null;
  currentShop: Shop | null;
  t: any;
  formatDate: any;
}) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [lowStockItems, setLowStockItems] = useState<InventoryItem[]>([]);
  const [chartData, setChartData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showAddOrder, setShowAddOrder] = useState(false);
  const [showSellModal, setShowSellModal] = useState(false);
  const [newOrder, setNewOrder] = useState({ customer_name: '', customer_phone: '', description: '', amount: '' });

  const fetchData = async () => {
    try {
      const [ordersRes, chartRes, inventoryRes] = await Promise.all([
        fetchWithAuth('/api/orders?status=Pending'),
        fetchWithAuth('/api/analytics/chart-data'),
        fetchWithAuth('/api/inventory')
      ]);
      const ordersData = await ordersRes.json();
      const chartDataJson = await chartRes.json();
      const inventoryData = await inventoryRes.json();
      
      setOrders(ordersData);
      setLowStockItems(inventoryData.filter((item: InventoryItem) => item.quantity <= item.min_stock));
      
      // Transform chart data for Recharts
      const formattedChartData = chartDataJson.labels.map((label: string, i: number) => ({
        name: label,
        sales: chartDataJson.salesData[i],
        mfs: chartDataJson.mfsData[i],
        profit: chartDataJson.profitData[i]
      }));
      setChartData(formattedChartData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetchWithAuth('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newOrder,
          amount: parseFloat(newOrder.amount) || 0
        })
      });
      setNewOrder({ customer_name: '', customer_phone: '', description: '', amount: '' });
      setShowAddOrder(false);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCompleteOrder = async (id: number) => {
    if (!confirm('Mark this order as completed?')) return;
    try {
      await fetchWithAuth(`/api/orders/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Completed' }) // Only updating status for now
      });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteOrder = async (id: number) => {
    if (!confirm('Delete this order?')) return;
    try {
      await fetchWithAuth(`/api/orders/${id}`, { method: 'DELETE' });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* Dashboard Header Section Removed Duplicate Welcome */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm mb-6">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-3xl font-black text-slate-900 mb-1">{currentShop?.name || t.dashboard}</h2>
            <p className="text-slate-500 font-medium">Overview of your business performance</p>
          </div>
          
          {/* Quick MFS Balances */}
          <div className="flex gap-3 items-center">
            <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 rounded-2xl border border-indigo-100">
              <TrendingUp className="w-4 h-4 text-indigo-600" />
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-indigo-400 uppercase leading-none">{t.totalBalance}</span>
                <span className="text-sm font-black text-indigo-900">৳{analytics?.totalBalance.toFixed(2) || 0}</span>
              </div>
            </div>
            {['bKash', 'Nagad', 'Rocket'].map(op => (
              <div key={op} className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-2xl border border-slate-200">
                <div className={`w-2.5 h-2.5 rounded-full ${
                  op === 'bKash' ? 'bg-pink-500 shadow-[0_0_8px_rgba(236,72,153,0.4)]' :
                  op === 'Nagad' ? 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.4)]' :
                  'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.4)]'
                }`} />
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-400 uppercase leading-none">{op}</span>
                  <span className="text-sm font-black text-slate-900">৳{analytics?.mfsBalances?.[op] || 0}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Stats Row */}
      <div className="grid grid-cols-3 gap-4">
        {currentUser?.role === 'admin' && analytics?.totalShops !== undefined && (
          <StatCard title="Total Registered Shops" value={analytics.totalShops.toString()} icon={Store} color="bg-cyan-600" />
        )}
        <StatCard title={t.totalBalance} value={`৳${analytics?.totalBalance.toFixed(2) || 0}`} icon={TrendingUp} color="bg-indigo-600" />
        <StatCard title={t.cashInHand} value={`৳${analytics?.cashInHand.toFixed(2) || 0}`} icon={Wallet} color="bg-emerald-500" />
        <StatCard title={t.totalProfit} value={`৳${analytics?.totalProfit.toFixed(2) || 0}`} icon={TrendingUp} color="bg-blue-500" />
        <StatCard title={t.expenses} value={`৳${(analytics?.expenses?.total || 0).toFixed(2)}`} icon={ArrowDownLeft} color="bg-red-500" />
        <StatCard title={t.totalMfsBalance} value={`৳${analytics?.totalMfsBalance.toFixed(2) || 0}`} icon={SmartphoneNfc} color="bg-purple-500" />
        <StatCard title={t.customerDue} value={`৳${(analytics?.totalCustomerDue || 0).toFixed(2)}`} icon={Users} color="bg-orange-500" />
      </div>

      {/* Charts & Pending Orders Row */}
      <div className="grid grid-cols-3 gap-6">
        {/* Chart Section */}
        <Card className="col-span-2 min-h-[400px]">
          <h3 className="text-lg font-bold mb-4">Weekly Performance</h3>
          {chartData ? (
            <div className="h-[320px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorMfs" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend />
                  <Area type="monotone" dataKey="sales" name="Sales (৳)" stroke="#10b981" fillOpacity={1} fill="url(#colorSales)" strokeWidth={2} />
                  <Area type="monotone" dataKey="mfs" name="MFS Vol (৳)" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorMfs)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-400">Loading chart...</div>
          )}
        </Card>

        {/* Quick Actions (Swapped with Pending Orders) */}
        {currentUser?.role !== 'manager' && (
          <Card>
            <h3 className="text-lg font-bold mb-4">{t.quickActions}</h3>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => onTabChange('mfs', 'Cash-in')} className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors border border-slate-200">
                <Wallet className="w-6 h-6 text-emerald-600 mb-1" />
                <span className="text-xs font-medium">{t.mfs}</span>
              </button>
              <button onClick={() => onTabChange('recharge')} className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors border border-slate-200">
                <Smartphone className="w-6 h-6 text-blue-600 mb-1" />
                <span className="text-xs font-medium">{t.recharge}</span>
              </button>
              <button onClick={() => onTabChange('services')} className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors border border-slate-200">
                <Copy className="w-6 h-6 text-orange-600 mb-1" />
                <span className="text-xs font-medium">{t.services}</span>
              </button>
              <button onClick={() => onTabChange('expenses')} className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors border border-slate-200">
                <ArrowDownLeft className="w-6 h-6 text-red-600 mb-1" />
                <span className="text-xs font-medium">{t.expenses}</span>
              </button>
              <button onClick={() => setShowSellModal(true)} className="flex flex-col items-center justify-center p-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 transition-colors border border-emerald-200">
                <TrendingUp className="w-6 h-6 text-emerald-600 mb-1" />
                <span className="text-xs font-medium">{t.addTransaction}</span>
              </button>
              <button 
                onClick={() => onTabChange('support')} 
                className="flex flex-col items-center justify-center p-3 rounded-xl bg-red-50 hover:bg-red-100 transition-colors border border-red-200"
              >
                <LifeBuoy className="w-6 h-6 text-red-600 mb-1" />
                <span className="text-xs font-medium">Report Issue</span>
              </button>
            </div>
            
            <div className="mt-6 pt-6 border-t border-slate-100">
               <div className="flex justify-between items-center mb-2">
                  <h4 className="font-bold text-sm">Inventory</h4>
                  <button onClick={onAddStock} className="text-emerald-600 text-xs font-bold flex items-center gap-1">
                     <PlusCircle className="w-3 h-3" /> Add
                  </button>
               </div>
               <div className="flex justify-between items-center p-2 bg-slate-50 rounded-lg">
                  <span className="text-xs text-slate-500">Paper (A4)</span>
                  <span className="text-sm font-bold">{(analytics?.inventory || 0) / 500} Rims</span>
               </div>
            </div>
          </Card>
        )}
      </div>

      {/* MFS Balances & Pending Orders Row */}
      <div className="grid grid-cols-3 gap-6">
        <Card className="col-span-2">
          <h3 className="text-lg font-bold mb-4">MFS & Recharge Balances</h3>
          <div className="grid grid-cols-3 gap-4 mb-6">
            {analytics?.mfsBalances && Object.entries(analytics.mfsBalances).map(([op, bal]) => (
              <div key={`mfs-bal-${op}`} className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex flex-col justify-between min-h-[100px]">
                <div className="flex items-start gap-3">
                  <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-0.5 ${
                    op.startsWith('bKash') ? 'bg-pink-100 text-pink-600' : op.startsWith('Nagad') ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'
                  }`}>
                    <SmartphoneNfc className="w-4 h-4" />
                  </div>
                  <span className="font-bold text-slate-700 text-xs leading-tight break-words">{op}</span>
                </div>
                <div className="text-right mt-2">
                  <span className="font-black text-slate-900 text-lg">৳{bal}</span>
                </div>
              </div>
            ))}
          </div>
          
          {analytics?.rechargeBalances && (
            <div className="grid grid-cols-5 gap-3">
              {Object.entries(analytics.rechargeBalances).map(([op, bal]) => (
                <div key={`rech-bal-${op}`} className="bg-white p-2 rounded-xl border border-slate-200 flex flex-col items-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase mb-1">{op}</span>
                  <span className="font-bold text-slate-900 text-sm">৳{bal}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Pending Orders Section (Swapped with Quick Actions) */}
        <Card className={`flex flex-col h-full ${currentUser?.role === 'manager' ? 'col-span-3' : ''}`}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold flex items-center gap-2">
              {t.pendingOrders}
              <span className="bg-orange-100 text-orange-700 text-xs px-2 py-1 rounded-full">{orders.length}</span>
            </h3>
            {currentUser?.role !== 'manager' && (
              <button 
                onClick={() => setShowAddOrder(true)}
                className="p-2 hover:bg-slate-100 rounded-full text-slate-600"
              >
                <PlusCircle className="w-5 h-5" />
              </button>
            )}
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-3 pr-2 max-h-[320px]">
            {orders.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm">No pending orders</div>
            ) : (
              orders.map(order => (
                <div key={`order-${order.id}`} className="p-3 bg-slate-50 rounded-xl border border-slate-100 group">
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="font-bold text-slate-900">{order.description}</h4>
                    <span className="font-mono text-xs font-bold text-slate-500">৳{order.amount}</span>
                  </div>
                  <div className="flex justify-between items-end">
                    <div className="text-xs text-slate-500">
                      <p>{order.customer_name}</p>
                      <p>{order.customer_phone}</p>
                      <p className="text-[10px] mt-1 text-slate-400">{formatDate(order.timestamp, true)}</p>
                    </div>
                    {currentUser?.role !== 'manager' && (
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleCompleteOrder(order.id)}
                          className="p-1.5 bg-emerald-100 text-emerald-600 rounded-lg hover:bg-emerald-200"
                          title="Complete"
                        >
                          <CheckCircle2 className="w-3 h-3" />
                        </button>
                        <button 
                          onClick={() => handleDeleteOrder(order.id)}
                          className="p-1.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
                          title="Delete"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Low Stock Alerts */}
          {lowStockItems.length > 0 && (
            <div className="mt-6 pt-6 border-t border-slate-100">
              <h3 className="text-sm font-bold text-red-600 flex items-center gap-2 mb-3">
                <Package className="w-4 h-4" />
                Low Stock Alerts
              </h3>
              <div className="space-y-2">
                {lowStockItems.slice(0, 3).map(item => (
                  <div key={`low-stock-${item.id}`} className="flex items-center justify-between p-2 bg-red-50 rounded-lg border border-red-100">
                    <span className="text-xs font-medium text-slate-700">{item.item_name}</span>
                    <span className="text-xs font-bold text-red-600">{item.quantity} {item.unit} left</span>
                  </div>
                ))}
                {lowStockItems.length > 3 && (
                  <button 
                    onClick={() => onTabChange('inventory')}
                    className="text-[10px] text-slate-400 hover:text-slate-600 font-medium"
                  >
                    + {lowStockItems.length - 3} more items...
                  </button>
                )}
              </div>
            </div>
          )}
        </Card>
      </div>


      {/* Add Order Modal */}
      {showAddOrder && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <Card className="w-full max-w-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">New Order</h3>
              <button onClick={() => setShowAddOrder(false)} className="p-1 hover:bg-slate-100 rounded-full"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleAddOrder} className="space-y-3">
              <input 
                placeholder="Description (e.g. Passport Photo)" 
                required
                className="w-full p-2 border rounded-lg"
                value={newOrder.description}
                onChange={e => setNewOrder({ ...newOrder, description: e.target.value })}
              />
              <input 
                placeholder="Amount (Optional)" 
                type="number"
                className="w-full p-2 border rounded-lg"
                value={newOrder.amount}
                onChange={e => setNewOrder({ ...newOrder, amount: e.target.value })}
              />
              <input 
                placeholder="Customer Name" 
                className="w-full p-2 border rounded-lg"
                value={newOrder.customer_name}
                onChange={e => setNewOrder({ ...newOrder, customer_name: e.target.value })}
              />
              <input 
                placeholder="Customer Phone" 
                type="tel"
                className="w-full p-2 border rounded-lg"
                value={newOrder.customer_phone}
                onChange={e => setNewOrder({ ...newOrder, customer_phone: e.target.value })}
              />
              <button className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl">Save Order</button>
            </form>
          </Card>
        </div>
      )}

      {showSellModal && createPortal(
        <SellProductModal 
          onClose={() => setShowSellModal(false)} 
          onSuccess={(tx) => {
            setShowSellModal(false);
            fetchData();
            onCompleteSale(tx);
          }} 
          fetchWithAuth={fetchWithAuth}
        />,
        document.body
      )}
    </motion.div>
  );
}

function SellProductModal({ onClose, onSuccess, fetchWithAuth }: { onClose: () => void; onSuccess: (tx: Transaction) => void; fetchWithAuth: any }) {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedItem, setSelectedItem] = useState<string>('');
  const [customerId, setCustomerId] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('1');
  const [price, setPrice] = useState<string>('');
  const [paymentStatus, setPaymentStatus] = useState<'Paid' | 'Partial' | 'Due'>('Paid');
  const [paidAmount, setPaidAmount] = useState<string>('');
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', address: '' });
  const [submitting, setSubmitting] = useState(false);
  const [customerSubmitting, setCustomerSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCustomers = async () => {
    try {
      const res = await fetchWithAuth('/api/customers');
      const data = await res.json();
      setCustomers(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    Promise.all([
      fetchWithAuth('/api/inventory').then((res: any) => res.json()),
      fetchWithAuth('/api/customers').then((res: any) => res.json())
    ]).then(([invData, custData]) => {
      setInventory(invData);
      setCustomers(custData);
    }).catch(err => console.error(err));
  }, []);

  const handleCreateCustomer = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!newCustomer.name || !newCustomer.phone) {
      setError('Name and Phone are required for new customer');
      return;
    }
    setCustomerSubmitting(true);
    setError(null);
    try {
      const res = await fetchWithAuth('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCustomer)
      });
      const data = await res.json();
      if (res.ok) {
        await fetchCustomers();
        setCustomerId(data.id.toString());
        setShowNewCustomerForm(false);
        setNewCustomer({ name: '', phone: '', address: '' });
      } else {
        setError(data.error || 'Failed to create customer');
      }
    } catch (err) {
      console.error(err);
      setError('Failed to create customer');
    } finally {
      setCustomerSubmitting(false);
    }
  };

  const totalAmount = parseFloat(price) || 0;
  const calculatedDue = paymentStatus === 'Paid' ? 0 : 
                       paymentStatus === 'Due' ? totalAmount : 
                       Math.max(0, totalAmount - (parseFloat(paidAmount) || 0));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) {
      setError('Please select a product');
      return;
    }
    const qty = parseInt(quantity);
    const prc = parseFloat(price);
    if (isNaN(qty) || qty <= 0) {
      setError('Invalid quantity');
      return;
    }
    if (isNaN(prc) || prc < 0) {
      setError('Invalid price');
      return;
    }

    if ((paymentStatus === 'Partial' || paymentStatus === 'Due') && !customerId) {
      setError('Please select a customer for due payments');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetchWithAuth('/api/inventory/sell', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inventory_id: selectedItem,
          quantity: qty,
          price: prc,
          customer_id: customerId || null,
          payment_status: paymentStatus,
          paid_amount: paymentStatus === 'Paid' ? prc : (parseFloat(paidAmount) || 0),
          due_amount: calculatedDue
        })
      });
      const data = await res.json();
      if (res.ok) {
        // Map other_sales fields to Transaction interface for invoice
        const tx: Transaction = {
          ...data,
          operator: data.item_name, // Map item_name to operator for invoice display
          customer_phone: customers.find(c => c.id === parseInt(customerId))?.phone || '-'
        };
        onSuccess(tx);
      } else {
        setError(data.error || 'Failed to complete sale');
      }
    } catch (err) {
      console.error(err);
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl"
      >
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h3 className="text-xl font-bold">Sell from Inventory</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Select Product</label>
            <select 
              required
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
              value={selectedItem}
              onChange={e => setSelectedItem(e.target.value)}
            >
              <option value="">Choose a product...</option>
              {inventory.map(item => (
                <option key={item.id} value={item.id} disabled={item.quantity <= 0}>
                  {item.item_name} ({item.quantity} {item.unit} available)
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Quantity</label>
              <input 
                type="number" required min="1"
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Total Price (৳)</label>
              <input 
                type="number" required step="0.01"
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                value={price}
                onChange={e => setPrice(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Payment Status</label>
            <div className="grid grid-cols-3 gap-2">
              {['Paid', 'Partial', 'Due'].map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setPaymentStatus(status as any)}
                  className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                    paymentStatus === status 
                      ? 'bg-emerald-600 text-white border-emerald-600' 
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {status === 'Paid' ? 'পরিশোধ' : status === 'Partial' ? 'আংশিক' : 'বাকি'}
                </button>
              ))}
            </div>
          </div>

          {paymentStatus === 'Partial' && (
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Paid Amount (৳)</label>
              <input 
                type="number" required step="0.01"
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                value={paidAmount}
                onChange={e => setPaidAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
          )}

          {(paymentStatus === 'Partial' || paymentStatus === 'Due') && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="block text-sm font-medium text-slate-600">Select Customer (for Due)</label>
                <button 
                  type="button"
                  onClick={() => setShowNewCustomerForm(!showNewCustomerForm)}
                  className="text-xs font-bold text-emerald-600 flex items-center gap-1 hover:underline"
                >
                  <PlusCircle className="w-3 h-3" />
                  {showNewCustomerForm ? 'Select Existing' : 'New Customer'}
                </button>
              </div>

              {showNewCustomerForm ? (
                <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 space-y-3">
                  <input 
                    type="text" placeholder="Customer Name"
                    className="w-full p-2 bg-white border border-emerald-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                    value={newCustomer.name}
                    onChange={e => setNewCustomer({ ...newCustomer, name: e.target.value })}
                  />
                  <input 
                    type="text" placeholder="Phone Number"
                    className="w-full p-2 bg-white border border-emerald-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                    value={newCustomer.phone}
                    onChange={e => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                  />
                  <input 
                    type="text" placeholder="Address (Optional)"
                    className="w-full p-2 bg-white border border-emerald-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                    value={newCustomer.address}
                    onChange={e => setNewCustomer({ ...newCustomer, address: e.target.value })}
                  />
                  <button 
                    type="button"
                    disabled={customerSubmitting}
                    onClick={handleCreateCustomer}
                    className="w-full py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {customerSubmitting ? 'Creating...' : 'Create & Select'}
                  </button>
                </div>
              ) : (
                <select 
                  required
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                  value={customerId}
                  onChange={e => setCustomerId(e.target.value)}
                >
                  <option value="">Choose a customer...</option>
                  {customers.map(c => (
                    <option key={`sell-customer-opt-${c.id}`} value={c.id}>{c.name} ({c.phone})</option>
                  ))}
                </select>
              )}
            </div>
          )}

          {calculatedDue > 0 && (
            <div className="p-3 bg-orange-50 border border-orange-100 text-orange-700 text-sm rounded-xl font-bold">
              Due Amount: ৳{calculatedDue.toFixed(2)}
            </div>
          )}

          <button 
            type="submit" disabled={submitting}
            className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 disabled:opacity-50"
          >
            {submitting ? 'Processing...' : 'Complete Sale & Invoice'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

// --- Sub-Modules ---

function InvoiceModal({ transaction, onClose, formatDate }: { transaction: Transaction; onClose: () => void; formatDate: any }) {
  const [isDownloading, setIsDownloading] = useState(false);
  const printInvoice = () => {
    window.print();
  };

  const downloadInvoice = async () => {
    const element = document.getElementById('invoice-content');
    if (!element) return;

    setIsDownloading(true);
    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        onclone: (clonedDoc) => {
          const styleTags = clonedDoc.getElementsByTagName('style');
          for (let i = 0; i < styleTags.length; i++) {
            const tag = styleTags[i];
            if (tag.innerHTML.includes('oklch')) {
              tag.innerHTML = tag.innerHTML.replace(/oklch\([^)]+\)/g, '#000000');
            }
          }
        }
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`invoice-${transaction.trx_id || transaction.id}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4 print:p-0"
    >
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl print:shadow-none print:rounded-none"
      >
        <div className="p-6 border-b border-slate-100 flex justify-between items-center print:hidden">
          <h3 className="text-lg font-bold">Transaction Invoice</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div id="invoice-content" className="p-8 space-y-6 text-center bg-white" style={{ color: '#0f172a' }}>
          <div className="space-y-1">
            <h2 className="text-2xl font-black" style={{ color: '#059669' }}>DeshiShop</h2>
            <p className="text-xs uppercase tracking-widest" style={{ color: '#94a3b8' }}>Digital Service Point</p>
          </div>

          <div className="py-4 border-y border-dashed space-y-3" style={{ borderColor: '#e2e8f0' }}>
            <div className="flex justify-between text-sm">
              <span style={{ color: '#64748b' }}>Date & Time</span>
              <span className="font-medium" style={{ color: '#0f172a' }}>{formatDate(transaction.timestamp || (new Date().toISOString()))}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span style={{ color: '#64748b' }}>Service</span>
              <span className="font-bold" style={{ color: '#0f172a' }}>{transaction.operator || transaction.service_type}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span style={{ color: '#64748b' }}>Type</span>
              <span className="font-medium" style={{ color: '#0f172a' }}>{transaction.type || transaction.variant}</span>
            </div>
            {transaction.cashback > 0 && (
              <div className="flex justify-between text-sm">
                <span style={{ color: '#059669' }}>Cashback</span>
                <span className="font-bold" style={{ color: '#059669' }}>৳{transaction.cashback}</span>
              </div>
            )}
            {transaction.customer_phone && (
              <div className="flex justify-between text-sm">
                <span style={{ color: '#64748b' }}>Customer</span>
                <span className="font-medium" style={{ color: '#0f172a' }}>{transaction.customer_phone}</span>
              </div>
            )}
            {transaction.trx_id && (
              <div className="flex justify-between text-sm">
                <span style={{ color: '#64748b' }}>TrxID</span>
                <span className="font-mono text-xs" style={{ color: '#0f172a' }}>{transaction.trx_id}</span>
              </div>
            )}
            {transaction.pages && (
              <div className="flex justify-between text-sm">
                <span style={{ color: '#64748b' }}>Pages</span>
                <span className="font-medium" style={{ color: '#0f172a' }}>{transaction.pages}</span>
              </div>
            )}
          </div>

          <div className="space-y-1">
            <p className="text-sm" style={{ color: '#64748b' }}>Total Amount</p>
            <h1 className="text-4xl font-black" style={{ color: '#0f172a' }}>৳{transaction.amount || transaction.price}</h1>
          </div>

          {(transaction.paid_amount !== undefined || transaction.due_amount !== undefined) && (
            <div className="grid grid-cols-2 gap-4 py-3 border-t border-dashed" style={{ borderColor: '#e2e8f0' }}>
              <div className="text-center">
                <p className="text-[10px] uppercase font-bold text-slate-400">Paid</p>
                <p className="text-lg font-black text-emerald-600">৳{transaction.paid_amount ?? (transaction.amount || transaction.price)}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] uppercase font-bold text-slate-400">Due</p>
                <p className="text-lg font-black text-red-600">৳{transaction.due_amount ?? 0}</p>
              </div>
            </div>
          )}

          <div className="pt-4 flex flex-col items-center gap-2">
            {transaction.due_amount > 0 ? (
              transaction.paid_amount > 0 ? (
                <>
                  <div className="w-12 h-12 rounded-full flex items-center justify-center mb-2" style={{ backgroundColor: '#fff7ed' }}>
                    <AlertCircle style={{ color: '#f97316' }} className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-bold" style={{ color: '#f97316' }}>Partial Payment / আংশিক পরিশোধ</p>
                </>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-full flex items-center justify-center mb-2" style={{ backgroundColor: '#fef2f2' }}>
                    <AlertCircle style={{ color: '#dc2626' }} className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-bold" style={{ color: '#dc2626' }}>Full Due / সম্পূর্ণ বাকি</p>
                </>
              )
            ) : (
              <>
                <div className="w-12 h-12 rounded-full flex items-center justify-center mb-2" style={{ backgroundColor: '#ecfdf5' }}>
                  <CheckCircle2 style={{ color: '#059669' }} className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold" style={{ color: '#059669' }}>Full Payment / সম্পূর্ণ পরিশোধ</p>
              </>
            )}
            <p className="text-[10px]" style={{ color: '#94a3b8' }}>Thank you for choosing DeshiShop!</p>
          </div>
        </div>

        <div className="p-6 bg-slate-50 flex gap-3 print:hidden">
          <button 
            onClick={printInvoice}
            className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors"
          >
            <Printer className="w-4 h-4" /> Print
          </button>
          <button 
            onClick={downloadInvoice}
            disabled={isDownloading}
            className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 transition-colors disabled:opacity-50"
          >
            {isDownloading ? (
              <RefreshCcw className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            Download
          </button>
          <button 
            onClick={onClose}
            className="flex-1 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-colors"
          >
            Close
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function DailyReportModal({ analytics, onClose, fetchWithAuth, formatDate }: { analytics: Analytics; onClose: () => void; fetchWithAuth: any; formatDate: any }) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [dailyTransactions, setDailyTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDailyData = async () => {
      try {
        const res = await fetchWithAuth('/api/history');
        if (res.ok) {
          const data = await res.json();
          // Filter for today's transactions only
          const today = new Date().toISOString().split('T')[0];
          const filtered = data.filter((tx: Transaction) => tx.timestamp.startsWith(today));
          setDailyTransactions(filtered);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchDailyData();
  }, [fetchWithAuth]);

  const rechargeTransactions = dailyTransactions.filter(tx => tx.source === 'recharge');
  const totalRechargeAmount = rechargeTransactions.reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);
  const totalRechargePaid = rechargeTransactions.reduce((sum, tx) => sum + (Number(tx.paid_amount) || 0), 0);
  const totalRechargeDue = rechargeTransactions.reduce((sum, tx) => sum + (Number(tx.due_amount) || 0), 0);
  const totalDue = dailyTransactions.reduce((sum, tx) => sum + (Number(tx.due_amount) || 0), 0);

  const downloadReport = async () => {
    const element = document.getElementById('daily-report-content');
    if (!element) return;

    setIsDownloading(true);
    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        onclone: (clonedDoc) => {
          const styleTags = clonedDoc.getElementsByTagName('style');
          for (let i = 0; i < styleTags.length; i++) {
            const tag = styleTags[i];
            if (tag.innerHTML.includes('oklch')) {
              tag.innerHTML = tag.innerHTML.replace(/oklch\([^)]+\)/g, '#000000');
            }
          }
        }
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`daily-report-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
    >
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
      >
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h3 className="text-lg font-bold">Daily Sales Report</h3>
          <div className="flex gap-2">
            <button 
              onClick={downloadReport}
              disabled={isDownloading || loading}
              className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-emerald-700 transition-colors disabled:opacity-50"
            >
              {isDownloading ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Download PDF
            </button>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8 bg-white" id="daily-report-content" style={{ color: '#0f172a' }}>
          <div className="text-center mb-8">
            <h2 className="text-2xl font-black" style={{ color: '#0f172a' }}>DeshiShop Manager</h2>
            <p className="text-sm" style={{ color: '#64748b' }}>Daily Sales Summary - {formatDate(new Date().toISOString(), true)}</p>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="p-4 rounded-2xl border" style={{ backgroundColor: '#ecfdf5', borderColor: '#d1fae5' }}>
              <p className="text-[10px] font-bold uppercase mb-1" style={{ color: '#059669' }}>Cash in Hand</p>
              <p className="text-xl font-black" style={{ color: '#064e3b' }}>৳{analytics.cashInHand}</p>
            </div>
            <div className="p-4 rounded-2xl border" style={{ backgroundColor: '#eff6ff', borderColor: '#dbeafe' }}>
              <p className="text-[10px] font-bold uppercase mb-1" style={{ color: '#2563eb' }}>Total Profit</p>
              <p className="text-xl font-black" style={{ color: '#1e3a8a' }}>৳{analytics.totalProfit.toFixed(2)}</p>
            </div>
            <div className="p-4 rounded-2xl border" style={{ backgroundColor: '#fef2f2', borderColor: '#fee2e2' }}>
              <p className="text-[10px] font-bold uppercase mb-1" style={{ color: '#dc2626' }}>Expenses</p>
              <p className="text-xl font-black" style={{ color: '#7f1d1d' }}>৳{analytics.expenses.total}</p>
            </div>
            <div className="p-4 rounded-2xl border" style={{ backgroundColor: '#faf5ff', borderColor: '#f3e8ff' }}>
              <p className="text-[10px] font-bold uppercase mb-1" style={{ color: '#9333ea' }}>MFS Volume</p>
              <p className="text-xl font-black" style={{ color: '#581c87' }}>৳{analytics.mfs.total}</p>
            </div>
            <div className="p-4 rounded-2xl border" style={{ backgroundColor: '#fff7ed', borderColor: '#ffedd5' }}>
              <p className="text-[10px] font-bold uppercase mb-1" style={{ color: '#ea580c' }}>Recharge Total</p>
              <p className="text-xl font-black" style={{ color: '#7c2d12' }}>৳{totalRechargeAmount}</p>
              <div className="flex justify-between text-[8px] font-bold mt-1 uppercase" style={{ color: '#9a3412' }}>
                <span>Paid: ৳{totalRechargePaid}</span>
                <span className="text-red-600">Total Due: ৳{totalDue}</span>
              </div>
            </div>
            <div className="p-4 rounded-2xl border" style={{ backgroundColor: '#fff1f2', borderColor: '#ffe4e6' }}>
              <p className="text-[10px] font-bold uppercase mb-1" style={{ color: '#e11d48' }}>Total Due</p>
              <p className="text-xl font-black" style={{ color: '#881337' }}>৳{totalDue}</p>
            </div>
          </div>

          <div className="space-y-6">
            <h4 className="font-bold border-b pb-2" style={{ color: '#1e293b', borderBottomColor: '#e2e8f0' }}>Detailed Transactions</h4>
            {loading ? (
              <p className="text-center py-10" style={{ color: '#94a3b8' }}>Loading transactions...</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc' }}>
                      <th className="p-2 font-bold" style={{ color: '#64748b' }}>Time</th>
                      <th className="p-2 font-bold" style={{ color: '#64748b' }}>Service</th>
                      <th className="p-2 font-bold" style={{ color: '#64748b' }}>Type</th>
                      <th className="p-2 font-bold" style={{ color: '#64748b' }}>Amount</th>
                      <th className="p-2 font-bold" style={{ color: '#64748b' }}>Due</th>
                      <th className="p-2 font-bold" style={{ color: '#64748b' }}>Phone</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ divideColor: '#f1f5f9' }}>
                    {dailyTransactions.map((tx, idx) => (
                      <tr key={`daily-tx-${tx.source || 'tx'}-${tx.id}-${idx}`}>
                        <td className="p-2" style={{ color: '#64748b' }}>{new Date(tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                        <td className="p-2 font-medium" style={{ color: '#0f172a' }}>{tx.operator || tx.service_type}</td>
                        <td className="p-2" style={{ color: '#0f172a' }}>
                          {tx.source === 'mfs' && tx.type === 'Payment' ? (
                            <span className="text-emerald-600 font-bold">MFS Payment Received</span>
                          ) : (
                            tx.type || tx.variant
                          )}
                        </td>
                        <td className="p-2 font-bold" style={{ color: '#0f172a' }}>৳{tx.amount || tx.price}</td>
                        <td className="p-2 font-bold" style={{ color: (tx.due_amount || 0) > 0 ? '#dc2626' : '#64748b' }}>
                          ৳{tx.due_amount || 0}
                        </td>
                        <td className="p-2" style={{ color: '#64748b' }}>{tx.customer_phone || '-'}</td>
                      </tr>
                    ))}
                    {dailyTransactions.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-4 text-center" style={{ color: '#94a3b8' }}>No transactions recorded today.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="mt-12 pt-8 border-t border-dashed flex justify-between items-end" style={{ borderTopColor: '#e2e8f0' }}>
            <div className="text-[10px]" style={{ color: '#94a3b8' }}>
              <p>Report Generated: {formatDate(new Date().toISOString())}</p>
              <p>System: DeshiShop Manager v2.0</p>
            </div>
            <div className="text-center border-t pt-2 px-8" style={{ borderTopColor: '#cbd5e1' }}>
              <p className="text-xs font-bold" style={{ color: '#475569' }}>Authorized Signature</p>
            </div>
          </div>
        </div>
      </motion.div>

      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #invoice-content, #invoice-content * {
            visibility: visible;
          }
          #invoice-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>
    </motion.div>
  );
}

function MFSModule({ 
  onComplete, 
  initialType = 'Cash-in',
  externalBalances,
  refreshBalances,
  fetchWithAuth,
  currentUser
}: { 
  onComplete: (tx: Transaction) => void; 
  initialType?: string;
  externalBalances?: { [key: string]: number };
  refreshBalances?: () => void;
  fetchWithAuth: any;
  currentUser: User | null;
}) {
  const [formData, setFormData] = useState({ operator: 'bKash', type: initialType, amount: '', customer_phone: '', trx_id: '', vendor_id: '', shop_number_id: '' });
  const [paymentData, setPaymentData] = useState({ status: 'Paid', paid: 0, due: 0, customerId: null as string | null });
  const [submitting, setSubmitting] = useState(false);
  const [localBalances, setLocalBalances] = useState<{ [key: string]: number }>({});
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [shopNumbers, setShopNumbers] = useState<any[]>([]);

  const balances = externalBalances || localBalances;

  const fetchBalances = async () => {
    if (refreshBalances) {
      refreshBalances();
      return;
    }
    try {
      const res = await fetchWithAuth('/api/mfs/balances');
      const data = await res.json();
      setLocalBalances(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchVendors = async () => {
    try {
      const res = await fetchWithAuth('/api/vendors');
      const data = await res.json();
      setVendors(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchShopNumbers = async () => {
    try {
      const res = await fetchWithAuth('/api/shop-numbers');
      const data = await res.json();
      setShopNumbers(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchBalances();
    fetchVendors();
    fetchShopNumbers();
  }, []);

  useEffect(() => {
    setFormData(prev => ({ ...prev, type: initialType }));
  }, [initialType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await fetchWithAuth('/api/mfs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          amount: parseFloat(formData.amount),
          vendor_id: formData.vendor_id ? parseInt(formData.vendor_id) : null,
          shop_number_id: formData.shop_number_id ? parseInt(formData.shop_number_id) : null,
          payment_status: paymentData.status,
          paid_amount: paymentData.paid,
          due_amount: paymentData.due,
          customer_id: paymentData.customerId
        })
      });
      const tx = { 
        ...formData, 
        amount: parseFloat(formData.amount), 
        payment_status: paymentData.status,
        paid_amount: paymentData.paid,
        due_amount: paymentData.due,
        customer_id: paymentData.customerId,
        timestamp: new Date().toISOString() 
      } as any;
      setFormData({ ...formData, amount: '', customer_phone: '', trx_id: '', vendor_id: '', shop_number_id: '' });
      fetchBalances();
      onComplete(tx);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredNumbers = shopNumbers.filter(n => n.operator === formData.operator);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        {['bKash', 'Nagad', 'Rocket'].map(op => (
          <Card key={`mfs-op-${op}`} className="p-4 flex items-center justify-between border-slate-200">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                op === 'bKash' ? 'bg-pink-100 text-pink-600' :
                op === 'Nagad' ? 'bg-orange-100 text-orange-600' :
                'bg-blue-100 text-blue-600'
              }`}>
                <Wallet className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase">{op} Balance</p>
                <h4 className="text-lg font-black">৳{balances[op] || 0}</h4>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card className="max-w-md mx-auto">
        <div className="flex gap-2 mb-6 p-1 bg-slate-100 rounded-2xl">
          <button 
            onClick={() => setFormData({ ...formData, type: 'Cash-in', vendor_id: '' })}
            className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${
              !['B2B-Buy', 'B2B-Pay'].includes(formData.type) ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Consumer
          </button>
          <button 
            onClick={() => setFormData({ ...formData, type: 'B2B-Buy', vendor_id: '' })}
            className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${
              ['B2B-Buy', 'B2B-Pay'].includes(formData.type) ? 'bg-indigo-600 shadow-sm text-white' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            B2B (Vendor)
          </button>
        </div>

        <h3 className="text-xl font-bold mb-6">
          {formData.type === 'Receive' ? 'Receive Money' : 
           formData.type === 'Payment' ? 'Payment Received' :
           formData.type.startsWith('B2B') ? 'B2B Transaction' : 'MFS Transaction'}
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            {['bKash', 'Nagad', 'Rocket'].map(op => (
              <button
                key={`mfs-op-select-${op}`}
                type="button"
                onClick={() => setFormData({ ...formData, operator: op })}
                className={`py-2 rounded-xl text-sm font-bold border-2 transition-all ${
                  formData.operator === op ? 'border-emerald-600 bg-emerald-50 text-emerald-700' : 'border-slate-100 bg-slate-50 text-slate-400'
                }`}
              >
                {op}
              </button>
            ))}
          </div>

          {!['B2B-Buy', 'B2B-Pay'].includes(formData.type) && (
            <div className="grid grid-cols-3 gap-2">
              {['Cash-in', 'Cash-out', 'Send Money', 'Receive', 'Payment'].map(type => (
                <button
                  key={`mfs-type-${type}`}
                  type="button"
                  onClick={() => setFormData({ ...formData, type })}
                  className={`py-2 rounded-xl text-[10px] font-bold border-2 transition-all ${
                    formData.type === type ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-100 bg-slate-50 text-slate-400'
                  }`}
                >
                  {type === 'Receive' ? 'Receive Money' : type}
                </button>
              ))}
            </div>
          )}

          {formData.type.startsWith('B2B') && (
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'B2B Buy (Balance In)', value: 'B2B-Buy' },
                { label: 'B2B Pay (Balance Out)', value: 'B2B-Pay' }
              ].map(t => (
                <button
                  key={`mfs-b2b-type-${t.value}`}
                  type="button"
                  onClick={() => setFormData({ ...formData, type: t.value })}
                  className={`py-2 px-1 rounded-xl text-[10px] font-bold border-2 transition-all ${
                    formData.type === t.value ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-100 bg-slate-50 text-slate-400'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}

          {formData.type.startsWith('B2B') && (
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Select Vendor</label>
              <select 
                required
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                value={formData.vendor_id}
                onChange={e => setFormData({ ...formData, vendor_id: e.target.value })}
              >
                <option value="">Choose a vendor...</option>
                {vendors.map(v => (
                  <option key={`mfs-vendor-opt-${v.id}`} value={v.id}>{v.name} (Bal: ৳{v.balance})</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Amount (৳)</label>
            <input 
              type="number" required
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
              value={formData.amount}
              onChange={e => setFormData({ ...formData, amount: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">
              {formData.type === 'Receive' ? 'Customer Phone' : 
               formData.type.startsWith('B2B') ? 'Reference/Phone' : 'Phone Number'}
            </label>
            <input 
              type="tel" required
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
              value={formData.customer_phone}
              onChange={e => setFormData({ ...formData, customer_phone: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Select Agent/Personal Number</label>
            <select 
              required
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
              value={formData.shop_number_id}
              onChange={e => setFormData({ ...formData, shop_number_id: e.target.value })}
            >
              <option value="">Choose your number...</option>
              {filteredNumbers.map(n => (
                <option key={n.id} value={n.id}>{n.number} ({n.type})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">TrxID (Optional)</label>
            <input 
              type="text"
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
              value={formData.trx_id}
              onChange={e => setFormData({ ...formData, trx_id: e.target.value })}
            />
          </div>

          <PaymentInput 
            totalAmount={parseFloat(formData.amount) || 0} 
            onPaymentChange={setPaymentData} 
            fetchWithAuth={fetchWithAuth}
            hideCustomer={formData.type.startsWith('B2B')}
          />

          <button 
            disabled={submitting || currentUser?.role === 'manager'}
            className={`w-full py-4 text-white font-bold rounded-xl transition-colors shadow-lg disabled:opacity-50 ${
              ['Receive', 'Payment'].includes(formData.type) ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200' : 
              formData.type.startsWith('B2B') ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200' :
              'bg-blue-600 hover:bg-blue-700 shadow-blue-200'
            }`}
          >
            {submitting ? 'Processing...' : currentUser?.role === 'manager' ? 'Read Only Mode' : 'Save Transaction'}
          </button>
        </form>
      </Card>
    </div>
  );
}

function RechargeModule({ 
  onComplete,
  externalBalances,
  refreshBalances,
  fetchWithAuth,
  currentUser
}: { 
  onComplete: (tx: Transaction) => void;
  externalBalances?: { [key: string]: number };
  refreshBalances?: () => void;
  fetchWithAuth: any;
  currentUser: User | null;
}) {
  const [formData, setFormData] = useState({ operator: 'GP', type: 'Recharge', amount: '', cashback: '', customer_phone: '', vendor_id: '', shop_number_id: '' });
  const [paymentData, setPaymentData] = useState({ status: 'Paid', paid: 0, due: 0, customerId: null as string | null });
  const [submitting, setSubmitting] = useState(false);
  const [localBalances, setLocalBalances] = useState<{ [key: string]: number }>({});
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [shopNumbers, setShopNumbers] = useState<any[]>([]);

  const balances = externalBalances || localBalances;

  const fetchBalances = async () => {
    if (refreshBalances) {
      refreshBalances();
      return;
    }
    try {
      const res = await fetchWithAuth('/api/recharge/balances');
      const data = await res.json();
      setLocalBalances(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchVendors = async () => {
    try {
      const res = await fetchWithAuth('/api/vendors');
      const data = await res.json();
      setVendors(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchShopNumbers = async () => {
    try {
      const res = await fetchWithAuth('/api/shop-numbers');
      const data = await res.json();
      setShopNumbers(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchBalances();
    fetchVendors();
    fetchShopNumbers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await fetchWithAuth('/api/recharge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          amount: parseFloat(formData.amount),
          cashback: parseFloat(formData.cashback) || 0,
          vendor_id: formData.vendor_id ? parseInt(formData.vendor_id) : null,
          shop_number_id: formData.shop_number_id ? parseInt(formData.shop_number_id) : null,
          payment_status: paymentData.status,
          paid_amount: paymentData.paid,
          due_amount: paymentData.due,
          customer_id: paymentData.customerId
        })
      });
      const tx = { 
        ...formData, 
        amount: parseFloat(formData.amount), 
        cashback: parseFloat(formData.cashback) || 0, 
        type: formData.type === 'Recharge' ? 'Recharge' : formData.type, 
        payment_status: paymentData.status,
        paid_amount: paymentData.paid,
        due_amount: paymentData.due,
        customer_id: paymentData.customerId,
        timestamp: new Date().toISOString() 
      } as any;
      setFormData({ ...formData, amount: '', cashback: '', customer_phone: '', vendor_id: '', shop_number_id: '' });
      fetchBalances();
      onComplete(tx);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredNumbers = shopNumbers.filter(n => n.operator === formData.operator);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-5 gap-2">
        {['GP', 'Robi', 'BL', 'Airtel', 'Teletalk'].map(op => (
          <div key={`rech-op-stat-${op}`} className="bg-white p-2 rounded-xl border border-slate-100 flex flex-col items-center shadow-sm">
            <span className="text-[10px] font-bold text-slate-400 uppercase">{op}</span>
            <span className="text-xs font-black text-slate-900">৳{balances[op] || 0}</span>
          </div>
        ))}
      </div>

      <Card className="max-w-md mx-auto">
        <div className="flex gap-2 mb-6 p-1 bg-slate-100 rounded-2xl">
          <button 
            onClick={() => setFormData({ ...formData, type: 'Recharge', vendor_id: '' })}
            className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${
              formData.type === 'Recharge' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Consumer
          </button>
          <button 
            onClick={() => setFormData({ ...formData, type: 'B2B-Buy', vendor_id: '' })}
            className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${
              formData.type.startsWith('B2B') ? 'bg-blue-600 shadow-sm text-white' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            B2B (Vendor)
          </button>
        </div>

        <h3 className="text-xl font-bold mb-6">
          {formData.type === 'Recharge' ? 'Mobile Recharge' : 'B2B Recharge Transaction'}
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-5 gap-1">
            {['GP', 'Robi', 'BL', 'Airtel', 'Teletalk'].map(op => (
              <button
                key={`rech-op-select-${op}`}
                type="button"
                onClick={() => setFormData({ ...formData, operator: op })}
                className={`py-2 rounded-lg text-[10px] font-bold border transition-all ${
                  formData.operator === op ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-100 bg-slate-50 text-slate-400'
                }`}
              >
                {op}
              </button>
            ))}
          </div>

          {formData.type.startsWith('B2B') && (
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'B2B Buy (Stock In)', value: 'B2B-Buy' },
                { label: 'B2B Pay (Stock Out)', value: 'B2B-Pay' }
              ].map(t => (
                <button
                  key={`rech-b2b-type-${t.value}`}
                  type="button"
                  onClick={() => setFormData({ ...formData, type: t.value })}
                  className={`py-2 px-1 rounded-xl text-[10px] font-bold border-2 transition-all ${
                    formData.type === t.value ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-100 bg-slate-50 text-slate-400'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}

          {formData.type.startsWith('B2B') && (
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Select Vendor</label>
              <select 
                required
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.vendor_id}
                onChange={e => setFormData({ ...formData, vendor_id: e.target.value })}
              >
                <option value="">Choose a vendor...</option>
                {vendors.map(v => (
                  <option key={`rech-vendor-opt-${v.id}`} value={v.id}>{v.name} (Bal: ৳{v.balance})</option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Amount (৳)</label>
              <input 
                type="number" required
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.amount}
                onChange={e => setFormData({ ...formData, amount: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">
                {formData.type === 'B2B-Buy' ? 'Commission (৳)' : 'Cashback (৳) - Optional'}
              </label>
              <input 
                type="number"
                placeholder="0"
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.cashback}
                onChange={e => setFormData({ ...formData, cashback: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">
              {formData.type.startsWith('B2B') ? 'Reference/Phone' : 'Phone Number'}
            </label>
            <input 
              type="tel" required
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.customer_phone}
              onChange={e => setFormData({ ...formData, customer_phone: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Select Agent/Personal Number</label>
            <select 
              required
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.shop_number_id}
              onChange={e => setFormData({ ...formData, shop_number_id: e.target.value })}
            >
              <option value="">Choose your number...</option>
              {filteredNumbers.map(n => (
                <option key={n.id} value={n.id}>{n.number} ({n.type})</option>
              ))}
            </select>
          </div>

          <PaymentInput 
            totalAmount={parseFloat(formData.amount) || 0} 
            onPaymentChange={setPaymentData} 
            fetchWithAuth={fetchWithAuth}
            hideCustomer={formData.type.startsWith('B2B')}
          />

          <button 
            disabled={submitting || currentUser?.role === 'manager'}
            className={`w-full py-4 text-white font-bold rounded-xl transition-colors shadow-lg disabled:opacity-50 ${
              formData.type.startsWith('B2B') ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'
            }`}
          >
            {submitting ? 'Processing...' : currentUser?.role === 'manager' ? 'Read Only Mode' : formData.type === 'Recharge' ? 'Complete Recharge' : 'Save Transaction'}
          </button>
        </form>
      </Card>
    </div>
  );
}

function ServicesModule({ onComplete, fetchWithAuth, currentUser }: { onComplete: (tx: Transaction) => void; fetchWithAuth: any; currentUser: User | null }) {
  const [formData, setFormData] = useState({ service_type: 'Photocopy', variant: 'A4 BW', pages: '1', price: '5' });
  const [paymentData, setPaymentData] = useState({ status: 'Paid', paid: 0, due: 0, customerId: null as string | null });
  const [submitting, setSubmitting] = useState(false);
  const [costs, setCosts] = useState({ bw: 2, color: 12 });

  useEffect(() => {
    fetchWithAuth('/api/settings')
      .then((res: any) => res.json())
      .then((data: any) => {
        const bw = data.find((s: any) => s.key === 'cost_bw')?.value || 2;
        const color = data.find((s: any) => s.key === 'cost_color')?.value || 12;
        setCosts({ bw: parseFloat(bw), color: parseFloat(color) });
      });
  }, []);

  const presets = [
    { label: 'A4 BW', price: 5 },
    { label: 'A4 Color', price: 20 },
    { label: 'Legal BW', price: 10 },
    { label: 'Legal Color', price: 30 },
  ];

  const currentUnitCost = formData.variant.toLowerCase().includes('color') ? costs.color : costs.bw;
  const estimatedProfit = parseFloat(formData.price) - (parseInt(formData.pages) * currentUnitCost);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await fetchWithAuth('/api/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          payment_status: paymentData.status,
          paid_amount: paymentData.paid,
          due_amount: paymentData.due,
          customer_id: paymentData.customerId
        })
      });
      const tx = { 
        ...formData, 
        price: parseFloat(formData.price), 
        pages: parseInt(formData.pages), 
        payment_status: paymentData.status,
        paid_amount: paymentData.paid,
        due_amount: paymentData.due,
        customer_id: paymentData.customerId,
        timestamp: new Date().toISOString() 
      } as any;
      onComplete(tx);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="max-w-md mx-auto">
      <h3 className="text-xl font-bold mb-6">Print & Copy</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          {['Photocopy', 'Print'].map(type => (
            <button
              key={type}
              type="button"
              onClick={() => setFormData({ ...formData, service_type: type })}
              className={`py-2 rounded-xl text-sm font-bold border-2 transition-all ${
                formData.service_type === type ? 'border-orange-600 bg-orange-50 text-orange-700' : 'border-slate-100 bg-slate-50 text-slate-400'
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2">
          {presets.map(p => (
            <button
              key={p.label}
              type="button"
              onClick={() => setFormData({ ...formData, variant: p.label, price: (parseInt(formData.pages) * p.price).toString() })}
              className={`p-3 rounded-xl text-xs font-bold border transition-all text-left ${
                formData.variant === p.label ? 'border-orange-600 bg-orange-50 text-orange-700' : 'border-slate-100 bg-slate-50 text-slate-600'
              }`}
            >
              <div className="flex justify-between">
                <span>{p.label}</span>
                <span>৳{p.price}</span>
              </div>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Pages</label>
            <input 
              type="number" required
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500"
              value={formData.pages}
              onChange={e => {
                const pages = e.target.value;
                const unitPrice = presets.find(p => p.label === formData.variant)?.price || 5;
                setFormData({ ...formData, pages, price: (parseInt(pages || '0') * unitPrice).toString() });
              }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Total Price (৳)</label>
            <input 
              type="number" required
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500"
              value={formData.price}
              onChange={e => setFormData({ ...formData, price: e.target.value })}
            />
          </div>
        </div>

        <PaymentInput 
          totalAmount={parseFloat(formData.price) || 0} 
          onPaymentChange={setPaymentData} 
          fetchWithAuth={fetchWithAuth}
        />

        <button 
          disabled={submitting || currentUser?.role === 'manager'}
          className="w-full py-4 bg-orange-600 text-white font-bold rounded-xl hover:bg-orange-700 transition-colors shadow-lg shadow-orange-200 disabled:opacity-50"
        >
          {submitting ? 'Processing...' : currentUser?.role === 'manager' ? 'Read Only Mode' : 'Record Sale'}
        </button>

        <div className="text-center">
          <p className="text-xs text-slate-400">
            Estimated Profit: <span className="text-emerald-600 font-bold">৳{estimatedProfit.toFixed(2)}</span>
          </p>
          <p className="text-[10px] text-slate-300 mt-1">
            (Based on unit cost: ৳{currentUnitCost}/page)
          </p>
        </div>
      </form>
    </Card>
  );
}

function OtherSalesModule({ onComplete, fetchWithAuth, currentUser }: { onComplete: (tx: Transaction) => void; fetchWithAuth: any; currentUser: User | null }) {
  const [formData, setFormData] = useState({ item_name: '', amount: '', profit: '' });
  const [paymentData, setPaymentData] = useState({ status: 'Paid', paid: 0, due: 0, customerId: null as string | null });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await fetchWithAuth('/api/other-sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          amount: parseFloat(formData.amount),
          profit: parseFloat(formData.profit || '0'),
          payment_status: paymentData.status,
          paid_amount: paymentData.paid,
          due_amount: paymentData.due,
          customer_id: paymentData.customerId
        })
      });
      const tx = { 
        operator: formData.item_name, 
        type: 'Sale', 
        amount: parseFloat(formData.amount), 
        payment_status: paymentData.status,
        paid_amount: paymentData.paid,
        due_amount: paymentData.due,
        customer_id: paymentData.customerId,
        timestamp: new Date().toISOString() 
      } as any;
      setFormData({ item_name: '', amount: '', profit: '' });
      onComplete(tx);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="max-w-md mx-auto">
      <h3 className="text-xl font-bold mb-6">Other Services / Sales</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">Item Name</label>
          <input 
            type="text" required
            placeholder="e.g. Spiral Binding, Lamination"
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-pink-500"
            value={formData.item_name}
            onChange={e => setFormData({ ...formData, item_name: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">Sales Amount (৳)</label>
          <input 
            type="number" required
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-pink-500"
            value={formData.amount}
            onChange={e => setFormData({ ...formData, amount: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">Profit (৳ - Optional)</label>
          <input 
            type="number"
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-pink-500"
            value={formData.profit}
            onChange={e => setFormData({ ...formData, profit: e.target.value })}
          />
        </div>

        <PaymentInput 
          totalAmount={parseFloat(formData.amount) || 0} 
          onPaymentChange={setPaymentData} 
          fetchWithAuth={fetchWithAuth}
        />

        <button 
          disabled={submitting || currentUser?.role === 'manager'}
          className="w-full py-4 bg-pink-600 text-white font-bold rounded-xl hover:bg-pink-700 transition-colors shadow-lg shadow-pink-200 disabled:opacity-50"
        >
          {submitting ? 'Processing...' : currentUser?.role === 'manager' ? 'Read Only Mode' : 'Save Sale'}
        </button>
      </form>
    </Card>
  );
}

function ExpenseModule({ onComplete, fetchWithAuth, currentUser }: { onComplete: (tx: Transaction) => void; fetchWithAuth: any; currentUser: User | null }) {
  const [formData, setFormData] = useState({ category: 'Others', description: '', amount: '', customCategory: '' });
  const [paymentData, setPaymentData] = useState({ status: 'Paid', paid: 0, due: 0, customerId: null as string | null });
  const [submitting, setSubmitting] = useState(false);
  const [isCustom, setIsCustom] = useState(false);

  const categories = ['Shop Rent', 'Electricity', 'Vendor Payment', 'Utilities', 'Salaries', 'Stationery', 'Others'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const finalCategory = isCustom ? formData.customCategory : formData.category;
    
    if (isCustom && !formData.customCategory.trim()) {
      alert("Please enter a custom category name.");
      setSubmitting(false);
      return;
    }

    try {
      await fetchWithAuth('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: finalCategory,
          description: formData.description,
          amount: parseFloat(formData.amount),
          payment_status: paymentData.status,
          paid_amount: paymentData.paid,
          due_amount: paymentData.due,
          vendor_id: paymentData.customerId
        })
      });
      const tx = { 
        operator: finalCategory, 
        type: 'Expense', 
        amount: parseFloat(formData.amount), 
        customer_phone: formData.description,
        payment_status: paymentData.status,
        paid_amount: paymentData.paid,
        due_amount: paymentData.due,
        timestamp: new Date().toISOString() 
      } as any;
      setFormData({ category: 'Others', description: '', amount: '', customCategory: '' });
      setIsCustom(false);
      onComplete(tx);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="max-w-md mx-auto">
      <h3 className="text-xl font-bold mb-6">Costs & Vendor Payments</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          {categories.map(cat => (
            <button
              key={cat}
              type="button"
              onClick={() => {
                setFormData({ ...formData, category: cat });
                setIsCustom(false);
              }}
              className={`py-2 px-1 rounded-xl text-[10px] font-bold border-2 transition-all ${
                formData.category === cat && !isCustom ? 'border-red-600 bg-red-50 text-red-700' : 'border-slate-100 bg-slate-50 text-slate-400'
              }`}
            >
              {cat}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setIsCustom(true)}
            className={`py-2 px-1 rounded-xl text-[10px] font-bold border-2 transition-all ${
              isCustom ? 'border-red-600 bg-red-50 text-red-700' : 'border-slate-100 bg-slate-50 text-slate-400'
            }`}
          >
            + New Category
          </button>
        </div>

        {isCustom && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <label className="block text-sm font-medium text-slate-600 mb-1">Custom Category Name</label>
            <input 
              type="text" required
              placeholder="e.g. Internet Bill, Maintenance"
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-red-500"
              value={formData.customCategory}
              onChange={e => setFormData({ ...formData, customCategory: e.target.value })}
            />
          </motion.div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">Description</label>
          <input 
            type="text" required
            placeholder="e.g. Paid to bKash Agent"
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-red-500"
            value={formData.description}
            onChange={e => setFormData({ ...formData, description: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">Amount (৳)</label>
          <input 
            type="number" required
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-red-500"
            value={formData.amount}
            onChange={e => setFormData({ ...formData, amount: e.target.value })}
          />
        </div>

        <PaymentInput 
          totalAmount={parseFloat(formData.amount) || 0} 
          onPaymentChange={setPaymentData}
          fetchWithAuth={fetchWithAuth}
          isExpense={true}
          forceShowSelection={formData.category === 'Vendor Payment'}
        />

        <button 
          disabled={submitting || currentUser?.role === 'manager'}
          className="w-full py-4 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors shadow-lg shadow-red-200 disabled:opacity-50"
        >
          {submitting ? 'Processing...' : currentUser?.role === 'manager' ? 'Read Only Mode' : 'Save Expense'}
        </button>
      </form>
    </Card>
  );
}

function VendorsModule({ fetchWithAuth, currentUser, t, formatDate }: { fetchWithAuth: any; currentUser: User | null; t: any; formatDate: any }) {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);

  const fetchVendors = async () => {
    try {
      const res = await fetchWithAuth('/api/vendors');
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) throw new Error("Received non-JSON response");
      const data = await res.json();
      setVendors(data);
    } catch (err) {
      console.error("Failed to fetch vendors:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold">Vendors Ledger</h3>
        {currentUser?.role !== 'manager' && (
          <button 
            onClick={() => setShowAddModal(true)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 transition-colors"
          >
            <PlusCircle className="w-5 h-5" /> Add Vendor
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4">
        {vendors.map(vendor => (
          <Card key={`vendor-${vendor.id}`} className="cursor-pointer hover:border-indigo-200 transition-all" onClick={() => setSelectedVendor(vendor)}>
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-indigo-50 rounded-xl">
                <Users className="w-6 h-6 text-indigo-600" />
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500 uppercase font-bold">Balance</p>
                <p className={`text-lg font-black ${vendor.balance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                  ৳{Math.abs(vendor.balance)}
                  <span className="text-[10px] ml-1">{vendor.balance > 0 ? 'Due' : 'Advance'}</span>
                </p>
              </div>
            </div>
            <h4 className="font-bold text-lg">{vendor.name}</h4>
            <p className="text-sm text-slate-500">{vendor.phone || 'No phone'}</p>
            <p className="text-xs text-slate-400 mt-2 line-clamp-1">{vendor.details || 'No details'}</p>
          </Card>
        ))}
        {vendors.length === 0 && (
          <div className="col-span-full py-20 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 font-medium">{t.noDataFound}</p>
          </div>
        )}
      </div>

      {showAddModal && createPortal(
        <AddVendorModal 
          onClose={() => setShowAddModal(false)} 
          onSuccess={() => { setShowAddModal(false); fetchVendors(); }} 
          fetchWithAuth={fetchWithAuth}
        />,
        document.body
      )}

      {selectedVendor && createPortal(
        <VendorLedgerModal 
          vendor={selectedVendor} 
          onClose={() => setSelectedVendor(null)} 
          onUpdate={fetchVendors}
          fetchWithAuth={fetchWithAuth}
          currentUser={currentUser}
          t={t}
          formatDate={formatDate}
        />,
        document.body
      )}
    </div>
  );
}

function AddVendorModal({ onClose, onSuccess, fetchWithAuth }: { onClose: () => void; onSuccess: (id: number) => void; fetchWithAuth: any }) {
  const [formData, setFormData] = useState({ name: '', phone: '', details: '' });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetchWithAuth('/api/vendors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      onSuccess(data.id);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold">Add New Vendor</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Vendor Name</label>
            <input type="text" required className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Phone Number</label>
            <input type="tel" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Details/Address</label>
            <textarea className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 h-24" value={formData.details} onChange={e => setFormData({ ...formData, details: e.target.value })} />
          </div>
          <button disabled={submitting} className="w-full py-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50">
            {submitting ? 'Saving...' : 'Save Vendor'}
          </button>
        </form>
      </Card>
    </div>
  );
}

function CustomersModule({ fetchWithAuth, currentUser, refreshKey, t, formatDate }: { fetchWithAuth: any; currentUser: User | null; refreshKey?: number; t: any; formatDate: any }) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const fetchCustomers = async () => {
    try {
      const res = await fetchWithAuth('/api/customers');
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) throw new Error("Received non-JSON response");
      const data = await res.json();
      setCustomers(data);
    } catch (err) {
      console.error("Failed to fetch customers:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [refreshKey]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold">Customer Dues</h3>
        {currentUser?.role !== 'manager' && (
          <button 
            onClick={() => setShowAddModal(true)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 transition-colors"
          >
            <PlusCircle className="w-5 h-5" /> Add Customer
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4">
        {customers.map(customer => (
          <Card key={`customer-${customer.id}`} className="cursor-pointer hover:border-indigo-200 transition-all" onClick={() => setSelectedCustomer(customer)}>
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-indigo-50 rounded-xl">
                <Users className="w-6 h-6 text-indigo-600" />
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500 uppercase font-bold">Total Due</p>
                <p className={`text-lg font-black ${customer.balance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                  ৳{Math.abs(customer.balance)}
                  <span className="text-[10px] ml-1">{customer.balance > 0 ? 'Due' : 'Advance'}</span>
                </p>
              </div>
            </div>
            <h4 className="font-bold text-lg">{customer.name}</h4>
            <p className="text-sm text-slate-500">{customer.phone || 'No phone'}</p>
            <p className="text-xs text-slate-400 mt-2 line-clamp-1">{customer.address || 'No address'}</p>
          </Card>
        ))}
        {customers.length === 0 && (
          <div className="col-span-full py-20 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 font-medium">{t.noDataFound}</p>
          </div>
        )}
      </div>

      {showAddModal && createPortal(
        <AddCustomerModal 
          onClose={() => setShowAddModal(false)} 
          onSuccess={() => { setShowAddModal(false); fetchCustomers(); }} 
          fetchWithAuth={fetchWithAuth}
        />,
        document.body
      )}

      {selectedCustomer && createPortal(
        <CustomerLedgerModal 
          customer={selectedCustomer} 
          onClose={() => setSelectedCustomer(null)} 
          onUpdate={fetchCustomers}
          fetchWithAuth={fetchWithAuth}
          currentUser={currentUser}
          t={t}
          formatDate={formatDate}
        />,
        document.body
      )}
    </div>
  );
}

function AddCustomerModal({ onClose, onSuccess, fetchWithAuth }: { onClose: () => void; onSuccess: (id: number) => void; fetchWithAuth: any }) {
  const [formData, setFormData] = useState({ name: '', phone: '', address: '' });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetchWithAuth('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      onSuccess(data.id);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold">Add New Customer</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Customer Name</label>
            <input type="text" required className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Phone Number</label>
            <input type="tel" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Address/Details</label>
            <textarea className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 h-24" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} />
          </div>
          <button disabled={submitting} className="w-full py-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50">
            {submitting ? 'Saving...' : 'Save Customer'}
          </button>
        </form>
      </Card>
    </div>
  );
}

function CustomerLedgerModal({ customer, onClose, onUpdate, fetchWithAuth, currentUser, t, formatDate }: { customer: Customer; onClose: () => void; onUpdate: () => void; fetchWithAuth: any; currentUser: User | null; t: any; formatDate: any }) {
  const [ledger, setLedger] = useState<CustomerTransaction[]>([]);
  const [showAddTx, setShowAddTx] = useState(false);
  const [txForm, setTxForm] = useState({ type: 'Due', amount: '', description: '' });

  const fetchLedger = async () => {
    try {
      const res = await fetchWithAuth(`/api/customers/${customer.id}/ledger`);
      const data = await res.json();
      setLedger(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchLedger();
  }, [customer.id]);

  const handleAddTx = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetchWithAuth('/api/customer-transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: customer.id,
          ...txForm,
          amount: parseFloat(txForm.amount)
        })
      });
      setTxForm({ type: 'Due', amount: '', description: '' });
      setShowAddTx(false);
      fetchLedger();
      onUpdate();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteTx = async (id: number) => {
    if (!confirm('Are you sure you want to delete this entry?')) return;
    try {
      await fetchWithAuth(`/api/customer-transactions/${id}`, { method: 'DELETE' });
      fetchLedger();
      onUpdate();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <div>
            <h3 className="text-xl font-bold">{customer.name} - Ledger</h3>
            <p className="text-sm text-slate-500">{customer.phone}</p>
          </div>
          <div className="flex items-center gap-4">
            {currentUser?.role !== 'manager' && (
              <button 
                onClick={() => setShowAddTx(!showAddTx)} 
                className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold"
              >
                {showAddTx ? 'Cancel' : 'Add Entry'}
              </button>
            )}
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full"><X className="w-5 h-5" /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <AnimatePresence>
            {showAddTx && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mb-6">
                <form onSubmit={handleAddTx} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-4">
                  <h4 className="text-sm font-bold text-slate-700 mb-2">New Transaction</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Type</label>
                      <select className="w-full p-2 bg-white border border-slate-200 rounded-lg outline-none" value={txForm.type} onChange={e => setTxForm({ ...txForm, type: e.target.value })}>
                        <option value="Due">Due (Baki)</option>
                        <option value="Payment">Payment (Joma)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Amount (৳)</label>
                      <input type="number" required className="w-full p-2 bg-white border border-slate-200 rounded-lg outline-none" value={txForm.amount} onChange={e => setTxForm({ ...txForm, amount: e.target.value })} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Description</label>
                    <input type="text" required placeholder="e.g. Printed 100 pages" className="w-full p-2 bg-white border border-slate-200 rounded-lg outline-none" value={txForm.description} onChange={e => setTxForm({ ...txForm, description: e.target.value })} />
                  </div>
                  <button 
                    disabled={currentUser?.role === 'manager'}
                    className="w-full py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                  >
                    {currentUser?.role === 'manager' ? 'Read Only Mode' : 'Save Entry'}
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-3">
            {ledger.map((tx, idx) => (
              <div key={`cust-ledger-tx-${tx.id}-${idx}`} className="flex justify-between items-center p-3 border-b border-slate-50 hover:bg-slate-50 transition-colors group">
                <div className="flex-1">
                  <p className="text-sm font-bold">{tx.description}</p>
                  <p className="text-[10px] text-slate-400">{formatDate(tx.timestamp)}</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className={`font-black ${tx.type === 'Due' ? 'text-red-600' : 'text-emerald-600'}`}>
                      {tx.type === 'Due' ? '+' : '-'} ৳{tx.amount}
                    </p>
                    <p className="text-[10px] text-slate-400 uppercase font-bold">{tx.type}</p>
                  </div>
                  {currentUser?.role !== 'manager' && (
                    <button onClick={() => handleDeleteTx(tx.id)} className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-all">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
            {ledger.length === 0 && (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <Search className="w-8 h-8 text-slate-200" />
                <p className="text-center text-slate-400">{t.noDataFound}</p>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}

function VendorLedgerModal({ vendor, onClose, onUpdate, fetchWithAuth, currentUser, t, formatDate }: { vendor: Vendor; onClose: () => void; onUpdate: () => void; fetchWithAuth: any; currentUser: User | null; t: any; formatDate: any }) {
  const [ledger, setLedger] = useState<VendorTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddTx, setShowAddTx] = useState(false);
  const [editingTx, setEditingTx] = useState<VendorTransaction | null>(null);
  const [txForm, setTxForm] = useState({ type: 'Purchase', amount: '', description: '' });

  const fetchLedger = async () => {
    try {
      const res = await fetchWithAuth(`/api/vendors/${vendor.id}/ledger`);
      const data = await res.json();
      setLedger(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLedger();
  }, [vendor.id]);

  const handleAddTx = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingTx) {
        await fetchWithAuth(`/api/vendor-transactions/${editingTx.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...txForm,
            amount: parseFloat(txForm.amount)
          })
        });
        setEditingTx(null);
      } else {
        await fetchWithAuth('/api/vendor-transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            vendor_id: vendor.id,
            ...txForm,
            amount: parseFloat(txForm.amount)
          })
        });
      }
      setTxForm({ type: 'Purchase', amount: '', description: '' });
      setShowAddTx(false);
      fetchLedger();
      onUpdate();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteTx = async (id: number) => {
    if (!confirm('Are you sure you want to delete this entry?')) return;
    try {
      await fetchWithAuth(`/api/vendor-transactions/${id}`, { method: 'DELETE' });
      fetchLedger();
      onUpdate();
    } catch (err) {
      console.error(err);
    }
  };

  const handleEditClick = (tx: VendorTransaction) => {
    setEditingTx(tx);
    setTxForm({ type: tx.type, amount: tx.amount.toString(), description: tx.description });
    setShowAddTx(true);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <div>
            <h3 className="text-xl font-bold">{vendor.name} - Ledger</h3>
            <p className="text-sm text-slate-500">{vendor.phone}</p>
          </div>
          <div className="flex items-center gap-4">
            {currentUser?.role !== 'manager' && (
              <button 
                onClick={() => {
                  if (showAddTx) {
                    setEditingTx(null);
                    setTxForm({ type: 'Purchase', amount: '', description: '' });
                  }
                  setShowAddTx(!showAddTx);
                }} 
                className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold"
              >
                {showAddTx ? 'Cancel' : 'Add Entry'}
              </button>
            )}
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full"><X className="w-5 h-5" /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <AnimatePresence>
            {showAddTx && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mb-6">
                <form onSubmit={handleAddTx} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-4">
                  <h4 className="text-sm font-bold text-slate-700 mb-2">{editingTx ? 'Edit Transaction' : 'New Transaction'}</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Type</label>
                      <select className="w-full p-2 bg-white border border-slate-200 rounded-lg outline-none" value={txForm.type} onChange={e => setTxForm({ ...txForm, type: e.target.value })}>
                        <option value="Purchase">Purchase (Due)</option>
                        <option value="Payment">Payment (Cash Out)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Amount (৳)</label>
                      <input type="number" required className="w-full p-2 bg-white border border-slate-200 rounded-lg outline-none" value={txForm.amount} onChange={e => setTxForm({ ...txForm, amount: e.target.value })} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Description</label>
                    <input type="text" required placeholder="e.g. Bought 10 Paper Rims" className="w-full p-2 bg-white border border-slate-200 rounded-lg outline-none" value={txForm.description} onChange={e => setTxForm({ ...txForm, description: e.target.value })} />
                  </div>
                  <button className="w-full py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-colors">
                    {editingTx ? 'Update Entry' : 'Save Entry'}
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-3">
            {ledger.map((tx, idx) => (
              <div key={`vend-ledger-tx-${tx.id}-${idx}`} className="flex justify-between items-center p-3 border-b border-slate-50 hover:bg-slate-50 transition-colors group">
                <div className="flex-1">
                  <p className="text-sm font-bold">{tx.description}</p>
                  <p className="text-[10px] text-slate-400">{formatDate(tx.timestamp)}</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className={`font-black ${tx.type === 'Purchase' ? 'text-red-600' : 'text-emerald-600'}`}>
                      {tx.type === 'Purchase' ? '+' : '-'} ৳{tx.amount}
                    </p>
                    <p className="text-[10px] text-slate-400 uppercase font-bold">{tx.type}</p>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => handleEditClick(tx)} className="p-2 hover:bg-indigo-50 text-indigo-600 rounded-lg transition-colors">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDeleteTx(tx.id)} className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {ledger.length === 0 && (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <Search className="w-8 h-8 text-slate-200" />
                <p className="text-center text-slate-400">{t.noDataFound}</p>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}

function InventoryModule({ fetchWithAuth, currentUser, t, formatDate }: { fetchWithAuth: any; currentUser: User | null; t: any; formatDate: any }) {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState<InventoryItem | null>(null);
  const [showStockModal, setShowStockModal] = useState<InventoryItem | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState<InventoryItem | null>(null);

  const fetchInventory = async () => {
    try {
      const res = await fetchWithAuth('/api/inventory');
      const data = await res.json();
      setItems(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      await fetchWithAuth(`/api/inventory/${id}`, { method: 'DELETE' });
      fetchInventory();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold">Product Inventory</h3>
        {currentUser?.role !== 'manager' && (
          <button 
            onClick={() => setShowAddModal(true)}
            className="bg-emerald-600 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-emerald-700 transition-colors"
          >
            <PlusCircle className="w-5 h-5" /> Add Product
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full py-20 text-center">
            <RefreshCcw className="w-10 h-10 text-slate-300 animate-spin mx-auto mb-4" />
            <p className="text-slate-500">Loading inventory...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="col-span-full py-20 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
            <Package className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 font-medium">{t.noDataFound}</p>
            {currentUser?.role !== 'manager' && (
              <button 
                onClick={() => setShowAddModal(true)}
                className="mt-4 text-emerald-600 font-bold hover:underline"
              >
                Add your first product
              </button>
            )}
          </div>
        ) : (
          items.map(item => (
            <Card key={`inv-${item.id}`} className={`border-2 transition-all ${item.quantity <= item.min_stock ? 'border-red-200 bg-red-50/30' : 'border-slate-100'}`}>
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-xl ${item.quantity <= item.min_stock ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
                <Package className="w-6 h-6" />
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500 uppercase font-bold">Stock Level</p>
                <p className={`text-2xl font-black ${item.quantity <= item.min_stock ? 'text-red-600' : 'text-slate-900'}`}>
                  {item.quantity} <span className="text-sm font-medium text-slate-500">{item.unit}</span>
                </p>
              </div>
            </div>
            <h4 className="font-bold text-lg mb-1">{item.item_name}</h4>
            <div className="text-sm font-bold text-emerald-600 mb-2">
              ক্রয় মূল্য: ৳{item.purchase_price}
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500 mb-4">
              <span>Min. Stock: {item.min_stock} {item.unit}</span>
              <span>Updated: {formatDate(item.last_updated, true)}</span>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              {currentUser?.role !== 'manager' && (
                <button 
                  onClick={() => setShowStockModal(item)}
                  className="flex items-center justify-center gap-2 py-2 bg-slate-900 text-white rounded-lg text-sm font-bold hover:bg-slate-800 transition-all"
                >
                  <PlusCircle className="w-4 h-4" /> Update Stock
                </button>
              )}
              <button 
                onClick={() => setShowHistoryModal(item)}
                className={`flex items-center justify-center gap-2 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-sm font-bold hover:bg-slate-50 transition-all ${currentUser?.role === 'manager' ? 'col-span-2' : ''}`}
              >
                <History className="w-4 h-4" /> History
              </button>
            </div>
            
            {currentUser?.role !== 'manager' && (
              <div className="mt-2 flex justify-end gap-2">
                <button 
                  onClick={() => setShowEditModal(item)}
                  className="p-2 text-slate-400 hover:text-blue-600 transition-colors"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => handleDelete(item.id)}
                  className="p-2 text-slate-400 hover:text-red-600 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </Card>
        )))}
      </div>

      {showAddModal && createPortal(
        <AddProductModal 
          onClose={() => setShowAddModal(false)} 
          onSuccess={() => { setShowAddModal(false); fetchInventory(); }} 
          fetchWithAuth={fetchWithAuth}
        />,
        document.body
      )}

      {showEditModal && createPortal(
        <EditProductModal 
          item={showEditModal}
          onClose={() => setShowEditModal(null)} 
          onSuccess={() => { setShowEditModal(null); fetchInventory(); }} 
          fetchWithAuth={fetchWithAuth}
        />,
        document.body
      )}

      {showStockModal && createPortal(
        <UpdateStockModal 
          item={showStockModal}
          onClose={() => setShowStockModal(null)} 
          onSuccess={() => { setShowStockModal(null); fetchInventory(); }} 
          fetchWithAuth={fetchWithAuth}
        />,
        document.body
      )}

      {showHistoryModal && createPortal(
        <StockHistoryModal 
          item={showHistoryModal}
          onClose={() => setShowHistoryModal(null)} 
          fetchWithAuth={fetchWithAuth}
          formatDate={formatDate}
        />,
        document.body
      )}
    </div>
  );
}

function EditProductModal({ item, onClose, onSuccess, fetchWithAuth }: { item: InventoryItem; onClose: () => void; onSuccess: () => void; fetchWithAuth: any }) {
  const [formData, setFormData] = useState({ 
    item_name: item.item_name, 
    min_stock: item.min_stock.toString(), 
    unit: item.unit, 
    purchase_price: item.purchase_price.toString() 
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.item_name.trim()) {
      setError('Product name is required');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetchWithAuth(`/api/inventory/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_name: formData.item_name.trim(),
          min_stock: parseInt(formData.min_stock) || 5,
          unit: formData.unit,
          purchase_price: parseFloat(formData.purchase_price) || 0
        })
      });
      
      if (res.ok) {
        onSuccess();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to update product');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl"
      >
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h3 className="text-xl font-bold">Edit Product</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Product Name</label>
            <input 
              type="text" required
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
              value={formData.item_name}
              onChange={e => setFormData({ ...formData, item_name: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Min. Stock</label>
              <input 
                type="number" required
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                value={formData.min_stock}
                onChange={e => setFormData({ ...formData, min_stock: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Unit</label>
              <select 
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                value={formData.unit}
                onChange={e => setFormData({ ...formData, unit: e.target.value })}
              >
                <option value="pcs">pcs</option>
                <option value="rim">rim</option>
                <option value="box">box</option>
                <option value="kg">kg</option>
                <option value="pkt">pkt</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Purchase Price (ক্রয় মূল্য) (৳)</label>
            <input 
              type="number" required step="0.01"
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
              value={formData.purchase_price}
              onChange={e => setFormData({ ...formData, purchase_price: e.target.value })}
            />
          </div>
          <button 
            type="submit" disabled={submitting}
            className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 disabled:opacity-50"
          >
            {submitting ? 'Updating...' : 'Update Product'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

function AddProductModal({ onClose, onSuccess, fetchWithAuth }: { onClose: () => void; onSuccess: () => void; fetchWithAuth: any }) {
  const [formData, setFormData] = useState({ item_name: '', quantity: '0', min_stock: '5', unit: 'pcs', purchase_price: '0' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.item_name.trim()) {
      setError('Product name is required');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetchWithAuth('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_name: formData.item_name.trim(),
          quantity: parseInt(formData.quantity) || 0,
          min_stock: parseInt(formData.min_stock) || 5,
          unit: formData.unit,
          purchase_price: parseFloat(formData.purchase_price) || 0
        })
      });
      
      let data;
      try {
        data = await res.json();
      } catch (parseErr) {
        throw new Error('Invalid server response');
      }

      if (res.ok) {
        onSuccess();
      } else {
        setError(data.error || 'Failed to add product');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl"
      >
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h3 className="text-xl font-bold">Add New Product</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Product Name</label>
            <input 
              type="text" required
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
              value={formData.item_name}
              onChange={e => setFormData({ ...formData, item_name: e.target.value })}
              placeholder="e.g. A4 Paper Rim"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Initial Stock</label>
              <input 
                type="number" required
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                value={formData.quantity}
                onChange={e => setFormData({ ...formData, quantity: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Unit</label>
              <select 
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                value={formData.unit}
                onChange={e => setFormData({ ...formData, unit: e.target.value })}
              >
                <option value="pcs">pcs</option>
                <option value="rim">rim</option>
                <option value="box">box</option>
                <option value="kg">kg</option>
                <option value="pkt">pkt</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Low Stock Warning At</label>
            <input 
              type="number" required
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
              value={formData.min_stock}
              onChange={e => setFormData({ ...formData, min_stock: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Purchase Price (ক্রয় মূল্য) (৳)</label>
            <input 
              type="number" required step="0.01"
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
              value={formData.purchase_price}
              onChange={e => setFormData({ ...formData, purchase_price: e.target.value })}
              placeholder="0.00"
            />
          </div>
          <button 
            type="submit" disabled={submitting}
            className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 disabled:opacity-50"
          >
            {submitting ? 'Adding...' : 'Add Product'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

function UpdateStockModal({ item, onClose, onSuccess, fetchWithAuth }: { item: InventoryItem; onClose: () => void; onSuccess: () => void; fetchWithAuth: any }) {
  const [formData, setFormData] = useState({ quantity: '1', type: 'Add', description: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseInt(formData.quantity);
    if (isNaN(qty) || qty <= 0) {
      setError('Please enter a valid quantity');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetchWithAuth(`/api/inventory/${item.id}/stock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      if (res.ok) {
        onSuccess();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to update stock');
      }
    } catch (err) {
      console.error(err);
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl"
      >
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <div>
            <h3 className="text-xl font-bold">Update Stock</h3>
            <p className="text-sm text-slate-500">{item.item_name}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}
          <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
            <button 
              type="button"
              onClick={() => setFormData({ ...formData, type: 'Add' })}
              className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${formData.type === 'Add' ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-500'}`}
            >
              Add Stock
            </button>
            <button 
              type="button"
              onClick={() => setFormData({ ...formData, type: 'Remove' })}
              className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${formData.type === 'Remove' ? 'bg-white shadow-sm text-red-600' : 'text-slate-500'}`}
            >
              Remove Stock
            </button>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Quantity ({item.unit})</label>
            <input 
              type="number" required min="1"
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
              value={formData.quantity}
              onChange={e => setFormData({ ...formData, quantity: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Note / Description</label>
            <textarea 
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              placeholder="e.g. Purchased from vendor, Damaged, etc."
              rows={3}
            />
          </div>
          <button 
            type="submit" disabled={submitting}
            className={`w-full py-4 text-white rounded-2xl font-bold transition-all shadow-lg disabled:opacity-50 ${formData.type === 'Add' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200' : 'bg-red-600 hover:bg-red-700 shadow-red-200'}`}
          >
            {submitting ? 'Updating...' : `${formData.type} Stock`}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

function StockHistoryModal({ item, onClose, fetchWithAuth, formatDate }: { item: InventoryItem; onClose: () => void; fetchWithAuth: any; formatDate: any }) {
  const [history, setHistory] = useState<StockHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetchWithAuth(`/api/inventory/${item.id}/history`);
        const data = await res.json();
        setHistory(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [item.id]);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[80vh]"
      >
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <div>
            <h3 className="text-xl font-bold">Stock History</h3>
            <p className="text-sm text-slate-500">{item.item_name}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex justify-center p-10"><RefreshCcw className="animate-spin text-slate-400" /></div>
          ) : history.length === 0 ? (
            <p className="text-center text-slate-400 py-10">No history found.</p>
          ) : (
            <div className="space-y-4">
              {history.map(h => (
                <div key={`hist-${h.id}`} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${h.type === 'Add' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                      {h.type === 'Add' ? <TrendingUp className="w-4 h-4" /> : <ArrowDownLeft className="w-4 h-4" />}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">{h.type} {h.quantity} {item.unit}</p>
                      <p className="text-xs text-slate-500">{h.description || 'No note'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-400">{formatDate(h.timestamp)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

function BackupModule({ fetchWithAuth, formatDate }: { fetchWithAuth: any; formatDate: any }) {
  const [backups, setBackups] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchBackups = async () => {
    try {
      const res = await fetchWithAuth('/api/backups');
      const data = await res.json();
      setBackups(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchBackups();
  }, []);

  const createBackup = async () => {
    setLoading(true);
    try {
      await fetchWithAuth('/api/backups/create', { method: 'POST' });
      fetchBackups();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const syncToCloud = async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth('/api/backups/cloud-sync', { method: 'POST' });
      const data = await res.json();
      if (data.error) alert(data.error);
      else alert(data.message);
    } catch (err) {
      console.error(err);
      alert("Cloud sync failed. Check console for details.");
    } finally {
      setLoading(false);
    }
  };

  const restoreBackup = async (filename: string) => {
    if (!confirm(`Are you sure you want to restore from ${filename}? Current data will be replaced and the app will restart.`)) return;
    try {
      const res = await fetchWithAuth(`/api/backups/restore/${filename}`, { method: 'POST' });
      const data = await res.json();
      alert(data.message);
      window.location.reload();
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    const formData = new FormData();
    formData.append('backup', e.target.files[0]);
    try {
      await fetchWithAuth('/api/backups/upload', {
        method: 'POST',
        body: formData
      });
      fetchBackups();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Card className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-xl font-bold">Backup & Restore</h3>
          <p className="text-sm text-slate-500">Manage your shop's data backups</p>
        </div>
        <div className="flex gap-2">
          <label className="cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-sm font-bold transition-colors">
            Upload Backup
            <input type="file" className="hidden" accept=".db" onChange={handleUpload} />
          </label>
          <button 
            onClick={syncToCloud}
            disabled={loading}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <TrendingUp className="w-4 h-4" />
            {loading ? 'Syncing...' : 'Cloud Sync'}
          </button>
          <button 
            onClick={createBackup}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors disabled:opacity-50"
          >
            {loading ? 'Backing up...' : 'Create Manual Backup'}
          </button>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl mb-6 flex items-start gap-3">
        <div className="bg-blue-100 p-2 rounded-lg">
          <DatabaseIcon className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <p className="text-sm font-bold text-blue-900">Daily Auto-Backup Enabled</p>
          <p className="text-xs text-blue-700">The system automatically backs up your data every day at midnight.</p>
        </div>
      </div>

      <div className="overflow-hidden border border-slate-100 rounded-2xl">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase">File Name</th>
              <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase">Size</th>
              <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase">Date</th>
              <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {backups.map((b) => (
              <tr key={b.name} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 text-sm font-medium text-slate-900">{b.name}</td>
                <td className="px-4 py-3 text-sm text-slate-500">{(b.size / 1024 / 1024).toFixed(2)} MB</td>
                <td className="px-4 py-3 text-sm text-slate-500">{formatDate(b.date)}</td>
                <td className="px-4 py-3 text-right space-x-2">
                  <a 
                    href={`/api/backups/download/${b.name}`}
                    className="text-blue-600 hover:text-blue-700 text-xs font-bold"
                  >
                    Download
                  </a>
                  <button 
                    onClick={() => restoreBackup(b.name)}
                    className="text-orange-600 hover:text-orange-700 text-xs font-bold"
                  >
                    Restore
                  </button>
                </td>
              </tr>
            ))}
            {backups.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-400 text-sm">
                  No backups found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function LogoUploadModule({ fetchWithAuth, currentUser, onUpdate }: { fetchWithAuth: any; currentUser: any; onUpdate: () => void }) {
  const [uploading, setUploading] = useState(false);
  const [shop, setShop] = useState<Shop | null>(null);

  const fetchShop = async () => {
    try {
      const res = await fetchWithAuth('/api/shops');
      if (res.ok) {
        const shops = await res.json();
        const currentShop = shops.find((s: any) => s.id === (currentUser.active_shop_id || currentUser.shop_id));
        setShop(currentShop || null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchShop();
  }, [currentUser]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert("File size must be less than 2MB");
      return;
    }

    const formData = new FormData();
    formData.append('logo', file);

    setUploading(true);
    try {
      const shopId = currentUser.active_shop_id || currentUser.shop_id;
      const res = await fetchWithAuth(`/api/shops/${shopId}/logo`, {
        method: 'POST',
        body: formData,
        // Don't set Content-Type header, let the browser set it for FormData
      });

      if (res.ok) {
        const data = await res.json();
        setShop(prev => prev ? { ...prev, logo_url: data.logo_url } : null);
        onUpdate();
        alert("Logo updated successfully");
      } else {
        const data = await res.json();
        alert(data.error || "Failed to upload logo");
      }
    } catch (err) {
      console.error(err);
      alert("An error occurred during upload");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 p-4 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50">
      <div className="relative group">
        <div className="w-24 h-24 rounded-2xl bg-white border border-slate-200 flex items-center justify-center overflow-hidden shadow-sm">
          {shop?.logo_url ? (
            <img 
              src={shop.logo_url} 
              alt="Shop Logo" 
              className="w-full h-full object-contain"
              referrerPolicy="no-referrer"
            />
          ) : (
            <Store className="w-10 h-10 text-slate-300" />
          )}
        </div>
        {uploading && (
          <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-2xl">
            <RefreshCcw className="w-6 h-6 text-emerald-600 animate-spin" />
          </div>
        )}
      </div>
      
      <div className="text-center">
        <p className="text-sm font-medium text-slate-700">Shop Logo</p>
        <p className="text-[10px] text-slate-400 mt-1">Recommended: Square image, max 2MB</p>
      </div>

      <label className="cursor-pointer bg-white border border-slate-200 px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all shadow-sm flex items-center gap-2">
        <ImageIcon className="w-4 h-4" />
        {shop?.logo_url ? 'Change Logo' : 'Upload Logo'}
        <input 
          type="file" 
          className="hidden" 
          accept="image/*" 
          onChange={handleFileChange}
          disabled={uploading}
        />
      </label>
    </div>
  );
}

function PaymentGatewaySettings({ fetchWithAuth }: { fetchWithAuth: any }) {
  const [settings, setSettings] = useState({
    store_id: '',
    store_password: '',
    mode: 'sandbox',
    is_active: 0
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetchWithAuth('/api/admin/payment-settings');
        if (res.ok) {
          setSettings(await res.json());
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetchWithAuth('/api/admin/payment-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      if (res.ok) {
        alert('Payment settings updated successfully');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>Loading payment settings...</div>;

  return (
    <Card>
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-emerald-100 rounded-lg">
          <Shield className="w-5 h-5 text-emerald-600" />
        </div>
        <h3 className="text-lg font-bold text-slate-800">SSLCommerz Gateway Settings</h3>
      </div>
      
      <form onSubmit={handleSave} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Store ID</label>
            <input
              type="text"
              value={settings.store_id}
              onChange={(e) => setSettings({ ...settings, store_id: e.target.value })}
              className="w-full p-2 border border-slate-200 rounded-lg"
              placeholder="Enter Store ID"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Store Password</label>
            <input
              type="password"
              value={settings.store_password}
              onChange={(e) => setSettings({ ...settings, store_password: e.target.value })}
              className="w-full p-2 border border-slate-200 rounded-lg"
              placeholder="Enter Store Password"
            />
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-slate-700">Mode:</label>
            <select
              value={settings.mode}
              onChange={(e) => setSettings({ ...settings, mode: e.target.value })}
              className="p-2 border border-slate-200 rounded-lg text-sm"
            >
              <option value="sandbox">Sandbox (Test)</option>
              <option value="live">Live (Production)</option>
            </select>
          </div>
          
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.is_active === 1}
              onChange={(e) => setSettings({ ...settings, is_active: e.target.checked ? 1 : 0 })}
              className="w-4 h-4 text-emerald-600 rounded"
            />
            <span className="text-sm font-medium text-slate-700">Enable Gateway</span>
          </label>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-slate-900 text-white py-2.5 rounded-xl font-bold hover:bg-slate-800 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {saving ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <CreditCardIcon className="w-4 h-4" />}
          Save Gateway Settings
        </button>
      </form>
    </Card>
  );
}

function SupportModule({ fetchWithAuth, currentUser, formatDate }: { fetchWithAuth: any; currentUser: User | null; formatDate: any }) {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [reply, setReply] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  const fetchTickets = async () => {
    try {
      const res = await fetchWithAuth('/api/support-tickets');
      const data = await res.json();
      setTickets(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetchWithAuth('/api/support-tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, message })
      });
      setShowAddModal(false);
      setSubject('');
      setMessage('');
      fetchTickets();
    } catch (err) {
      console.error(err);
    }
  };

  const handleReply = async (id: number) => {
    try {
      await fetchWithAuth(`/api/support-tickets/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admin_reply: reply, status: 'Resolved' })
      });
      setSelectedTicket(null);
      setReply('');
      fetchTickets();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCloseTicket = async (id: number) => {
    try {
      await fetchWithAuth(`/api/support-tickets/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Closed' })
      });
      fetchTickets();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Support & Issue Tracking</h2>
          <p className="text-sm text-slate-500">
            {currentUser?.role === 'admin' 
              ? "Solve problems reported by shop owners" 
              : "Report problems or ask for support"}
          </p>
        </div>
        {currentUser?.role !== 'admin' && (
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-red-700 transition-colors"
          >
            <PlusCircle className="w-5 h-5" /> Report Problem
          </button>
        )}
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="p-4 text-xs font-bold text-slate-400 uppercase">Ticket ID</th>
              {currentUser?.role === 'admin' && <th className="p-4 text-xs font-bold text-slate-400 uppercase">Shop / User</th>}
              <th className="p-4 text-xs font-bold text-slate-400 uppercase">Subject</th>
              <th className="p-4 text-xs font-bold text-slate-400 uppercase">Status</th>
              <th className="p-4 text-xs font-bold text-slate-400 uppercase">Date</th>
              <th className="p-4 text-xs font-bold text-slate-400 uppercase text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={6} className="p-8 text-center text-slate-400">Loading tickets...</td></tr>
            ) : tickets.length === 0 ? (
              <tr><td colSpan={6} className="p-8 text-center text-slate-400">No support tickets found</td></tr>
            ) : (
              tickets.map(ticket => (
                <tr key={ticket.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4 text-sm font-bold text-slate-900">#{ticket.id}</td>
                  {currentUser?.role === 'admin' && (
                    <td className="p-4 text-xs">
                      <div className="font-bold text-slate-900">{ticket.shop_name}</div>
                      <div className="text-slate-500">{ticket.user_name}</div>
                    </td>
                  )}
                  <td className="p-4 text-sm font-medium text-slate-700">{ticket.subject}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase ${
                      ticket.status === 'Open' ? 'bg-orange-100 text-orange-600' :
                      ticket.status === 'Resolved' ? 'bg-emerald-100 text-emerald-600' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      {ticket.status}
                    </span>
                  </td>
                  <td className="p-4 text-xs text-slate-400">{formatDate(ticket.created_at)}</td>
                  <td className="p-4 text-right">
                    <button 
                      onClick={() => setSelectedTicket(ticket)}
                      className="text-xs font-bold text-indigo-600 hover:underline"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Ticket Details Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden"
          >
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <span className="text-[10px] font-black uppercase text-indigo-500 bg-indigo-50 px-2 py-1 rounded-lg">Ticket #{selectedTicket.id}</span>
                <h3 className="text-lg font-bold text-slate-900 mt-1">{selectedTicket.subject}</h3>
              </div>
              <button onClick={() => setSelectedTicket(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <ArrowRight className="w-5 h-5 rotate-180" />
              </button>
            </div>
            <div className="p-6 space-y-4 max-h-[400px] overflow-y-auto">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase mb-1">Problem Description</p>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-slate-700 text-sm">
                  {selectedTicket.message}
                </div>
              </div>

              {selectedTicket.admin_reply && (
                <div>
                  <p className="text-xs font-bold text-emerald-600 uppercase mb-1 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Admin Response
                  </p>
                  <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 text-slate-700 text-sm italic">
                    {selectedTicket.admin_reply}
                  </div>
                </div>
              )}

              {currentUser?.role === 'admin' && selectedTicket.status !== 'Closed' && (
                <div className="space-y-2 pt-4 border-t border-slate-100 text-slate-700">
                  <label className="text-xs font-bold text-slate-400 uppercase px-1">Solve Problem / Reply</label>
                  <textarea 
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                    rows={3}
                    placeholder="Provide a solution..."
                    value={reply}
                    onChange={e => setReply(e.target.value)}
                  />
                  <button 
                    onClick={() => handleReply(selectedTicket.id)}
                    className="w-full bg-emerald-600 text-white font-bold py-3 rounded-xl hover:bg-emerald-700"
                  >
                    Send Solution & Mark Resolved
                  </button>
                </div>
              )}
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-between">
              {selectedTicket.status !== 'Closed' && (
                <button 
                  onClick={() => handleCloseTicket(selectedTicket.id)}
                  className="text-xs font-bold text-slate-400 hover:text-red-500 transition-colors"
                >
                  Close Ticket Permanently
                </button>
              )}
              <button 
                onClick={() => setSelectedTicket(null)}
                className="text-xs font-bold text-slate-600 px-4 py-2 hover:bg-slate-200 rounded-lg"
              >
                Back to List
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Add Ticket Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl w-full max-w-md shadow-2xl p-6"
          >
            <h3 className="text-xl font-bold mb-4">Report an Issue</h3>
            <form onSubmit={handleSubmitTicket} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Subject</label>
                <input 
                  type="text" required
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="e.g., Cannot transfer balance"
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Describe your problem</label>
                <textarea 
                  required
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                  rows={5}
                  placeholder="Write details about the issue..."
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button 
                  type="button" onClick={() => setShowAddModal(false)}
                  className="flex-1 py-3 border border-slate-200 rounded-xl font-bold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700"
                >
                  Submit Issue
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}

function SettingsModule({ onComplete, fetchWithAuth, fetchShops, currentUser, formatDate }: { onComplete: () => void; fetchWithAuth: any; fetchShops: () => void; currentUser: any; formatDate: any }) {
  const [settings, setSettings] = useState<any[]>([]);
  const [localValues, setLocalValues] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const fetchSettings = async () => {
    const res = await fetchWithAuth('/api/settings');
    const data = await res.json();
    setSettings(data);
    const values: { [key: string]: string } = {};
    data.forEach((s: any) => {
      values[s.key] = s.value;
    });
    setLocalValues(values);
    setLoading(false);
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (key: string) => {
    const value = localValues[key] || '';
    setSaving(key);
    try {
      await fetchWithAuth('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value })
      });
      
      setSettings(prev => {
        const existing = prev.find(s => s.key === key);
        if (existing) {
          return prev.map(s => s.key === key ? { ...s, value } : s);
        } else {
          return [...prev, { key, value }];
        }
      });
      
      onComplete();
    } catch (err) {
      console.error(err);
    } finally {
      setTimeout(() => setSaving(null), 1000);
    }
  };

  if (loading) return <div className="text-center p-10">Loading settings...</div>;

  const isGlobalAdmin = currentUser?.role === 'admin' && currentUser?.shop_id === 1;

  const categories = [
    ...(isGlobalAdmin ? [{ title: 'Multiple Shop Management', component: <ShopsModule onUpdate={fetchShops} fetchWithAuth={fetchWithAuth} formatDate={formatDate} /> }] : []),
    { title: 'Shop Logo', component: <LogoUploadModule fetchWithAuth={fetchWithAuth} currentUser={currentUser} onUpdate={onComplete} /> },
    { title: 'MFS & Recharge Numbers (Manage Balances Here)', component: <ShopNumbersModule onUpdate={onComplete} fetchWithAuth={fetchWithAuth} /> },
    { 
      title: 'Shop Balances & Costs', 
      items: [
        { key: 'opening_cash', label: 'Opening Cash Balance (৳)' },
        { key: 'cost_bw', label: 'Black & White Cost (৳)' },
        { key: 'cost_color', label: 'Color Cost (৳)' }
      ]
    },
    { 
      title: 'MFS Commissions (per 1000)', 
      items: [
        { key: 'bkash_cashout_comm', label: 'bKash Cashout Commission' },
        { key: 'nagad_cashout_comm', label: 'Nagad Cashout Commission' },
        { key: 'rocket_cashout_comm', label: 'Rocket Cashout Commission' }
      ]
    },
    { 
      title: 'Cloud Backup (Google Drive)', 
      items: [
        { key: 'google_drive_credentials', label: 'Service Account JSON' },
        { key: 'google_drive_folder_id', label: 'Google Drive Folder ID (Shared with Service Account)' }
      ]
    },
    { 
      title: 'Time & Locale Settings', 
      items: [
        { 
          key: 'timezone_offset', 
          label: 'Timezone Offset', 
          type: 'select', 
          options: [
            { label: 'GMT -12', value: '-12' },
            { label: 'GMT -11', value: '-11' },
            { label: 'GMT -10', value: '-10' },
            { label: 'GMT -9', value: '-9' },
            { label: 'GMT -8', value: '-8' },
            { label: 'GMT -7', value: '-7' },
            { label: 'GMT -6', value: '-6' },
            { label: 'GMT -5', value: '-5' },
            { label: 'GMT -4', value: '-4' },
            { label: 'GMT -3', value: '-3' },
            { label: 'GMT -2', value: '-2' },
            { label: 'GMT -1', value: '-1' },
            { label: 'GMT +0 (UTC)', value: '0' },
            { label: 'GMT +1', value: '1' },
            { label: 'GMT +2', value: '2' },
            { label: 'GMT +3', value: '3' },
            { label: 'GMT +4', value: '4' },
            { label: 'GMT +5', value: '5' },
            { label: 'GMT +5.5 (India)', value: '5.5' },
            { label: 'GMT +6 (Bangladesh)', value: '6' },
            { label: 'GMT +7', value: '7' },
            { label: 'GMT +8', value: '8' },
            { label: 'GMT +9', value: '9' },
            { label: 'GMT +10', value: '10' },
            { label: 'GMT +11', value: '11' },
            { label: 'GMT +12', value: '12' },
            { label: 'GMT +13', value: '13' },
            { label: 'GMT +14', value: '14' },
          ] 
        }
      ]
    },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {categories.map((cat, idx) => (
        <Card key={`settings-cat-${cat.title}-${idx}`}>
          <h3 className="text-lg font-bold mb-4">{cat.title}</h3>
          {cat.component ? cat.component : (
            <div className="space-y-6">
              {cat.items?.map(item => {
                const originalValue = settings.find(s => s.key === item.key)?.value || '';
                const currentValue = localValues[item.key] || '';
                const isCredentials = item.key === 'google_drive_credentials';
                const isFolderId = item.key === 'google_drive_folder_id';
                const isSelect = (item as any).type === 'select';
                const isCurrency = !isCredentials && !isFolderId && !isSelect;
                const hasChanged = originalValue !== currentValue;
                
                return (
                  <div key={item.key} className="space-y-2">
                    <div className={`${isCredentials ? 'flex-col items-start' : 'flex-row items-center justify-between'} flex gap-4`}>
                      <div className="flex flex-col">
                        <label className="text-sm font-medium text-slate-600">
                          {item.label}
                        </label>
                        {isCredentials && (
                          <p className="text-[10px] text-slate-400 mt-1">
                            Paste your Google Service Account JSON key here. Enable Drive API in Google Cloud Console.
                          </p>
                        )}
                        {isFolderId && (
                          <p className="text-[10px] text-slate-400 mt-1">
                            The ID of the folder shared with the Service Account.
                          </p>
                        )}
                        {isSelect && (
                          <p className="text-[10px] text-slate-400 mt-1">
                            Sets the display time for your transactions.
                          </p>
                        )}
                      </div>
                      <div className={`flex items-center gap-2 ${isCredentials ? 'w-full' : ''} relative`}>
                        {isCurrency && <span className="text-slate-400 text-sm">৳</span>}
                        {isCredentials ? (
                          <textarea
                            rows={4}
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono outline-none focus:ring-2 focus:ring-emerald-500"
                            placeholder='{"type": "service_account", ...}'
                            value={currentValue}
                            onChange={(e) => setLocalValues({ ...localValues, [item.key]: e.target.value })}
                          />
                        ) : isSelect ? (
                          <select
                            className="w-full min-w-[200px] p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
                            value={currentValue}
                            onChange={(e) => setLocalValues({ ...localValues, [item.key]: e.target.value })}
                          >
                            {(item as any).options.map((opt: any) => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        ) : (
                          <input 
                            type={isCurrency ? "number" : "text"}
                            step={isCurrency ? "0.1" : undefined}
                            className={`${isCurrency ? 'w-24 text-right' : 'w-full min-w-[200px]'} p-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500`}
                            value={currentValue}
                            onChange={(e) => setLocalValues({ ...localValues, [item.key]: e.target.value })}
                          />
                        )}
                      </div>
                    </div>
                    
                    <div className="flex justify-end">
                      <button
                        onClick={() => handleSave(item.key)}
                        disabled={!hasChanged || saving === item.key}
                        className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          hasChanged 
                            ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-md' 
                            : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        }`}
                      >
                        {saving === item.key ? (
                          <>
                            <RefreshCcw className="w-3 h-3 animate-spin" />
                            Saving...
                          </>
                        ) : hasChanged ? (
                          <>
                            <CheckCircle2 className="w-3 h-3" />
                            Save Changes
                          </>
                        ) : (
                          'Saved'
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}

function ShopsModule({ onUpdate, fetchWithAuth, formatDate }: { onUpdate: () => void; fetchWithAuth: any; formatDate: any }) {
  const [shops, setShops] = useState<Shop[]>([]);
  const [formData, setFormData] = useState({ name: '', address: '', phone: '' });
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);

  const fetchShops = async () => {
    const res = await fetchWithAuth('/api/shops');
    const data = await res.json();
    setShops(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchShops();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      await fetchWithAuth(`/api/shops/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      setEditingId(null);
    } else {
      await fetchWithAuth('/api/shops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
    }
    setFormData({ name: '', address: '', phone: '' });
    fetchShops();
    onUpdate();
  };

  const updateStatus = async (id: number, status: string) => {
    await fetchWithAuth(`/api/shops/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    fetchShops();
    onUpdate();
  };

  const deleteShop = async (id: number) => {
    if (id === 1) return alert("Cannot delete default shop");
    if (!confirm('Delete this shop? All data associated with this shop will remain in DB but be inaccessible through this UI.')) return;
    await fetchWithAuth(`/api/shops/${id}`, { method: 'DELETE' });
    fetchShops();
    onUpdate();
  };

  const startEdit = (shop: Shop) => {
    setEditingId(shop.id);
    setFormData({ name: shop.name, address: shop.address || '', phone: shop.phone || '' });
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-6">
        <h4 className="text-sm font-bold text-slate-700 mb-4">{editingId ? 'Edit Shop' : 'Add New Shop'}</h4>
        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Shop Name</label>
            <input type="text" required className="w-full p-2 bg-white border border-slate-200 rounded-lg outline-none text-sm" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Phone</label>
            <input type="tel" className="w-full p-2 bg-white border border-slate-200 rounded-lg outline-none text-sm" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Address</label>
            <input type="text" className="w-full p-2 bg-white border border-slate-200 rounded-lg outline-none text-sm" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} />
          </div>
          <div className="col-span-2 flex gap-2">
            <button className="flex-1 py-2 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors text-sm">
              {editingId ? 'Update Shop' : 'Add Shop'}
            </button>
            {editingId && (
              <button type="button" onClick={() => { setEditingId(null); setFormData({ name: '', address: '', phone: '' }); }} className="px-4 py-2 bg-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-300 transition-colors text-sm">
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="space-y-4">
        {shops.map(s => (
          <div key={`shop-list-${s.id}`} className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-black flex items-center gap-2">
                  {s.name}
                  <span className={`px-2 py-0.5 rounded-full text-[8px] uppercase font-bold ${
                    s.status === 'Approved' ? 'bg-emerald-100 text-emerald-600' :
                    s.status === 'Pending' ? 'bg-amber-100 text-amber-600' :
                    'bg-red-100 text-red-600'
                  }`}>
                    {s.status}
                  </span>
                </p>
                <p className="text-[10px] text-slate-400">{s.phone} | {s.address}</p>
                <p className="text-[10px] text-slate-400 mt-1">Plan: {s.plan} | Expiry: {s.expiry_date ? formatDate(s.expiry_date, true) : 'N/A'}</p>
              </div>
              <div className="flex gap-1">
                <button onClick={() => startEdit(s)} className="p-1.5 text-blue-400 hover:bg-blue-50 rounded-lg transition-colors">
                  <Edit className="w-3.5 h-3.5" />
                </button>
                {s.id !== 1 && (
                  <button onClick={() => deleteShop(s.id)} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {s.id !== 1 && (
              <div className="flex gap-2 pt-2 border-t border-slate-50">
                {s.status === 'Pending' && (
                  <button 
                    onClick={() => updateStatus(s.id, 'Approved')}
                    className="flex-1 py-1.5 bg-emerald-50 text-emerald-600 text-[10px] font-bold rounded-lg hover:bg-emerald-100 transition-colors"
                  >
                    Approve Shop
                  </button>
                )}
                {s.status === 'Approved' && (
                  <button 
                    onClick={() => updateStatus(s.id, 'Suspended')}
                    className="flex-1 py-1.5 bg-red-50 text-red-600 text-[10px] font-bold rounded-lg hover:bg-red-100 transition-colors"
                  >
                    Suspend Shop
                  </button>
                )}
                {s.status === 'Suspended' && (
                  <button 
                    onClick={() => updateStatus(s.id, 'Approved')}
                    className="flex-1 py-1.5 bg-emerald-50 text-emerald-600 text-[10px] font-bold rounded-lg hover:bg-emerald-100 transition-colors"
                  >
                    Re-activate Shop
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ShopNumbersModule({ onUpdate, fetchWithAuth }: { onUpdate: () => void; fetchWithAuth: any }) {
  const [numbers, setNumbers] = useState<any[]>([]);
  const [formData, setFormData] = useState({ operator: 'bKash', type: 'Agent', number: '', password: '', opening_balance: '' });
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');

  useEffect(() => {
    const isMFS = ['bKash', 'Nagad', 'Rocket'].includes(formData.operator);
    if (!isMFS && formData.type !== 'Recharge') {
      setFormData(prev => ({ ...prev, type: 'Recharge' }));
    } else if (isMFS && formData.type === 'Recharge') {
      setFormData(prev => ({ ...prev, type: 'Agent' }));
    }
  }, [formData.operator]);

  const fetchNumbers = async () => {
    const res = await fetchWithAuth('/api/shop-numbers');
    const data = await res.json();
    setNumbers(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchNumbers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetchWithAuth('/api/shop-numbers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...formData,
        opening_balance: parseFloat(formData.opening_balance) || 0
      })
    });
    setFormData({ ...formData, number: '', password: '', opening_balance: '' });
    fetchNumbers();
    onUpdate();
  };

  const deleteNumber = async (id: number) => {
    if (!confirm('Delete this number?')) return;
    await fetchWithAuth(`/api/shop-numbers/${id}`, { method: 'DELETE' });
    fetchNumbers();
    onUpdate();
  };

  const handleUpdateBalance = async (id: number) => {
    await fetchWithAuth(`/api/shop-numbers/${id}/opening-balance`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ opening_balance: parseFloat(editValue) || 0 })
    });
    setEditingId(null);
    fetchNumbers();
    onUpdate();
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-6">
        <h4 className="text-sm font-bold text-slate-700 mb-4">Add New Number</h4>
        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Operator</label>
            <select className="w-full p-2 bg-white border border-slate-200 rounded-lg outline-none text-sm" value={formData.operator} onChange={e => setFormData({ ...formData, operator: e.target.value })}>
              <option value="bKash">bKash</option>
              <option value="Nagad">Nagad</option>
              <option value="Rocket">Rocket</option>
              <option value="GP">GP</option>
              <option value="Robi">Robi</option>
              <option value="BL">BL</option>
              <option value="Airtel">Airtel</option>
              <option value="Teletalk">Teletalk</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Type</label>
            <select className="w-full p-2 bg-white border border-slate-200 rounded-lg outline-none text-sm" value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })}>
              {['bKash', 'Nagad', 'Rocket'].includes(formData.operator) ? (
                <>
                  <option value="Agent">Agent</option>
                  <option value="Personal">Personal</option>
                </>
              ) : (
                <option value="Recharge">Recharge</option>
              )}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Phone Number</label>
            <input type="tel" required className="w-full p-2 bg-white border border-slate-200 rounded-lg outline-none text-sm" value={formData.number} onChange={e => setFormData({ ...formData, number: e.target.value })} />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Password/PIN (Optional)</label>
            <input type="text" className="w-full p-2 bg-white border border-slate-200 rounded-lg outline-none text-sm" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Opening Balance (৳)</label>
            <input type="number" className="w-full p-2 bg-white border border-slate-200 rounded-lg outline-none text-sm" value={formData.opening_balance} onChange={e => setFormData({ ...formData, opening_balance: e.target.value })} />
          </div>
          <button className="col-span-2 py-2 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors text-sm">
            Add Number
          </button>
        </form>
      </div>

      <div className="space-y-2">
        {numbers.map(n => (
          <div key={`shop-num-${n.id}`} className="flex justify-between items-center p-3 bg-white border border-slate-100 rounded-xl">
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full ${n.type === 'Agent' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                  {n.type}
                </span>
                <span className="text-[10px] font-bold text-slate-400 uppercase">{n.operator}</span>
              </div>
              <p className="text-sm font-black mt-0.5">{n.number}</p>
              <div className="flex gap-2 items-center">
                {n.password && <p className="text-[10px] text-slate-400">PIN: {n.password}</p>}
                {editingId === n.id ? (
                  <div className="flex items-center gap-1">
                    <input 
                      type="number" 
                      className="w-20 p-1 text-[10px] border border-indigo-300 rounded outline-none" 
                      value={editValue} 
                      onChange={e => setEditValue(e.target.value)}
                      autoFocus
                    />
                    <button onClick={() => handleUpdateBalance(n.id)} className="p-1 bg-emerald-500 text-white rounded hover:bg-emerald-600">
                      <CheckCircle2 className="w-3 h-3" />
                    </button>
                    <button onClick={() => setEditingId(null)} className="p-1 bg-slate-200 text-slate-600 rounded hover:bg-slate-300">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={() => {
                      setEditingId(n.id);
                      setEditValue(n.opening_balance.toString());
                    }}
                    className="text-[10px] text-emerald-600 font-bold hover:underline flex items-center gap-1"
                  >
                    Opening: ৳{n.opening_balance || 0}
                    <Edit className="w-2.5 h-2.5" />
                  </button>
                )}
              </div>
            </div>
            <button onClick={() => deleteNumber(n.id)} className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-colors">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
        {numbers.length === 0 && <p className="text-center text-slate-400 text-xs py-4">No shop numbers added yet.</p>}
      </div>
    </div>
  );
}

// --- Helper Components ---

function PaymentInput({ 
  totalAmount, 
  onPaymentChange,
  fetchWithAuth,
  isExpense = false,
  hideCustomer = false,
  forceShowSelection = false
}: { 
  totalAmount: number; 
  onPaymentChange: (data: { status: string; paid: number; due: number; customerId: string | null }) => void;
  fetchWithAuth: any;
  isExpense?: boolean;
  hideCustomer?: boolean;
  forceShowSelection?: boolean;
}) {
  const [status, setStatus] = useState('Paid');
  const [paid, setPaid] = useState(totalAmount.toString());
  const [customerId, setCustomerId] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);

  const fetchData = async () => {
    try {
      if (isExpense) {
        const res = await fetchWithAuth('/api/vendors');
        if (res.ok && res.headers.get("content-type")?.includes("application/json")) {
          setVendors(await res.json());
        }
      } else {
        const res = await fetchWithAuth('/api/customers');
        if (res.ok && res.headers.get("content-type")?.includes("application/json")) {
          setCustomers(await res.json());
        }
      }
    } catch (err) {
      console.error("Failed to fetch data for payment input:", err);
    }
  };

  useEffect(() => {
    if (status === 'Paid') {
      setPaid(totalAmount.toString());
    } else if (status === 'Due') {
      setPaid('0');
    }
  }, [status, totalAmount]);

  useEffect(() => {
    const due = totalAmount - parseFloat(paid || '0');
    onPaymentChange({ 
      status, 
      paid: parseFloat(paid || '0'), 
      due: Math.max(0, due), 
      customerId: customerId || null 
    });
  }, [status, paid, customerId, totalAmount]);

  useEffect(() => {
    if (status !== 'Paid' || forceShowSelection) {
      fetchData();
    }
  }, [status, isExpense, forceShowSelection]);

  return (
    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-3">
      <div className="flex gap-2">
        {['Paid', 'Partial', 'Due'].map(s => (
          <button
            key={s}
            type="button"
            onClick={() => setStatus(s)}
            className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all ${
              status === s 
                ? 'bg-slate-800 text-white border-slate-800' 
                : 'bg-white text-slate-500 border-slate-200'
            }`}
          >
            {s === 'Paid' ? 'Paid' : s === 'Partial' ? 'Partial' : 'Full Due'}
          </button>
        ))}
      </div>

      {status === 'Partial' && (
        <div>
          <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Paid Amount</label>
          <input 
            type="number" 
            className="w-full p-2 bg-white border border-slate-200 rounded-lg outline-none text-sm"
            value={paid}
            onChange={e => setPaid(e.target.value)}
          />
          <p className="text-xs text-red-500 mt-1 font-bold">Due: ৳{Math.max(0, totalAmount - parseFloat(paid || '0'))}</p>
        </div>
      )}

      {(status !== 'Paid' || forceShowSelection) && !hideCustomer && (
        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="block text-[10px] font-bold text-slate-500 uppercase">
              {isExpense ? 'Select Vendor' : 'Select Customer'}
            </label>
            <button 
              type="button"
              onClick={() => setShowAddModal(true)}
              className="text-[10px] font-bold text-emerald-600 hover:underline flex items-center gap-1"
            >
              <PlusCircle className="w-3 h-3" /> Add New
            </button>
          </div>
          <select 
            className="w-full p-2 bg-white border border-slate-200 rounded-lg outline-none text-sm"
            value={customerId}
            onChange={e => setCustomerId(e.target.value)}
            required
          >
            <option value="">Choose...</option>
            {isExpense ? (
              vendors.map(v => <option key={`pay-vendor-${v.id}`} value={v.id}>{v.name}</option>)
            ) : (
              customers.map(c => <option key={`pay-customer-${c.id}`} value={c.id}>{c.name}</option>)
            )}
          </select>
        </div>
      )}

      {showAddModal && createPortal(
        isExpense ? (
          <AddVendorModal 
            onClose={() => setShowAddModal(false)} 
            onSuccess={(id) => {
              setShowAddModal(false);
              fetchData().then(() => setCustomerId(id.toString()));
            }} 
            fetchWithAuth={fetchWithAuth}
          />
        ) : (
          <AddCustomerModal 
            onClose={() => setShowAddModal(false)} 
            onSuccess={(id) => {
              setShowAddModal(false);
              fetchData().then(() => setCustomerId(id.toString()));
            }} 
            fetchWithAuth={fetchWithAuth}
          />
        ),
        document.body
      )}
    </div>
  );
}

function NavItem({ active, onClick, icon: Icon, label }: any) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
        active 
          ? 'bg-emerald-50 text-emerald-700 font-bold' 
          : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
      }`}
    >
      <Icon className={`w-5 h-5 ${active ? 'text-emerald-600' : 'text-slate-400'}`} />
      {label}
    </button>
  );
}

function MobileNavItem({ active, onClick, icon: Icon }: any) {
  return (
    <button
      onClick={onClick}
      className={`p-3 rounded-xl transition-all ${
        active ? 'bg-emerald-50 text-emerald-600' : 'text-slate-400'
      }`}
    >
      <Icon className="w-6 h-6" />
    </button>
  );
}
