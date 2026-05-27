/**
 * r2.ts
 * Cloudflare R2 Storage client สำหรับ PDF Report
 */

export interface R2UploadResult {
  url: string
  key: string
}

/**
 * สร้าง Presigned URL สำหรับ Upload ไฟล์ขึ้น R2 โดยตรง
 * เรียกจาก Route Handler เท่านั้น
 */
export async function getR2PresignedUrl(
  key: string,
  contentType: string = 'application/pdf'
): Promise<string> {
  const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3')
  const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner')

  const client = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  })

  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: key,
    ContentType: contentType,
  })

  return getSignedUrl(client, command, { expiresIn: 300 }) // 5 minutes
}

/**
 * สร้าง Public URL ของ R2 Object
 */
export function getR2PublicUrl(key: string): string {
  const baseUrl = process.env.R2_PUBLIC_URL
  if (!baseUrl) throw new Error('R2_PUBLIC_URL is not configured')
  return `${baseUrl}/${key}`
}

/**
 * สร้าง key สำหรับ PDF Report ตาม User
 */
export function buildReportKey(userId: string, reportId: string): string {
  const date = new Date().toISOString().split('T')[0]
  return `reports/${userId}/${date}/${reportId}.pdf`
}
