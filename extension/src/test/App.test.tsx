import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from '../sidebar/App'

// Mock the messaging utility
vi.mock('../utils/messaging', () => ({
  sendMessage: vi.fn().mockResolvedValue({ fields: [] }),
}))

describe('App', () => {
  it('renders without crashing', () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    })

    render(
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    )

    expect(screen.getByText('FormPilot')).toBeInTheDocument()
  })

  it('shows upload tab by default', () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    })

    render(
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    )

    expect(screen.getByText('Upload')).toBeInTheDocument()
    expect(screen.getByText('Drop PDF here or click to browse')).toBeInTheDocument()
  })
})