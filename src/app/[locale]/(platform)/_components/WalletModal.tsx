'use client'

import type { WalletDepositModalProps, WalletWithdrawModalProps } from '@/app/[locale]/(platform)/_components/wallet-modal/utils'
import CustodialDepositPanel from '@/app/[locale]/(platform)/_components/wallet-modal/CustodialDepositPanel'
import CustodialWithdrawForm from '@/app/[locale]/(platform)/_components/wallet-modal/CustodialWithdrawForm'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'
import { useSiteIdentity } from '@/hooks/useSiteIdentity'

export type { WalletDepositModalProps, WalletWithdrawModalProps }
export type { PendingWithdrawalItem, WalletDepositView } from '@/app/[locale]/(platform)/_components/wallet-modal/utils'

export function WalletDepositModal(props: WalletDepositModalProps) {
  const { open, onOpenChange, isMobile, siteName } = props
  const site = useSiteIdentity()
  const siteLabel = siteName ?? site.name
  const content = <CustodialDepositPanel />

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[90vh] w-full bg-background px-0">
          <DrawerHeader className="gap-1 px-4 pt-3 pb-2">
            <DrawerTitle className="text-center text-xl font-semibold text-foreground">Deposit</DrawerTitle>
            <DrawerDescription className="text-center text-xs text-muted-foreground">{siteLabel}</DrawerDescription>
          </DrawerHeader>
          <div className="border-t" />
          <div className="w-full px-4 pb-4">
            <div className="space-y-4 pt-4">{content}</div>
          </div>
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border bg-background pt-4 sm:max-w-md">
        <DialogHeader className="gap-1">
          <DialogTitle className="text-center text-lg font-semibold text-foreground">Deposit</DialogTitle>
          <DialogDescription className="text-center text-xs text-muted-foreground">{siteLabel}</DialogDescription>
        </DialogHeader>
        <div className="-mx-6 border-t" />
        {content}
      </DialogContent>
    </Dialog>
  )
}

export function WalletWithdrawModal(props: WalletWithdrawModalProps) {
  const { open, onOpenChange, isMobile, siteName } = props
  const site = useSiteIdentity()
  const siteLabel = siteName ?? site.name
  const content = <CustodialWithdrawForm onClose={() => onOpenChange(false)} />

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[90vh] w-full bg-background px-0">
          <DrawerHeader className="px-4 pt-4 pb-2">
            <DrawerTitle className="text-center text-foreground">
              Withdraw from
              {' '}
              {siteLabel}
            </DrawerTitle>
          </DrawerHeader>
          <div className="w-full px-4 pb-4">
            <div className="space-y-4 pt-4">{content}</div>
          </div>
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-xl border bg-background">
        <DialogHeader>
          <DialogTitle className="text-center text-foreground">
            Withdraw from
            {' '}
            {siteLabel}
          </DialogTitle>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  )
}
