import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Wallet as WalletIcon, 
  Gamepad2, 
  Plus, 
  ArrowRightFromLine, 
  ChevronRight, 
  ArrowDown, 
  ArrowDownLeft,
  ArrowUpRight,
  Loader2, 
  History, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  FileText,
  X,
  Calendar,
  Filter,
  Gift,
  Trophy,
  Copy,
  Check,
  Receipt,
  Sparkles
} from 'lucide-react';
import { Page, User, Transaction } from '../types';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, where, orderBy, onSnapshot, limit } from 'firebase/firestore';

interface WalletPageProps {
  user: User;
  onPageChange: (page: Page) => void;
}

export default function WalletPage({ user, onPageChange }: WalletPageProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifyingOrder, setVerifyingOrder] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'success' | 'failed' | 'timeout' | null>(null);
  const [showStatementModal, setShowStatementModal] = useState(false);
  const [statementFilter, setStatementFilter] = useState<'all' | 'deposit' | 'withdraw' | 'match'>('all');

  useEffect(() => {
    // Check for payment status and order_id in URL for post-payment redirection
    const params = new URLSearchParams(window.location.search);
    const status = params.get('payment') as any;
    const orderId = params.get('order_id');

    if (status) {
      setPaymentStatus(status);
      setTimeout(() => setPaymentStatus(null), 10000);
    }

    if (orderId) {
      setVerifyingOrder(orderId);
      setTimeout(() => setVerifyingOrder(null), 15000);
    }

    // Clean URL params without page reload
    if (status || orderId) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    if (!auth.currentUser) return;

    const q = query(
      collection(db, 'transactions'),
      where('userId', '==', auth.currentUser.uid),
      orderBy('createdAt', 'desc'),
      limit(30)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const txs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
      setTransactions(txs);
      setLoading(false);
      
      if (verifyingOrder) {
        const found = txs.find(t => t.id === verifyingOrder && t.status === 'completed');
        if (found) {
          setVerifyingOrder(null);
        }
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'transactions');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [verifyingOrder]);

  // Dedicated Transaction History states
  type TxCategoryFilter = 'all' | 'deposit' | 'withdraw' | 'bonus' | 'match';
  const [historyFilter, setHistoryFilter] = useState<TxCategoryFilter>('all');
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [copiedTxId, setCopiedTxId] = useState(false);

  const handleCopyTxId = (id?: string) => {
    if (!id) return;
    navigator.clipboard.writeText(id);
    setCopiedTxId(true);
    setTimeout(() => setCopiedTxId(false), 2000);
  };

  const totalBalance = (user.wallet?.deposit || 0) + (user.wallet?.winnings || 0) + (user.wallet?.bonus || 0);

  const formatTransactionDate = (createdAt: any) => {
    if (!createdAt) return 'RECENT';
    try {
      let date: Date;
      if (typeof createdAt?.toDate === 'function') {
        date = createdAt.toDate();
      } else if (createdAt?.seconds) {
        date = new Date(createdAt.seconds * 1000);
      } else {
        date = new Date(createdAt);
      }
      if (!date || isNaN(date.getTime())) return 'RECENT';
      
      const day = date.getDate().toString().padStart(2, '0');
      const month = date.toLocaleString('en-US', { month: 'short' });
      const year = date.getFullYear();
      const time = date.toLocaleString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
      return `${day} ${month} ${year}, ${time}`;
    } catch {
      return 'RECENT';
    }
  };

  const isBonusReward = (tx: Transaction) => {
    const t = (tx.type as any);
    const title = (tx.title || '').toLowerCase();
    return t === 'bonus' || t === 'referral' || title.includes('bonus') || title.includes('referral') || title.includes('reward') || title.includes('signup');
  };

  const getTxTypeDetails = (tx: Transaction) => {
    if (tx.type === 'deposit') {
      return {
        label: 'Deposit',
        tag: 'DEPOSIT',
        isCredit: true,
        icon: ArrowDownLeft,
        iconBg: 'bg-emerald-50 text-emerald-600 border border-emerald-200/70',
        badgeBg: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
        amountColor: 'text-[#16A34A]'
      };
    }
    if (tx.type === 'withdraw') {
      return {
        label: 'Withdrawal',
        tag: 'WITHDRAWAL',
        isCredit: false,
        icon: ArrowUpRight,
        iconBg: 'bg-blue-50 text-blue-600 border border-blue-200/70',
        badgeBg: 'bg-blue-50 text-blue-700 border border-blue-200',
        amountColor: 'text-[#DC2626]'
      };
    }
    if (isBonusReward(tx)) {
      return {
        label: 'Bonus Reward',
        tag: 'BONUS',
        isCredit: true,
        icon: Gift,
        iconBg: 'bg-purple-50 text-purple-600 border border-purple-200/70',
        badgeBg: 'bg-purple-50 text-purple-700 border border-purple-200',
        amountColor: 'text-[#7C3AED]'
      };
    }
    if (tx.type === 'win') {
      return {
        label: 'Tournament Win',
        tag: 'WINNING',
        isCredit: true,
        icon: Trophy,
        iconBg: 'bg-amber-50 text-amber-600 border border-amber-200/70',
        badgeBg: 'bg-amber-50 text-amber-700 border border-amber-200',
        amountColor: 'text-[#D97706]'
      };
    }
    if (tx.type === 'entry') {
      return {
        label: 'Match Entry',
        tag: 'ENTRY',
        isCredit: false,
        icon: Gamepad2,
        iconBg: 'bg-slate-100 text-slate-600 border border-slate-200/70',
        badgeBg: 'bg-slate-100 text-slate-700 border border-slate-200',
        amountColor: 'text-[#DC2626]'
      };
    }
    return {
      label: 'Refund',
      tag: 'REFUND',
      isCredit: true,
      icon: Sparkles,
      iconBg: 'bg-emerald-50 text-emerald-600 border border-emerald-200/70',
      badgeBg: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
      amountColor: 'text-[#16A34A]'
    };
  };

  const getStatusDetails = (status?: string) => {
    const s = (status || 'completed').toLowerCase();
    if (s === 'completed' || s === 'success') {
      return {
        label: 'COMPLETED',
        color: 'text-emerald-700',
        bg: 'bg-emerald-50 border border-emerald-200',
        dot: 'bg-emerald-500',
        icon: CheckCircle2
      };
    }
    if (s === 'pending' || s === 'processing') {
      return {
        label: 'PENDING',
        color: 'text-amber-700',
        bg: 'bg-amber-50 border border-amber-200',
        dot: 'bg-amber-500 animate-pulse',
        icon: Clock
      };
    }
    return {
      label: 'FAILED',
      color: 'text-red-700',
      bg: 'bg-red-50 border border-red-200',
      dot: 'bg-red-500',
      icon: AlertCircle
    };
  };

  const isCredit = (tx: Transaction) => {
    return tx.type === 'deposit' || tx.type === 'win' || tx.type === 'refund' || isBonusReward(tx);
  };

  const filteredHistory = transactions.filter((tx) => {
    if (historyFilter === 'all') return true;
    if (historyFilter === 'deposit') return tx.type === 'deposit';
    if (historyFilter === 'withdraw') return tx.type === 'withdraw';
    if (historyFilter === 'bonus') return isBonusReward(tx);
    if (historyFilter === 'match') return tx.type === 'entry' || tx.type === 'win';
    return true;
  });

  const totalDeposited = transactions
    .filter((t) => t.type === 'deposit' && (t.status === 'completed' || !t.status))
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  const totalWithdrawn = transactions
    .filter((t) => t.type === 'withdraw' && (t.status === 'completed' || !t.status))
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  const totalBonus = transactions
    .filter((t) => isBonusReward(t))
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  const historyTabs: { id: TxCategoryFilter; label: string; count: number; icon: any }[] = [
    { id: 'all', label: 'All', count: transactions.length, icon: History },
    { id: 'deposit', label: 'Deposits', count: transactions.filter((t) => t.type === 'deposit').length, icon: ArrowDownLeft },
    { id: 'withdraw', label: 'Withdrawals', count: transactions.filter((t) => t.type === 'withdraw').length, icon: ArrowUpRight },
    { id: 'bonus', label: 'Bonus & Rewards', count: transactions.filter((t) => isBonusReward(t)).length, icon: Gift },
    { id: 'match', label: 'Tournaments', count: transactions.filter((t) => t.type === 'entry' || t.type === 'win').length, icon: Gamepad2 }
  ];

  const filteredTransactions = transactions.filter(tx => {
    if (statementFilter === 'all') return true;
    if (statementFilter === 'deposit') return tx.type === 'deposit';
    if (statementFilter === 'withdraw') return tx.type === 'withdraw';
    if (statementFilter === 'match') return tx.type === 'entry' || tx.type === 'win';
    return true;
  });

  return (
    <div className="min-h-screen bg-[#F5F7FB] text-[#172033] pb-24 max-w-lg mx-auto select-none">
      <div className="px-4 sm:px-5 pt-4 sm:pt-6 space-y-4">
        
        {/* ========================================================================= */}
        {/* 1. TOP HEADER (White card with Gamepad, Server Online, KHEL GALLI, Balance) */}
        {/* ========================================================================= */}
        <header className="bg-white border border-[#E5E7EB] rounded-2xl p-3 sm:p-3.5 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-100/70 border border-purple-200/50 flex items-center justify-center text-[#7C3AED] shrink-0">
              <Gamepad2 size={22} className="stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-extrabold uppercase tracking-widest text-[#667085]">
                  Server Online
                </span>
                <span className="w-2 h-2 rounded-full bg-[#16A34A] animate-pulse" />
              </div>
              <h1 className="text-base sm:text-lg font-black tracking-tight text-[#172033] leading-none mt-0.5">
                KHEL <span className="text-[#7C3AED]">GALLI</span>
              </h1>
            </div>
          </div>

          <div className="border border-[#E5E7EB] bg-white rounded-xl px-3 py-1.5 flex items-center gap-2 shadow-2xs">
            <span className="text-xs sm:text-sm font-black text-[#172033]">
              ₹{totalBalance.toLocaleString()}
            </span>
            <WalletIcon size={16} className="text-[#7C3AED] stroke-[2.2]" />
          </div>
        </header>

        {/* ========================================================================= */}
        {/* 2. PAYMENT STATUS ALERTS (Success / Failed / Verification)                */}
        {/* ========================================================================= */}
        <AnimatePresence>
          {paymentStatus && (
            <motion.div 
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className={`p-4 rounded-2xl border flex items-center gap-3.5 shadow-xs ${
                paymentStatus === 'success' 
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                  : 'bg-red-50 border-red-200 text-red-800'
              }`}
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                paymentStatus === 'success' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'
              }`}>
                {paymentStatus === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-black uppercase tracking-wider mb-0.5">
                  {paymentStatus === 'success' ? 'Payment Successful' : 
                   paymentStatus === 'failed' ? 'Payment Failed' : 'Payment Timeout'}
                </p>
                <p className="text-[10px] opacity-80 font-medium leading-tight">
                  {paymentStatus === 'success' 
                    ? 'Your wallet balance has been updated.' 
                    : 'There was an issue processing your payment. Please try again.'}
                </p>
              </div>
              <button 
                onClick={() => setPaymentStatus(null)} 
                className="opacity-50 hover:opacity-100 text-[10px] font-bold uppercase px-2 py-1 bg-white/50 rounded-lg"
              >
                Dismiss
              </button>
            </motion.div>
          )}

          {verifyingOrder && (
            <motion.div 
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="p-3.5 bg-purple-50 border border-purple-200 rounded-2xl flex items-center gap-3 shadow-xs"
            >
              <Loader2 size={16} className="text-[#7C3AED] animate-spin shrink-0" />
              <p className="text-[11px] font-black uppercase tracking-wider text-[#7C3AED]">
                Verifying Payment Status...
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ========================================================================= */}
        {/* 3. SECTION HEADING: WALLET MANAGEMENT                                     */}
        {/* ========================================================================= */}
        <div className="pt-1">
          <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-[#172033] px-1">
            WALLET MANAGEMENT
          </h2>
        </div>

        {/* ========================================================================= */}
        {/* 4. TOTAL ACCOUNT BALANCE CARD (Deposit, Winnings, Bonus)                  */}
        {/* ========================================================================= */}
        <div className="bg-white border border-[#E5E7EB] rounded-[24px] p-6 text-center shadow-xs">
          <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-[#667085] mb-1">
            TOTAL ACCOUNT BALANCE
          </p>
          <h3 className="text-4xl sm:text-5xl font-black italic tracking-tight text-[#172033] my-2">
            ₹{totalBalance.toLocaleString()}
          </h3>

          <div className="border-b border-[#E5E7EB] my-5" />

          <div className="grid grid-cols-3 divide-x divide-[#E5E7EB] text-center">
            <div className="px-2">
              <span className="block text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-[#667085] mb-1">
                DEPOSIT
              </span>
              <span className="text-sm sm:text-base font-black text-[#3B82F6]">
                ₹{(user.wallet?.deposit || 0).toLocaleString()}
              </span>
            </div>
            <div className="px-2">
              <span className="block text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-[#667085] mb-1">
                WINNINGS
              </span>
              <span className="text-sm sm:text-base font-black text-[#16A34A]">
                ₹{(user.wallet?.winnings || 0).toLocaleString()}
              </span>
            </div>
            <div className="px-2">
              <span className="block text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-[#667085] mb-1">
                BONUS
              </span>
              <span className="text-sm sm:text-base font-black text-[#7C3AED]">
                ₹{(user.wallet?.bonus || 0).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 5. PRIMARY ACTIONS: ADD CASH + WITHDRAW MONEY                             */}
        {/* ========================================================================= */}
        <div className="space-y-3 pt-1">
          <button 
            onClick={() => onPageChange(Page.ADD_MONEY)}
            className="w-full h-14 bg-gradient-to-r from-[#3B82F6] to-[#7C3AED] hover:from-[#2563EB] hover:to-[#6D28D9] text-white rounded-[20px] font-black text-xs sm:text-sm flex items-center justify-center gap-2.5 uppercase tracking-widest shadow-md shadow-purple-500/20 active:scale-[0.98] transition-all"
          >
            <Plus size={20} className="stroke-[3]" /> 
            <span>ADD CASH</span>
          </button>
          
          <button 
            onClick={() => onPageChange(Page.WITHDRAW)}
            className="w-full h-14 bg-white border border-[#E5E7EB] text-[#172033] rounded-[20px] font-black text-xs sm:text-sm flex items-center justify-center gap-2.5 uppercase tracking-widest hover:bg-slate-50 active:scale-[0.98] transition-all shadow-xs"
          >
            <ArrowRightFromLine size={18} className="stroke-[2.5]" /> 
            <span>WITHDRAW MONEY</span>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* 6. DEDICATED TRANSACTION HISTORY SECTION                                 */}
        {/* ========================================================================= */}
        <section className="pt-2 space-y-3">
          {/* Section Header */}
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-purple-100 text-[#7C3AED] flex items-center justify-center">
                <Receipt size={16} className="stroke-[2.5]" />
              </div>
              <div>
                <h4 className="text-xs sm:text-[13px] font-black uppercase tracking-wider text-[#172033]">
                  TRANSACTION HISTORY
                </h4>
              </div>
              <span className="text-[9px] font-black bg-slate-200/80 text-slate-700 px-2 py-0.5 rounded-full">
                {transactions.length}
              </span>
            </div>

            <button 
              onClick={() => setShowStatementModal(true)}
              className="text-[10px] sm:text-[11px] font-bold text-[#7C3AED] hover:text-[#6D28D9] flex items-center gap-1 uppercase tracking-wider active:scale-95 transition-all bg-purple-50 hover:bg-purple-100 px-2.5 py-1 rounded-lg border border-purple-200/50"
            >
              <FileText size={12} className="stroke-[2.2]" />
              <span>Full Statement</span>
              <ChevronRight size={12} className="stroke-[2.5]" />
            </button>
          </div>

          {/* Transaction Summary Metrics Strip */}
          <div className="grid grid-cols-3 gap-2">
            {/* Total Deposited */}
            <div className="bg-white border border-[#E5E7EB] rounded-2xl p-2.5 sm:p-3 shadow-2xs">
              <div className="flex items-center gap-1.5 text-emerald-600 mb-1">
                <ArrowDownLeft size={13} className="stroke-[2.8]" />
                <span className="text-[8.5px] sm:text-[9.5px] font-bold uppercase tracking-wider text-[#667085]">
                  Deposited
                </span>
              </div>
              <p className="text-xs sm:text-sm font-black text-emerald-700 truncate">
                ₹{totalDeposited.toLocaleString()}
              </p>
            </div>

            {/* Total Withdrawn */}
            <div className="bg-white border border-[#E5E7EB] rounded-2xl p-2.5 sm:p-3 shadow-2xs">
              <div className="flex items-center gap-1.5 text-blue-600 mb-1">
                <ArrowUpRight size={13} className="stroke-[2.8]" />
                <span className="text-[8.5px] sm:text-[9.5px] font-bold uppercase tracking-wider text-[#667085]">
                  Withdrawn
                </span>
              </div>
              <p className="text-xs sm:text-sm font-black text-blue-700 truncate">
                ₹{totalWithdrawn.toLocaleString()}
              </p>
            </div>

            {/* Total Bonus */}
            <div className="bg-white border border-[#E5E7EB] rounded-2xl p-2.5 sm:p-3 shadow-2xs">
              <div className="flex items-center gap-1.5 text-purple-600 mb-1">
                <Gift size={13} className="stroke-[2.8]" />
                <span className="text-[8.5px] sm:text-[9.5px] font-bold uppercase tracking-wider text-[#667085]">
                  Bonus Earned
                </span>
              </div>
              <p className="text-xs sm:text-sm font-black text-purple-700 truncate">
                ₹{totalBonus.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Interactive Category Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 -mx-0.5 px-0.5">
            {historyTabs.map((tab) => {
              const isActive = historyFilter === tab.id;
              const TabIcon = tab.icon;

              return (
                <button
                  key={tab.id}
                  onClick={() => setHistoryFilter(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap transition-all shrink-0 active:scale-95 ${
                    isActive
                      ? 'bg-[#172033] text-white shadow-xs'
                      : 'bg-white text-slate-600 border border-[#E5E7EB] hover:bg-slate-50'
                  }`}
                >
                  <TabIcon size={12} className={isActive ? 'text-white' : 'text-slate-400'} />
                  <span>{tab.label}</span>
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded-full font-black ${
                      isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Transaction Cards List */}
          <div className="space-y-2">
            {loading ? (
              <div className="py-12 bg-white border border-[#E5E7EB] rounded-2xl flex flex-col items-center justify-center shadow-xs">
                <Loader2 size={24} className="text-[#7C3AED] animate-spin mb-3" />
                <p className="text-[10px] font-black uppercase tracking-widest text-[#667085]">
                  Loading transactions...
                </p>
              </div>
            ) : filteredHistory.length === 0 ? (
              <div className="py-12 bg-white border border-[#E5E7EB] rounded-2xl text-center shadow-xs p-6">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
                  <History size={24} />
                </div>
                <p className="text-xs font-black uppercase tracking-wider text-[#172033]">
                  {historyFilter === 'all' 
                    ? 'No Transactions Found' 
                    : `No ${historyTabs.find(t => t.id === historyFilter)?.label} Found`}
                </p>
                <p className="text-[10px] text-[#667085] mt-1 max-w-xs mx-auto">
                  {historyFilter === 'deposit'
                    ? 'Add cash to your wallet to see deposit records here.'
                    : historyFilter === 'withdraw'
                    ? 'Your cash withdrawals to bank or UPI will be listed here.'
                    : historyFilter === 'bonus'
                    ? 'Refer friends or claim promotional rewards to earn bonuses.'
                    : 'Your completed and pending wallet transactions will appear here.'}
                </p>
                {historyFilter !== 'all' && (
                  <button
                    onClick={() => setHistoryFilter('all')}
                    className="mt-3 text-[10px] font-black text-[#7C3AED] hover:underline uppercase tracking-wider"
                  >
                    View All Transactions
                  </button>
                )}
              </div>
            ) : (
              filteredHistory.map((tx) => {
                const typeInfo = getTxTypeDetails(tx);
                const statusInfo = getStatusDetails(tx.status);
                const TypeIcon = typeInfo.icon;
                const StatusIcon = statusInfo.icon;

                return (
                  <motion.div 
                    key={tx.id} 
                    whileHover={{ scale: 1.005 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => setSelectedTx(tx)}
                    className="bg-white border border-[#E5E7EB] hover:border-slate-300 rounded-2xl p-3.5 shadow-2xs flex items-center justify-between cursor-pointer transition-all duration-150"
                  >
                    {/* Left: Icon + Type Badge + Description + Date */}
                    <div className="flex items-center gap-3 min-w-0 pr-2">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${typeInfo.iconBg}`}>
                        <TypeIcon size={18} className="stroke-[2.4]" />
                      </div>
                      
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-[11.5px] font-black tracking-tight text-[#172033] truncate">
                            {tx.title || typeInfo.label}
                          </p>
                          <span className={`text-[8px] font-black px-1.5 py-0.2 rounded uppercase tracking-wider ${typeInfo.badgeBg}`}>
                            {typeInfo.tag}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[9px] text-[#667085] font-bold">
                            {formatTransactionDate(tx.createdAt)}
                          </span>
                          {tx.id && (
                            <>
                              <span className="text-slate-300">•</span>
                              <span className="text-[8.5px] font-mono text-slate-400 truncate max-w-[80px]">
                                #{tx.id.slice(0, 8)}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Amount + Status Indicator Badge */}
                    <div className="text-right shrink-0 flex flex-col items-end gap-1">
                      <p className={`text-xs sm:text-sm font-black tracking-tight ${typeInfo.amountColor}`}>
                        {typeInfo.isCredit ? '+' : '-'}₹{tx.amount}
                      </p>
                      
                      {/* Status Indicator Badge */}
                      <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[8.5px] font-black uppercase tracking-wider ${statusInfo.bg} ${statusInfo.color}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot}`} />
                        <span>{statusInfo.label}</span>
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </section>
      </div>

      {/* ========================================================================= */}
      {/* 7. TRANSACTION RECEIPT / DETAILS MODAL                                    */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {selectedTx && (() => {
          const typeInfo = getTxTypeDetails(selectedTx);
          const statusInfo = getStatusDetails(selectedTx.status);
          const TypeIcon = typeInfo.icon;
          const StatusIcon = statusInfo.icon;

          return (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs"
              onClick={() => setSelectedTx(null)}
            >
              <motion.div 
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="w-full max-w-sm bg-white rounded-t-[32px] sm:rounded-[32px] overflow-hidden shadow-2xl border border-[#E5E7EB] p-5"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header with Close Button */}
                <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
                  <div className="flex items-center gap-2">
                    <Receipt size={18} className="text-[#7C3AED]" />
                    <span className="text-xs font-black uppercase tracking-wider text-[#172033]">
                      Transaction Receipt
                    </span>
                  </div>
                  <button 
                    onClick={() => setSelectedTx(null)}
                    className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Amount and Status Hero */}
                <div className="py-5 text-center bg-slate-50/70 -mx-5 px-5 my-3 border-y border-[#E5E7EB]">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-2 shadow-xs ${typeInfo.iconBg}`}>
                    <TypeIcon size={24} className="stroke-[2.5]" />
                  </div>
                  <p className={`text-2xl sm:text-3xl font-black italic tracking-tight ${typeInfo.amountColor}`}>
                    {typeInfo.isCredit ? '+' : '-'}₹{selectedTx.amount}
                  </p>
                  <p className="text-[11px] font-black uppercase text-[#172033] mt-1">
                    {selectedTx.title || typeInfo.label}
                  </p>
                  <div className="flex items-center justify-center gap-1.5 mt-2">
                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${statusInfo.bg} ${statusInfo.color}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot}`} />
                      <span>{statusInfo.label}</span>
                    </div>
                  </div>
                </div>

                {/* Detailed Information Rows */}
                <div className="space-y-2.5 py-1 text-xs">
                  {/* Category */}
                  <div className="flex items-center justify-between py-1 border-b border-slate-100">
                    <span className="text-[10px] font-bold uppercase text-[#667085]">Type</span>
                    <span className="font-extrabold text-[#172033] uppercase text-[11px]">
                      {typeInfo.label}
                    </span>
                  </div>

                  {/* Date & Time */}
                  <div className="flex items-center justify-between py-1 border-b border-slate-100">
                    <span className="text-[10px] font-bold uppercase text-[#667085]">Date & Time</span>
                    <span className="font-extrabold text-[#172033] text-[11px]">
                      {formatTransactionDate(selectedTx.createdAt)}
                    </span>
                  </div>

                  {/* Transaction ID with Copy Button */}
                  <div className="flex items-center justify-between py-1 border-b border-slate-100">
                    <span className="text-[10px] font-bold uppercase text-[#667085]">Reference ID</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-[#172033] text-[10px] max-w-[140px] truncate">
                        {selectedTx.id || 'N/A'}
                      </span>
                      {selectedTx.id && (
                        <button
                          onClick={() => handleCopyTxId(selectedTx.id)}
                          className="p-1 hover:bg-slate-200 rounded text-slate-500 hover:text-slate-800 transition-colors"
                          title="Copy Transaction ID"
                        >
                          {copiedTxId ? (
                            <Check size={12} className="text-emerald-600" />
                          ) : (
                            <Copy size={12} />
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Impact on Balance */}
                  <div className="flex items-center justify-between py-1">
                    <span className="text-[10px] font-bold uppercase text-[#667085]">Wallet Impact</span>
                    <span className={`font-extrabold text-[10px] uppercase ${typeInfo.amountColor}`}>
                      {typeInfo.isCredit ? 'Added to balance' : 'Deducted from balance'}
                    </span>
                  </div>
                </div>

                {/* Close Button */}
                <button
                  onClick={() => setSelectedTx(null)}
                  className="w-full mt-4 py-3 bg-[#172033] hover:bg-black text-white rounded-xl font-black text-xs uppercase tracking-wider transition-colors active:scale-98 shadow-sm"
                >
                  Close Receipt
                </button>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* 8. STATEMENT & DETAILED ACCOUNT MODAL                                      */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showStatementModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs"
          >
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="w-full max-w-lg bg-white rounded-t-[32px] sm:rounded-[32px] max-h-[85vh] flex flex-col overflow-hidden shadow-2xl border border-[#E5E7EB]"
            >
              {/* Modal Header */}
              <div className="p-4 sm:p-5 border-b border-[#E5E7EB] flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-purple-100 text-[#7C3AED] flex items-center justify-center">
                    <FileText size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-[#172033] uppercase tracking-tight">
                      Account Statement
                    </h3>
                    <p className="text-[10px] font-bold text-[#667085]">
                      Total {transactions.length} recorded events
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowStatementModal(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Filter Chips */}
              <div className="px-4 py-3 border-b border-[#E5E7EB] flex items-center gap-2 overflow-x-auto no-scrollbar">
                {[
                  { id: 'all', label: 'All Activities' },
                  { id: 'deposit', label: 'Deposits' },
                  { id: 'withdraw', label: 'Withdrawals' },
                  { id: 'match', label: 'Tournaments' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setStatementFilter(tab.id as any)}
                    className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider whitespace-nowrap transition-all ${
                      statementFilter === tab.id
                        ? 'bg-[#7C3AED] text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Statement List */}
              <div className="p-4 overflow-y-auto space-y-2.5 flex-1 max-h-[50vh]">
                {filteredTransactions.length === 0 ? (
                  <div className="py-12 text-center text-xs font-bold text-slate-400">
                    No transactions matching this filter.
                  </div>
                ) : (
                  filteredTransactions.map((tx) => {
                    const credit = isCredit(tx);
                    return (
                      <div 
                        key={tx.id} 
                        className="bg-slate-50/70 border border-[#E5E7EB] rounded-xl p-3 flex items-center justify-between text-xs"
                      >
                        <div className="min-w-0 pr-2">
                          <p className="font-black text-[#172033] uppercase text-[11px] truncate">
                            {tx.title || tx.type}
                          </p>
                          <p className="text-[9px] font-bold text-slate-400 mt-0.5">
                            {formatTransactionDate(tx.createdAt)}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className={`font-black text-xs ${credit ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>
                            {credit ? '+' : '-'}₹{tx.amount}
                          </p>
                          <p className="text-[8px] font-black uppercase text-slate-500">
                            {tx.status}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-[#E5E7EB] bg-slate-50/50">
                <button
                  onClick={() => setShowStatementModal(false)}
                  className="w-full py-3 bg-[#172033] text-white rounded-xl font-black text-xs uppercase tracking-wider hover:bg-black transition-colors"
                >
                  Close Statement
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
