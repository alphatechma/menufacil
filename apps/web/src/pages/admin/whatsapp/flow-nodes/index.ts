import type { NodeTypes } from '@xyflow/react';
import { TriggerNode } from './TriggerNode';
import { SendMessageNode } from './SendMessageNode';
import { SendMediaNode } from './SendMediaNode';
import { SendMenuLinkNode } from './SendMenuLinkNode';
import { DelayNode } from './DelayNode';
import { WaitInputNode } from './WaitInputNode';
import { ConditionNode } from './ConditionNode';
import { CheckHoursNode } from './CheckHoursNode';
import { CheckCustomerNode } from './CheckCustomerNode';
import { LookupOrderNode } from './LookupOrderNode';
import { TransferHumanNode } from './TransferHumanNode';

export {
  TriggerNode,
  SendMessageNode,
  SendMediaNode,
  SendMenuLinkNode,
  DelayNode,
  WaitInputNode,
  ConditionNode,
  CheckHoursNode,
  CheckCustomerNode,
  LookupOrderNode,
  TransferHumanNode,
};

export const nodeTypes: NodeTypes = {
  trigger: TriggerNode,
  send_message: SendMessageNode,
  send_media: SendMediaNode,
  send_menu_link: SendMenuLinkNode,
  delay: DelayNode,
  wait_input: WaitInputNode,
  condition: ConditionNode,
  check_hours: CheckHoursNode,
  check_customer: CheckCustomerNode,
  lookup_order: LookupOrderNode,
  transfer_human: TransferHumanNode,
};
