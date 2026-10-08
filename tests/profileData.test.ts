import { beforeEach, describe, expect, it, vi } from 'vitest'
import { deleteAccount } from '../src/lib/profileData'

const accountMocks = vi.hoisted(() => ({ invoke: vi.fn(), signOut: vi.fn() }))

vi.mock('../src/lib/supabase', () => ({
  supabase: { functions: { invoke: accountMocks.invoke }, auth: { signOut: accountMocks.signOut } },
}))

describe('secure account deletion client flow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    accountMocks.invoke.mockResolvedValue({ data: { deleted: true }, error: null })
    accountMocks.signOut.mockResolvedValue({ error: null })
  })

  it('calls the server deletion function and only clears the local session after confirmation', async () => {
    await deleteAccount()

    expect(accountMocks.invoke).toHaveBeenCalledWith('delete-account', { method: 'POST' })
    expect(accountMocks.signOut).toHaveBeenCalledWith({ scope: 'local' })
  })

  it('does not sign out as if deletion succeeded when the server reports an error', async () => {
    accountMocks.invoke.mockResolvedValue({ data: null, error: { message: 'Deletion failed.' } })

    await expect(deleteAccount()).rejects.toThrow('Deletion failed.')
    expect(accountMocks.signOut).not.toHaveBeenCalled()
  })
})
