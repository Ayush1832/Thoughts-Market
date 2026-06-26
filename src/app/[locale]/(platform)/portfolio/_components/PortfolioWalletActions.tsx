'use client'

import { ArrowDownToLineIcon, ArrowUpToLineIcon } from 'lucide-react'
import { useExtracted } from 'next-intl'
import { useSearchParams } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { useTradingOnboarding } from '@/app/[locale]/(platform)/_providers/TradingOnboardingProvider'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface PortfolioWalletActionsProps {
  className?: string
}

export default function PortfolioWalletActions({ className }: PortfolioWalletActionsProps) {
  const t = useExtracted()
  const { startDepositFlow, startWithdrawFlow } = useTradingOnboarding()

  // Auto-open the deposit/withdraw flow when arriving with ?action= (e.g. the
  // header "Cash" tap navigates here with ?action=deposit).
  const searchParams = useSearchParams()
  const action = searchParams.get('action')
  const handledRef = useRef(false)
  useEffect(() => {
    if (handledRef.current) {
      return
    }
    if (action === 'deposit') {
      handledRef.current = true
      startDepositFlow()
    }
    else if (action === 'withdraw') {
      handledRef.current = true
      startWithdrawFlow()
    }
  }, [action, startDepositFlow, startWithdrawFlow])

  return (
    <div className={cn('grid grid-cols-2 gap-3', className)}>
      <Button className="h-11 flex-1" onClick={startDepositFlow}>
        <ArrowDownToLineIcon className="size-4" />
        {t('Deposit')}
      </Button>
      <Button variant="outline" className="h-11 flex-1" onClick={startWithdrawFlow}>
        <ArrowUpToLineIcon className="size-4" />
        {t('Withdraw')}
      </Button>
    </div>
  )
}
