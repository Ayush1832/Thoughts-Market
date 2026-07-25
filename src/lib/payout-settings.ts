import { TronWeb } from 'tronweb'
import { SettingsRepository } from '@/lib/db/queries/settings'
import 'server-only'

const PAYOUT_SETTINGS_GROUP = 'payout'
const CLIENT_TRON_ADDRESS_KEY = 'client_tron_address'

export function validateClientTronAddress(value: string): { value: string | null, error: string | null } {
  const normalized = value.trim()
  if (!normalized) {
    return { value: null, error: 'Client payout address is required.' }
  }
  if (!TronWeb.isAddress(normalized)) {
    return { value: null, error: 'Enter a valid Tron (TRC-20) address.' }
  }
  return { value: normalized, error: null }
}

export async function getClientTronAddress(): Promise<string | null> {
  const { data } = await SettingsRepository.getSettings()
  const stored = data?.[PAYOUT_SETTINGS_GROUP]?.[CLIENT_TRON_ADDRESS_KEY]?.value?.trim()
  return stored || null
}

export async function saveClientTronAddress(value: string): Promise<{ error: string | null }> {
  const validated = validateClientTronAddress(value)
  if (validated.error || !validated.value) {
    return { error: validated.error }
  }

  const { error } = await SettingsRepository.updateSettings([
    { group: PAYOUT_SETTINGS_GROUP, key: CLIENT_TRON_ADDRESS_KEY, value: validated.value },
  ])
  if (error) {
    return { error: 'Failed to save client payout address.' }
  }

  return { error: null }
}
