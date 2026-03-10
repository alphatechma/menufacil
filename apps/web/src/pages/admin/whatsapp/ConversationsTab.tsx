import { useState, useEffect, useRef } from 'react';
import { Send, MessageCircle, ArrowLeft } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { cn } from '@/utils/cn';
import { formatPhone } from '@/utils/formatPhone';
import {
  useGetWhatsappConversationsQuery,
  useGetWhatsappMessagesQuery,
  useSendWhatsappMessageMutation,
} from '@/api/adminApi';
import { useAppSelector } from '@/store/hooks';
import { io } from 'socket.io-client';

const WHATSAPP_MESSAGE_NEW = 'whatsapp:message-new';

export default function ConversationsTab() {
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);

  return (
    <div className="flex gap-4 h-[calc(100vh-280px)] min-h-[400px]">
      <Card className={cn('w-80 shrink-0 overflow-y-auto', selectedPhone && 'hidden lg:block')}>
        <ConversationList selectedPhone={selectedPhone} onSelect={setSelectedPhone} />
      </Card>

      <Card className={cn('flex-1 flex flex-col', !selectedPhone && 'hidden lg:flex')}>
        {selectedPhone ? (
          <ChatArea phone={selectedPhone} onBack={() => setSelectedPhone(null)} />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <EmptyState title="Selecione uma conversa" description="Escolha uma conversa na lista ao lado." />
          </div>
        )}
      </Card>
    </div>
  );
}

function ConversationList({ selectedPhone, onSelect }: { selectedPhone: string | null; onSelect: (phone: string) => void }) {
  const { data: conversations, isLoading } = useGetWhatsappConversationsQuery();

  if (isLoading) return <div className="p-4 flex justify-center"><Spinner /></div>;

  if (!conversations?.length) {
    return <div className="p-4"><EmptyState title="Sem conversas" description="As conversas aparecerao aqui." /></div>;
  }

  return (
    <div className="divide-y divide-border">
      {conversations.map((conv: any) => (
        <button
          key={conv.phone}
          onClick={() => onSelect(conv.phone)}
          className={cn(
            'w-full text-left p-4 hover:bg-muted transition-colors',
            selectedPhone === conv.phone && 'bg-primary/5'
          )}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="font-medium text-sm text-foreground">{formatPhone(conv.phone)}</span>
            <span className="text-xs text-muted-foreground">
              {new Date(conv.last_message_at).toLocaleDateString('pt-BR')}
            </span>
          </div>
          <p className="text-xs text-muted-foreground truncate">
            {conv.last_direction === 'outbound' && 'Voce: '}
            {conv.last_message}
          </p>
        </button>
      ))}
    </div>
  );
}

function ChatArea({ phone, onBack }: { phone: string; onBack: () => void }) {
  const { data: messages, isLoading, refetch } = useGetWhatsappMessagesQuery(phone);
  const [sendMessage, { isLoading: sending }] = useSendWhatsappMessageMutation();
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const tenantId = useAppSelector((state) => state.adminAuth.user?.tenant_id);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!tenantId) return;
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    const socket = io(apiUrl, { transports: ['websocket'] });
    socket.emit('join:tenant-whatsapp', { tenantId });
    socket.on(WHATSAPP_MESSAGE_NEW, (msg: any) => {
      if (msg.customer_phone === phone) refetch();
    });
    return () => { socket.disconnect(); };
  }, [tenantId, phone, refetch]);

  const handleSend = async () => {
    const text = inputValue.trim();
    if (!text) return;
    setInputValue('');
    await sendMessage({ phone, content: text });
    refetch();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  if (isLoading) return <div className="flex-1 flex items-center justify-center"><Spinner /></div>;

  return (
    <>
      <div className="flex items-center gap-3 p-4 border-b border-border">
        <button onClick={onBack} className="lg:hidden text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <MessageCircle className="w-5 h-5 text-primary" />
        <span className="font-medium text-foreground">{phone}</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages?.map((msg: any) => (
          <div
            key={msg.id}
            className={cn(
              'max-w-[75%] rounded-2xl px-4 py-2',
              msg.direction === 'outbound'
                ? 'ml-auto bg-primary text-primary-foreground'
                : 'mr-auto bg-muted text-foreground'
            )}
          >
            <p className="text-sm">{msg.content}</p>
            <p className={cn(
              'text-xs mt-1',
              msg.direction === 'outbound' ? 'text-primary-foreground/70' : 'text-muted-foreground'
            )}>
              {new Date(msg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-border">
        <div className="flex gap-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Digite sua mensagem..."
            className="flex-1"
          />
          <Button onClick={handleSend} disabled={!inputValue.trim() || sending} loading={sending}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </>
  );
}
