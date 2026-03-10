import { useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Tabs } from '@/components/ui/Tabs';
import TemplatesTab from './TemplatesTab';
import ConversationsTab from './ConversationsTab';
import FlowsTab from './FlowsTab';

const TABS = [
  { key: 'conversas', label: 'Conversas' },
  { key: 'templates', label: 'Templates' },
  { key: 'fluxos', label: 'Fluxos' },
];

export default function WhatsappPage() {
  const [activeTab, setActiveTab] = useState('conversas');

  return (
    <div className="space-y-6">
      <PageHeader title="WhatsApp" backTo="/admin/settings" />
      <Tabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />
      {activeTab === 'conversas' && <ConversationsTab />}
      {activeTab === 'templates' && <TemplatesTab />}
      {activeTab === 'fluxos' && <FlowsTab />}
    </div>
  );
}
