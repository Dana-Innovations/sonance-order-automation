const fs = require('fs')
const path = require('path')

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '.env') })

const n8nUrl = process.env.N8N_URL
const n8nApiKey = process.env.N8N_API_KEY

if (!n8nUrl || !n8nApiKey) {
  console.error('Missing n8n credentials in .env file')
  process.exit(1)
}

async function updateWorkflow() {
  try {
    // Read the workflow file
    const workflowPath = path.join(__dirname, 'workflow-backup.json')
    const workflowData = JSON.parse(fs.readFileSync(workflowPath, 'utf8'))

    const workflowId = workflowData.id
    console.log(`Updating workflow: ${workflowData.name} (ID: ${workflowId})`)

    // Prepare the API request
    const apiUrl = `${n8nUrl}/api/v1/workflows/${workflowId}`

    console.log(`API URL: ${apiUrl}`)
    console.log('Sending update request...')

    // Filter settings to only include standard properties
    const settings = {
      executionOrder: workflowData.settings?.executionOrder || 'v1'
    }

    const response = await fetch(apiUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-N8N-API-KEY': n8nApiKey
      },
      body: JSON.stringify({
        name: workflowData.name,
        nodes: workflowData.nodes,
        connections: workflowData.connections,
        settings: settings
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`API request failed: ${response.status} ${response.statusText}\n${errorText}`)
    }

    const result = await response.json()
    console.log('✓ Workflow updated successfully!')
    console.log('Updated workflow:', result.name)
    console.log('Workflow ID:', result.id)
    console.log('\nChanges applied:')
    console.log('  - Added ps_supplier_id to AI Agent structured output schema')
    console.log('  - Added ps_supplier_id documentation to AI Agent system message')
    console.log('  - Added ps_supplier_id field mapping to Insert Order Line node')

  } catch (error) {
    console.error('Error updating workflow:', error.message)
    process.exit(1)
  }
}

updateWorkflow()
