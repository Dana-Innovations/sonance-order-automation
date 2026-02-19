import { NextRequest, NextResponse } from 'next/server'
import { Client, ResponseType } from '@microsoft/microsoft-graph-client'
import { TokenCredentialAuthenticationProvider } from '@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials'
import { ClientSecretCredential } from '@azure/identity'
import { createClient } from '@/lib/supabase/server'

/**
 * Extract the site-relative path from a SharePoint URL
 * Input: https://danainnovations.sharepoint.com/sites/SonanceOrderManagementAutomation/Shared%20Documents/Customer/file.pdf
 * Output: /Shared Documents/Customer/file.pdf
 */
function extractSharePointPath(sharePointUrl: string): string | null {
  try {
    const url = new URL(sharePointUrl)
    const pathname = decodeURIComponent(url.pathname)
    
    // Find the path after /sites/SiteName/
    // Pattern: /sites/SiteName/rest/of/path
    const siteMatch = pathname.match(/^\/sites\/[^/]+\/(.+)$/)
    
    if (siteMatch && siteMatch[1]) {
      // Return the path starting with /
      return '/' + siteMatch[1]
    }
    
    return null
  } catch {
    return null
  }
}

/**
 * Generate multiple path variations to try
 * SharePoint URLs include "Shared Documents" but Graph API /drive/root: 
 * is already the document library root, so we need to try both with and without it
 */
function generatePathVariations(originalPath: string): string[] {
  const paths: string[] = []
  
  // Try without "Shared Documents" prefix first (most common case)
  // Since /drive/root: already refers to the default document library
  if (originalPath.startsWith('/Shared Documents/')) {
    paths.push(originalPath.replace('/Shared Documents/', '/'))
  }
  
  // Try without "Documents" prefix
  if (originalPath.startsWith('/Documents/')) {
    paths.push(originalPath.replace('/Documents/', '/'))
  }
  
  // Also try the original path as-is
  paths.push(originalPath)
  
  // Remove duplicates
  return [...new Set(paths)]
}

/**
 * Encode a file path for use in Graph API
 */
function encodePathForGraphAPI(filePath: string): string {
  return filePath
    .split('/')
    .map(segment => encodeURIComponent(segment))
    .join('/')
}

/**
 * Extract filename from a path
 */
function extractFilename(path: string): string {
  const parts = path.split('/')
  return parts[parts.length - 1] || 'document.pdf'
}

export async function GET(request: NextRequest) {
  // Verify user is authenticated before accessing SharePoint
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const searchParams = request.nextUrl.searchParams
  const sharePointUrl = searchParams.get('url')

  if (!sharePointUrl) {
    return NextResponse.json(
      { error: 'Missing url parameter' },
      { status: 400 }
    )
  }

  // Extract the site-relative path from the SharePoint URL
  const originalFilePath = extractSharePointPath(sharePointUrl)
  
  if (!originalFilePath) {
    return NextResponse.json(
      { error: 'Invalid SharePoint URL format', url: sharePointUrl },
      { status: 400 }
    )
  }

  const filename = extractFilename(originalFilePath)

  // Validate required environment variables
  if (!process.env.SHAREPOINT_TENANT_ID || 
      !process.env.SHAREPOINT_CLIENT_ID || 
      !process.env.SHAREPOINT_CLIENT_SECRET ||
      !process.env.SHAREPOINT_SITE_ID) {
    console.error('Missing SharePoint environment variables')
    return NextResponse.json(
      { error: 'SharePoint configuration missing' },
      { status: 500 }
    )
  }

  try {
    // Initialize Azure credentials
    const credential = new ClientSecretCredential(
      process.env.SHAREPOINT_TENANT_ID,
      process.env.SHAREPOINT_CLIENT_ID,
      process.env.SHAREPOINT_CLIENT_SECRET
    )

    const authProvider = new TokenCredentialAuthenticationProvider(credential, {
      scopes: ['https://graph.microsoft.com/.default'],
    })

    const client = Client.initWithMiddleware({ authProvider })

    // Generate path variations to try
    const pathVariations = generatePathVariations(originalFilePath)
    
    console.log('SharePoint PDF fetch - attempting retrieval')

    let lastError: any = null
    
    // Try each path variation until one succeeds
    for (const filePath of pathVariations) {
      try {
        const encodedPath = encodePathForGraphAPI(filePath)
        const apiPath = `/sites/${process.env.SHAREPOINT_SITE_ID}/drive/root:${encodedPath}:/content`
        
        console.log('Trying Graph API path variation')

        const response = await client
          .api(apiPath)
          .responseType(ResponseType.ARRAYBUFFER)
          .get()

        // Success! Convert to Buffer and return
        const buffer = Buffer.from(response)
        
        console.log('Successfully fetched PDF')

        return new NextResponse(buffer, {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `inline; filename="${filename}"`,
            'Cache-Control': 'private, max-age=3600', // Cache for 1 hour
          },
        })
      } catch (error: any) {
        console.log(`Path variation failed with status ${error.statusCode}`)
        lastError = error
        
        // If it's not a 404, don't try other paths (it's likely a permission issue)
        if (error.statusCode !== 404) {
          break
        }
        // Continue to try next path variation for 404 errors
      }
    }

    // All paths failed, return appropriate error
    console.error('SharePoint PDF fetch error - all paths failed:', {
      code: lastError?.code,
      statusCode: lastError?.statusCode,
    })

    if (lastError?.statusCode === 404) {
      return NextResponse.json(
        { error: 'PDF file not found in SharePoint' },
        { status: 404 }
      )
    }

    if (lastError?.statusCode === 401 || lastError?.statusCode === 403) {
      return NextResponse.json(
        { error: 'Not authorized to access SharePoint. Check app permissions.' },
        { status: 403 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to fetch PDF from SharePoint' },
      { status: 500 }
    )
  } catch (error: any) {
    console.error('SharePoint PDF fetch error:', {
      code: error.code,
      statusCode: error.statusCode,
    })

    return NextResponse.json(
      { error: 'Failed to fetch PDF from SharePoint' },
      { status: 500 }
    )
  }
}
