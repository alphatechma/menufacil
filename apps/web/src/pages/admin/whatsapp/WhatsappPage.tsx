import { useMemo, useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Tabs } from '@/components/ui/Tabs';
import { usePermission } from '@/hooks/usePermission';
import TemplatesTab from './TemplatesTab';
import ConversationsTab from './ConversationsTab';
import FlowsTab from './FlowsTab';

export default function WhatsappPage() {
  const { hasModule } = usePermission();
  const [activeTab, setActiveTab] = useState('conversas');

  const tabs = useMemo(() => {
    const base = [
      { key: 'conversas', label: 'Conversas' },
      { key: 'templates', label: 'Templates' },
    ];
    if (hasModule('whatsapp_flows')) {
      base.push({ key: 'fluxos', label: 'Fluxos' });
    }
    return base;
  }, [hasModule]);

  return (
    <div className="space-y-6">
      <PageHeader title="WhatsApp" backTo="/admin/settings" />
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
      {activeTab === 'conversas' && <ConversationsTab />}
      {activeTab === 'templates' && <TemplatesTab />}
      {activeTab === 'fluxos' && <FlowsTab />}
    </div>
  );
}
