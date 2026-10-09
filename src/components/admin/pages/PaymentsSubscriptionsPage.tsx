import React, { useState } from 'react';
import {
  CreditCard,
  Receipt,
  RotateCcw,
  Sparkles,
  CheckCircle,
  ExternalLink,
  ShieldCheck,
  Plus,
} from 'lucide-react';
import { OrderPaymentDTO } from '../../../lib/api/client.js';
import { Button } from '../../ui/button.js';
import { Badge } from '../../ui/badge.js';
import { Card, CardHeader, CardTitle, CardContent } from '../../ui/card.js';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../ui/tabs.js';
import { toast } from 'sonner';

export const PaymentsSubscriptionsPage: React.FC<{ orders: OrderPaymentDTO[] }> = ({ orders }) => {
  const [activeTab, setActiveTab] = useState('orders');

  const subscriptionPlans = [
    {
      id: 'sub-plan-1',
      name: 'BCS 1-Year Comprehensive All-Access Pass',
      priceBdt: 1500,
      period: '12 Months',
      activeSubscribers: 1420,
      features: ['All BCS Model Tests', 'Full Solution Explanations', 'Offline Mobile Downloads'],
    },
    {
      id: 'sub-plan-2',
      name: 'Medical Admission Crash Course',
      priceBdt: 990,
      period: '6 Months',
      activeSubscribers: 840,
      features: ['Biology + Chemistry + Physics Subject Tests', 'Live Weekly Rank Predictor'],
    },
  ];

  const coupons = [
    { code: 'EID2026', discount: '20% OFF', usage: '312 / 500', status: 'ACTIVE' },
    { code: 'BCS46SPECIAL', discount: '৳150 FLAT', usage: '488 / 500', status: 'ACTIVE' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-4">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            Finance, Orders & Subscriptions Management
          </h2>
          <p className="text-xs text-slate-400">
            Payment gateways: SSLCommerz & AamarPay with signed webhook verification and idempotent fulfillment.
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => toast.success('Create coupon triggered')}
          className="h-8 gap-1.5 text-xs bg-orange-600 hover:bg-orange-700"
        >
          <Plus className="h-3.5 w-3.5" /> Create Coupon Code
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-slate-900 border-slate-800">
          <TabsTrigger value="orders" className="text-xs gap-1.5">
            <Receipt className="h-3.5 w-3.5" /> Transactions & Orders ({orders.length})
          </TabsTrigger>
          <TabsTrigger value="plans" className="text-xs gap-1.5">
            <RotateCcw className="h-3.5 w-3.5" /> Subscription Plans (2)
          </TabsTrigger>
          <TabsTrigger value="coupons" className="text-xs gap-1.5">
            <Sparkles className="h-3.5 w-3.5" /> Coupons & Discounts (2)
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Orders */}
        <TabsContent value="orders" className="space-y-4">
          <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-900">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-950 border-b border-slate-800 text-slate-400">
                <tr>
                  <th className="p-3">Order Number</th>
                  <th className="p-3">Candidate Email</th>
                  <th className="p-3">Gateway</th>
                  <th className="p-3">Gateway Transaction ID</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-200">
                {orders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-slate-800/40">
                    <td className="p-3 font-mono font-bold text-orange-400">{ord.orderNumber}</td>
                    <td className="p-3">{ord.userEmail}</td>
                    <td className="p-3">
                      <Badge variant="outline" className="text-[10px] font-mono">
                        {ord.gateway}
                      </Badge>
                    </td>
                    <td className="p-3 font-mono text-slate-400 text-[11px]">{ord.transactionId}</td>
                    <td className="p-3 font-mono font-bold text-emerald-400">৳ {ord.amountBdt}</td>
                    <td className="p-3">
                      <Badge variant="success" className="text-[10px]">
                        {ord.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* Tab 2: Subscription Plans */}
        <TabsContent value="plans" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {subscriptionPlans.map((plan) => (
              <Card key={plan.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <Badge variant="warning">{plan.period}</Badge>
                    <span className="text-lg font-bold text-white font-mono">৳ {plan.priceBdt} BDT</span>
                  </div>
                  <CardTitle className="text-sm font-bold text-white mt-2">{plan.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="text-xs text-slate-400">
                    Active Subscribers: <strong className="text-white">{plan.activeSubscribers} candidates</strong>
                  </div>
                  <ul className="text-xs text-slate-300 space-y-1 list-disc list-inside">
                    {plan.features.map((f, i) => (
                      <li key={i}>{f}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Tab 3: Coupons */}
        <TabsContent value="coupons" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {coupons.map((c) => (
              <Card key={c.code}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="font-mono font-bold text-sm text-orange-400">{c.code}</div>
                    <div className="text-xs text-emerald-400 font-semibold">{c.discount}</div>
                    <div className="text-[11px] text-slate-400">Redemptions: {c.usage}</div>
                  </div>
                  <Badge variant="success" className="text-[10px]">{c.status}</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
