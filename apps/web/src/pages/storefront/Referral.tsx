import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Share2, Copy, Check, Users, Gift, ArrowLeft, MessageCircle, Loader2 } from 'lucide-react';
import { useNotify } from '@/hooks/useNotify';
import {
  useGetMyReferralCodeQuery,
  useGetMyReferralsQuery,
  useApplyReferralCodeMutation,
} from '@/api/customerApi';
import { useAppSelector } from '@/store/hooks';
import { cn } from '@/utils/cn';

export default function Referral() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const notify = useNotify();
  const customerAuth = useAppSelector((state) => state.customerAuth);

  const { data: codeData, isLoading: loadingCode } = useGetMyReferralCodeQuery(
    { slug: slug! },
    { skip: !slug || !customerAuth.isAuthenticated },
  );
  const { data: referrals = [], isLoading: loadingReferrals } = useGetMyReferralsQuery(
    { slug: slug! },
    { skip: !slug || !customerAuth.isAuthenticated },
  );
  const [applyCode, { isLoading: applying }] = useApplyReferralCodeMutation();

  const [copied, setCopied] = useState(false);
  const [referralInput, setReferralInput] = useState('');

  if (!customerAuth.isAuthenticated) {
    navigate(`/${slug}/account`);
    return null;
  }

  const referralCode = codeData?.code || '';
  const referralLink = `${window.location.origin}/${slug}/account?ref=${referralCode}`;
  const totalPoints = referrals.reduce((sum: number, r: any) => sum + (r.points_awarded || 0), 0);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(referralCode);
      setCopied(true);
      notify.success('Código copiado!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      notify.error('Erro ao copiar');
    }
  };

  const shareWhatsApp = () => {
    const text = `Ei! Use meu código ${referralCode} para se cadastrar e ganhar pontos! ${referralLink}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleApplyCode = async () => {
    const code = referralInput.trim().toUpperCase();
    if (!code) {
      notify.error('Digite um código de indicação');
      return;
    }
    try {
      await applyCode({ slug: slug!, code }).unwrap();
      notify.success('Código aplicado com sucesso!');
      setReferralInput('');
    } catch (err: any) {
      notify.error(err?.data?.message || 'Erro ao aplicar código');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div
        className="px-4 pt-12 pb-8"
        style={{ background: `linear-gradient(135deg, var(--tenant-primary), var(--tenant-primary-dark))` }}
      >
        <button
          onClick={() => navigate(`/${slug}/account`)}
          className="flex items-center gap-1 text-white/80 hover:text-white mb-4 text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </button>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
            <Share2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Indique Amigos</h1>
            <p className="text-white/80 text-sm">Ganhe pontos por cada indicação</p>
          </div>
        </div>
      </div>

      <div className="px-4 -mt-4 space-y-4">
        {/* Info Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-3 mb-3">
            <Gift className="w-5 h-5" style={{ color: 'var(--tenant-primary)' }} />
            <h3 className="font-bold text-gray-900">Como funciona</h3>
          </div>
          <ol className="space-y-2 text-sm text-gray-600">
            <li className="flex gap-2">
              <span className="font-bold" style={{ color: 'var(--tenant-primary)' }}>1.</span>
              Compartilhe seu código com amigos
            </li>
            <li className="flex gap-2">
              <span className="font-bold" style={{ color: 'var(--tenant-primary)' }}>2.</span>
              Seu amigo se cadastra usando seu código
            </li>
            <li className="flex gap-2">
              <span className="font-bold" style={{ color: 'var(--tenant-primary)' }}>3.</span>
              Quando ele fizer o primeiro pedido, voce ganha <strong>100 pontos</strong>!
            </li>
          </ol>
        </div>

        {/* My Referral Code */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-bold text-gray-900 mb-3">Seu código de indicação</h3>
          {loadingCode ? (
            <div className="flex justify-center py-4">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-4">
                <div className="flex-1 bg-gray-50 rounded-xl px-5 py-4 text-center">
                  <span className="text-2xl font-bold tracking-widest text-gray-900">{referralCode}</span>
                </div>
                <button
                  onClick={copyCode}
                  className={cn(
                    'p-3 rounded-xl transition-colors',
                    copied ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
                  )}
                >
                  {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                </button>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={shareWhatsApp}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-white text-sm font-medium transition-colors"
                  style={{ backgroundColor: '#25D366' }}
                >
                  <MessageCircle className="w-4 h-4" />
                  WhatsApp
                </button>
                <button
                  onClick={copyCode}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-colors border-2"
                  style={{ borderColor: 'var(--tenant-primary)', color: 'var(--tenant-primary)' }}
                >
                  <Copy className="w-4 h-4" />
                  Copiar Link
                </button>
              </div>
            </>
          )}
        </div>

        {/* Apply Referral Code */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-bold text-gray-900 mb-3">Tem um código de indicação?</h3>
          <div className="flex gap-2">
            <input
              className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-sm uppercase focus:outline-none focus:ring-2 focus:border-transparent"
              style={{ '--tw-ring-color': 'var(--tenant-primary)' } as any}
              value={referralInput}
              onChange={(e) => setReferralInput(e.target.value.toUpperCase())}
              placeholder="Digite o código"
              maxLength={8}
            />
            <button
              onClick={handleApplyCode}
              disabled={applying || !referralInput.trim()}
              className="px-5 py-3 rounded-xl text-white text-sm font-medium transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: 'var(--tenant-primary)' }}
            >
              {applying ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Aplicar'}
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 text-center">
            <Users className="w-6 h-6 mx-auto mb-1" style={{ color: 'var(--tenant-primary)' }} />
            <p className="text-2xl font-bold text-gray-900">{referrals.length}</p>
            <p className="text-xs text-gray-500">Indicados</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 text-center">
            <Gift className="w-6 h-6 mx-auto mb-1" style={{ color: 'var(--tenant-primary)' }} />
            <p className="text-2xl font-bold text-gray-900">{totalPoints}</p>
            <p className="text-xs text-gray-500">Pontos ganhos</p>
          </div>
        </div>

        {/* My Referrals List */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
          <div className="p-4 border-b border-gray-100">
            <h3 className="font-bold text-gray-900">Meus Indicados</h3>
          </div>
          {loadingReferrals ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : referrals.length === 0 ? (
            <div className="py-8 text-center">
              <Users className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm text-gray-500">Nenhum indicado ainda</p>
              <p className="text-xs text-gray-400 mt-1">Compartilhe seu código para comecar</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-50">
              {referrals.map((ref: any) => (
                <li key={ref.id} className="px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{ref.referred_name}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(ref.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <div className="text-right">
                    {ref.reward_given ? (
                      <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
                        +{ref.points_awarded} pts
                      </span>
                    ) : (
                      <span className="text-xs font-medium text-yellow-600 bg-yellow-50 px-2 py-1 rounded-full">
                        Pendente
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
