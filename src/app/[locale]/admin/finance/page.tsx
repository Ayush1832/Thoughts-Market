'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import PaymentControlSection from './_components/PaymentControlSection'
import TreasuryPanelSection from './_components/TreasuryPanelSection'
import FeesManagementSection from './_components/FeesManagementSection'
import AutoAlertsSection from './_components/AutoAlertsSection'

export default function FinancePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Finance & Treasury</h1>
        <p className="text-muted-foreground mt-2">
          Manage payments, treasury, fees, and alerts
        </p>
      </div>

      <Tabs defaultValue="payments" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto">
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="treasury">Treasury</TabsTrigger>
          <TabsTrigger value="fees">Fees</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
        </TabsList>

        <TabsContent value="payments" className="space-y-4">
          <PaymentControlSection />
        </TabsContent>

        <TabsContent value="treasury" className="space-y-4">
          <TreasuryPanelSection />
        </TabsContent>

        <TabsContent value="fees" className="space-y-4">
          <FeesManagementSection />
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <AutoAlertsSection />
        </TabsContent>
      </Tabs>
    </div>
  )
}
