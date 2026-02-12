'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Key, Save, Eye, EyeOff, Trash2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface ApiKey {
  id: string
  service_name: string
  api_key: string
  created_at: string
  updated_at: string
}

const SUPPORTED_SERVICES = [
  { name: 'anthropic', label: 'Claude (Anthropic) API Key', placeholder: 'sk-ant-api03-...' }
]

export default function ApiKeysPage() {
  const router = useRouter()
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [formValues, setFormValues] = useState<{ [key: string]: string }>({})
  const [showKeys, setShowKeys] = useState<{ [key: string]: boolean }>({})
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchApiKeys()
  }, [])

  const fetchApiKeys = async () => {
    try {
      const response = await fetch('/api/settings/api-keys')
      if (!response.ok) throw new Error('Failed to fetch API keys')

      const data = await response.json()
      setApiKeys(data.apiKeys || [])

      // Initialize form values
      const values: { [key: string]: string } = {}
      data.apiKeys?.forEach((key: ApiKey) => {
        values[key.service_name] = key.api_key
      })
      setFormValues(values)
    } catch (err) {
      console.error('Error fetching API keys:', err)
      setError('Failed to load API keys')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (serviceName: string) => {
    setSaving(serviceName)
    setError(null)

    try {
      const response = await fetch('/api/settings/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_name: serviceName,
          api_key: formValues[serviceName]
        })
      })

      if (!response.ok) throw new Error('Failed to save API key')

      await fetchApiKeys()
      alert('API key saved successfully!')
    } catch (err) {
      console.error('Error saving API key:', err)
      setError('Failed to save API key')
    } finally {
      setSaving(null)
    }
  }

  const handleDelete = async (serviceName: string) => {
    if (!confirm(`Are you sure you want to delete the ${serviceName} API key?`)) {
      return
    }

    try {
      const response = await fetch(`/api/settings/api-keys?service_name=${serviceName}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Failed to delete API key')

      await fetchApiKeys()
      setFormValues(prev => {
        const updated = { ...prev }
        delete updated[serviceName]
        return updated
      })
    } catch (err) {
      console.error('Error deleting API key:', err)
      setError('Failed to delete API key')
    }
  }

  const toggleShowKey = (serviceName: string) => {
    setShowKeys(prev => ({
      ...prev,
      [serviceName]: !prev[serviceName]
    }))
  }

  const getExistingKey = (serviceName: string): ApiKey | undefined => {
    return apiKeys.find(key => key.service_name === serviceName)
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center py-12">
          <div className="animate-spin h-12 w-12 border-4 border-[#00A3E1] border-t-transparent rounded-full mx-auto"></div>
          <p className="text-[#6b7a85] mt-4">Loading API keys...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/settings"
          className="inline-flex items-center gap-2 text-sm text-[#00A3E1] hover:text-[#0082b3] mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Settings
        </Link>
        <h1 className="text-3xl font-semibold text-[#333F48] flex items-center gap-3">
          <Key className="h-8 w-8" style={{ color: '#00A3E1' }} />
          API Keys Management
        </h1>
        <p className="text-[#6b7a85] mt-2">
          Configure API keys used by the application. These keys are securely stored and encrypted.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* API Keys List */}
      <div className="space-y-6">
        {SUPPORTED_SERVICES.map(service => {
          const existingKey = getExistingKey(service.name)
          const isVisible = showKeys[service.name]
          const isSaving = saving === service.name

          return (
            <div
              key={service.name}
              className="bg-white border border-gray-200 rounded-lg p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-[#333F48]">{service.label}</h3>
                  {existingKey && (
                    <p className="text-xs text-[#6b7a85] mt-1">
                      Last updated: {new Date(existingKey.updated_at).toLocaleString()}
                    </p>
                  )}
                </div>
                {existingKey && (
                  <button
                    onClick={() => handleDelete(service.name)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors"
                    title="Delete API key"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'nowrap' }}>
                <input
                  type={isVisible ? 'text' : 'password'}
                  value={formValues[service.name] || ''}
                  onChange={(e) => setFormValues(prev => ({
                    ...prev,
                    [service.name]: e.target.value
                  }))}
                  placeholder={service.placeholder}
                  className="border border-gray-300 focus:border-[#00A3E1] focus:ring-2 focus:ring-[#00A3E1]/20 outline-none font-mono"
                  style={{
                    paddingTop: '10px',
                    paddingBottom: '10px',
                    paddingLeft: '16px',
                    paddingRight: '16px',
                    fontSize: '16px',
                    borderRadius: '12px',
                    width: '500px',
                    flexShrink: 0
                  }}
                />

                <button
                  type="button"
                  onClick={() => toggleShowKey(service.name)}
                  className="py-1.5 px-4 text-xs font-medium transition-colors flex items-center gap-2"
                  style={{
                    border: '1px solid #00A3E1',
                    borderRadius: '20px',
                    backgroundColor: 'white',
                    color: '#00A3E1',
                    flexShrink: 0
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#00A3E1'
                    e.currentTarget.style.color = 'white'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'white'
                    e.currentTarget.style.color = '#00A3E1'
                  }}
                  title={isVisible ? 'Hide key' : 'Show key'}
                >
                  {isVisible ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>

                <button
                  onClick={() => handleSave(service.name)}
                  disabled={!formValues[service.name] || isSaving}
                  className="py-1.5 px-4 text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  style={{
                    border: '1px solid #00A3E1',
                    borderRadius: '20px',
                    backgroundColor: 'white',
                    color: '#00A3E1',
                    flexShrink: 0
                  }}
                  onMouseEnter={(e) => {
                    if (!isSaving && formValues[service.name]) {
                      e.currentTarget.style.backgroundColor = '#00A3E1'
                      e.currentTarget.style.color = 'white'
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'white'
                    e.currentTarget.style.color = '#00A3E1'
                  }}
                >
                  <Save className="h-4 w-4" />
                  {isSaving ? 'Saving...' : existingKey ? 'Update' : 'Save'}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Info Box */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-[#333F48] mb-2">Security Notes</h4>
        <ul className="text-sm text-[#6b7a85] space-y-1 list-disc list-inside">
          <li>API keys are encrypted and stored securely in the database</li>
          <li>Only you can access your API keys</li>
          <li>Keys are used for AI prompt generation and other automated processes</li>
          <li>Never share your API keys with others</li>
        </ul>
      </div>
    </div>
  )
}
