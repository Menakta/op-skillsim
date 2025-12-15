/**
 * LTI Demo Parameters Generator
 *
 * This endpoint generates valid LTI launch parameters with proper OAuth signatures
 * for testing purposes. In production, this would be done by the LMS (iQualify).
 */

import { NextRequest, NextResponse } from 'next/server'
import { generateTestLtiParams } from '@/app/lib/lti'
import { logger } from '@/app/lib/logger'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      consumerKey,
      userId,
      userName,
      userEmail,
      role,
      contextId,
      contextTitle,
      launchUrl
    } = body

    logger.info({ consumerKey, userId, role }, 'Generating LTI demo params')

    // Generate valid LTI parameters with OAuth signature
    const params = generateTestLtiParams(launchUrl, consumerKey, {
      user_id: userId,
      lis_person_name_full: userName,
      lis_person_contact_email_primary: userEmail,
      roles: role,
      context_id: contextId,
      context_title: contextTitle,
      resource_link_id: `demo-resource-${Date.now()}`,
      resource_link_title: 'OP SkillSim Training',
      tool_consumer_instance_guid: 'lti-demo.opskillsim.local',
      tool_consumer_info_product_family_code: 'lti-demo'
    })

    return NextResponse.json({ params })
  } catch (error) {
    logger.error({ error }, 'Failed to generate LTI demo params')

    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
