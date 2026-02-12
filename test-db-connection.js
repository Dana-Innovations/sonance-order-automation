const { Client } = require('pg')

const connectionString = 'postgresql://postgres:NFQWjiVf5fUa0imI@db.xgftwwircksmhevzkrhn.supabase.co:5432/postgres'

async function testConnection() {
  console.log('Testing database connection...')
  console.log('Connection string:', connectionString.replace(/:[^:@]+@/, ':****@'))

  const client = new Client({
    connectionString,
    ssl: {
      rejectUnauthorized: false
    },
    // Force IPv4
    host: 'db.xgftwwircksmhevzkrhn.supabase.co',
    connectionTimeoutMillis: 10000
  })

  try {
    console.log('\n1. Attempting to connect...')
    await client.connect()
    console.log('✅ Connected successfully!\n')

    console.log('2. Testing query...')
    const result = await client.query('SELECT version()')
    console.log('✅ Query successful!')
    console.log('PostgreSQL version:', result.rows[0].version.split('\n')[0])

    console.log('\n3. Checking if units_of_measure table exists...')
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'units_of_measure'
      )
    `)

    if (tableCheck.rows[0].exists) {
      console.log('⚠️  Table already exists!')
    } else {
      console.log('✅ Table does not exist yet - ready to create')
    }

    await client.end()
    console.log('\n✅ All tests passed! Database connection is working.\n')

  } catch (error) {
    console.error('\n❌ Connection failed!')
    console.error('Error:', error.message)
    console.error('\nFull error:')
    console.error(error)

    if (client) {
      await client.end().catch(() => {})
    }
    process.exit(1)
  }
}

testConnection()
