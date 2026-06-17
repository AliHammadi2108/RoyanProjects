import { getApprovalRules } from '@/actions/access-control';
import { getCurrencies } from '@/actions/master-data';
import { ApprovalRulesClient } from '@/components/pages/ApprovalRulesClient';

export default async function ApprovalRulesPage() {
  const [rules, currencies] = await Promise.all([getApprovalRules(), getCurrencies({ activeOnly: true })]);
  return (
    <ApprovalRulesClient
      initialData={JSON.parse(JSON.stringify(rules))}
      currencies={JSON.parse(JSON.stringify(currencies))}
    />
  );
}
