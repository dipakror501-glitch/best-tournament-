import { useState, useEffect } from 'react';
import { ArrowLeft, Landmark, Info, Banknote, ShieldAlert, CheckCircle2, Loader2, ShieldCheck } from 'lucide-react';
import { Page, User, PaymentGateway } from '../types';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, increment, runTransaction, collection, serverTimestamp } from 'firebase/firestore';
import { paymentService } from '../services/paymentService';

interface WithdrawProps {
  user: User;
  onPageChange: (page: Page) => void;
}

export default function Withdraw({ user, onPageChange }: WithdrawProps) {
  const [amount, setAmount] = useState('500');
  const [loading, setLoading] = useState(false);
  const [activeGateway, setActiveGateway] = useState<PaymentGateway | null>(null);

  useEffect(() => {
    const fetch = async () => {
      const g = await paymentService.getActiveGatewayAsync();
      setActiveGateway(g);
    };
    fetch();
  }, []);

  const handleWithdraw = async () => {
    if (!auth.currentUser || !amount) return;
    const value = parseInt(amount);
    if (isNaN(value) || value < 100 || value > (user.wallet?.winnings || 0)) return;

    setLoading(true);
    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await runTransaction(db, async (transaction) => {
        const uSnap = await transaction.get(userRef);
        if (!uSnap.exists()) throw new Error('User not found');
        
        const userData = uSnap.data() as User;
        const currentWinnings = userData.wallet?.winnings || 0;
        
        if (currentWinnings < value) throw new Error('Insufficient winnings balance');
        
        transaction.update(userRef, {
          "wallet.winnings": increment(-value)
        });
        
        const transRef = doc(collection(db, 'transactions'));
        transaction.set(transRef, {
          userId: auth.currentUser!.uid,
          type: 'withdraw',
          amount: value,
          status: 'pending',
          title: `Withdrawal via ${activeGateway?.name || 'Bank Transfer'}`,
          createdAt: serverTimestamp()
        });
      });
      onPageChange(Page.WALLET);
    } catch (error: any) {
      alert(error.message || 'Withdrawal failed');
      handleFirestoreError(error, OperationType.UPDATE, `users/${auth.currentUser.uid}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pb-24 max-w-lg mx-auto bg-background min-h-screen">
      <div className="px-5 py-8">
        <div className="flex items-center gap-4 mb-10">
          <button 
            onClick={() => onPageChange(Page.WALLET)}
            className="p-2.5 bg-neutral-900 border border-neutral-800 rounded-xl text-neutral-500 hover:text-white transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex flex-col">
            <h2 className="text-xl font-bold tracking-tighter uppercase italic">Secure <span className="text-purple-500">Withdrawal</span></h2>
            {activeGateway && (
              <div className="flex items-center gap-1.5 mt-0.5">
                <ShieldCheck size={10} className="text-emerald-500" />
                <span className="text-[8px] font-black uppercase tracking-widest text-emerald-500/80">Transfer via {activeGateway.name}</span>
              </div>
            )}
          </div>
        </div>

        {/* Withdrawal Card */}
        <section className="bg-neutral-900 border border-neutral-800 rounded-[2.5rem] p-8 mb-8 flex flex-col items-center shadow-2xl relative overflow-hidden">
          <div className="w-16 h-16 bg-purple-500/10 rounded-2xl flex items-center justify-center text-purple-500 mb-6 shadow-xl shadow-purple-500/5 border border-purple-500/10">
            <Banknote size={32} />
          </div>
          
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500 mb-2">Available for withdrawal</p>
          <h3 className="text-4xl font-black tracking-tighter mb-8 italic">₹{(user.wallet?.winnings || 0).toLocaleString()}</h3>

          <div className="w-full space-y-1.5 text-left mb-2">
            <label className="text-[9px] font-black uppercase tracking-widest text-neutral-600 pl-1">Amount to Transfer</label>
            <div className="relative">
              <span className="absolute left-5 top-1/2 -translate-y-1/2 text-xl font-black text-neutral-700 italic">₹</span>
              <input 
                type="number" 
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-black border border-neutral-800 rounded-2xl py-4 pl-10 pr-5 text-xl font-black tracking-tight outline-hidden focus:border-purple-500/40 text-white italic"
                placeholder="0"
              />
            </div>
            <div className="flex justify-between px-2 mt-2">
              <p className="text-[8px] font-black text-neutral-700 uppercase tracking-[0.2em]">Min: ₹100</p>
              <p className="text-[8px] font-black text-neutral-700 uppercase tracking-[0.2em]">Max: ₹50k</p>
            </div>
          </div>
        </section>

        {/* Account Selection */}
        <h4 className="text-[9px] font-black uppercase tracking-[0.3em] text-neutral-500 mb-4 pl-1">Target Account</h4>
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 mb-8 flex items-center justify-between group cursor-pointer hover:border-purple-500/30 transition-all">
          <div className="flex items-center gap-5">
            <div className="w-11 h-11 rounded-xl bg-black flex items-center justify-center text-purple-500 border border-white/5">
              <Landmark size={20} />
            </div>
            <div>
              <h5 className="text-[11px] font-bold uppercase tracking-tight italic">HDFC Bank India</h5>
              <p className="text-[9px] font-black text-neutral-600 uppercase tracking-widest mt-0.5">•••• 4520</p>
            </div>
          </div>
          <div className="p-1 px-2 bg-emerald-500/10 rounded-lg">
            <CheckCircle2 size={16} className="text-emerald-500" />
          </div>
        </div>

        {/* Advisory */}
        <div className="bg-neutral-900/40 border border-neutral-800 rounded-2xl p-6 mb-10 flex gap-4">
          <ShieldAlert className="text-neutral-700 shrink-0" size={20} />
          <div className="space-y-1">
            <h5 className="text-[10px] font-black uppercase tracking-widest leading-none text-neutral-400">Processing Time</h5>
            <p className="text-[9px] text-neutral-600 font-medium leading-relaxed">
              Funds are usually transferred within 2-4 business days. Verification may be required for large amounts.
            </p>
          </div>
        </div>

        <button 
          onClick={handleWithdraw}
          disabled={loading || parseInt(amount) < 100 || parseInt(amount) > (user.wallet?.winnings || 0)}
          className={`w-full h-14 rounded-2xl font-black text-xs uppercase tracking-[0.3em] shadow-2xl flex items-center justify-center gap-3 transition-all ${
            loading || parseInt(amount) < 100 || parseInt(amount) > (user.wallet?.winnings || 0)
              ? 'bg-neutral-900 text-neutral-700 cursor-not-allowed'
              : 'bg-purple-600 text-white shadow-purple-600/40 active:scale-95'
          }`}
        >
          {loading ? <Loader2 className="animate-spin" size={18} /> : 'Transfer Funds'}
        </button>
      </div>
    </div>
  );
}
