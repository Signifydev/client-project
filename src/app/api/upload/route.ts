import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary with environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Set maximum file size (5MB for images, 10MB for PDFs)
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_PDF_SIZE = 10 * 1024 * 1024; // 10MB

// Allowed file types
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_PDF_TYPE = 'application/pdf';

// Define interface for Cloudinary upload options
interface CloudinaryUploadOptions {
  folder: string;
  resource_type: 'image' | 'raw';
  timestamp: number;
  quality?: string;
  fetch_format?: string;
  format?: string;
  [key: string]: any; // Allow additional properties
}

// Define interface for Cloudinary response
interface CloudinaryResponse {
  secure_url: string;
  public_id: string;
  format: string;
  bytes: number;
  folder: string;
  version: string;
  signature: string;
  width?: number;
  height?: number;
  created_at: string;
  tags: string[];
  type: string;
  etag: string;
  placeholder: boolean;
  url: string;
  access_mode: string;
  original_filename: string;
  moderation: any[];
  access_control: any[];
  context: any;
}

// Define interface for API response
interface UploadResponse {
  success: boolean;
  url?: string;
  publicId?: string;
  format?: string;
  size?: number;
  originalFilename?: string;
  uploadedAt?: string;
  cloudinaryData?: Partial<CloudinaryResponse>;
  error?: string;
  stack?: string;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const folder = formData.get('folder') as string || 'loan_app';
    const uploadType = formData.get('type') as string; // 'image' or 'document'

    console.log('📤 Upload request received:', {
      fileName: file?.name,
      fileType: file?.type,
      fileSize: file?.size,
      folder,
      uploadType
    });

    // Validate file exists
    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file uploaded' },
        { status: 400 }
      );
    }

    // Validate file type
    if (uploadType === 'image' && !ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid image type. Only JPEG, JPG, PNG, WebP, and GIF are allowed.' 
        },
        { status: 400 }
      );
    }

    if (uploadType === 'document' && file.type !== ALLOWED_PDF_TYPE) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid document type. Only PDF files are allowed.' 
        },
        { status: 400 }
      );
    }

    // Validate file size
    const maxSize = uploadType === 'image' ? MAX_IMAGE_SIZE : MAX_PDF_SIZE;
    if (file.size > maxSize) {
      const maxMB = maxSize / (1024 * 1024);
      return NextResponse.json(
        { 
          success: false, 
          error: `File too large. Maximum size for ${uploadType} is ${maxMB}MB.` 
        },
        { status: 400 }
      );
    }

    // Convert file to base64 for Cloudinary
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64String = `data:${file.type};base64,${buffer.toString('base64')}`;

    // Determine resource type for Cloudinary
    const resourceType: 'image' | 'raw' = uploadType === 'image' ? 'image' : 'raw';

    // Upload options
    const uploadOptions: CloudinaryUploadOptions = {
      folder: folder,
      resource_type: resourceType,
      timestamp: Math.floor(Date.now() / 1000),
    };

    // Add optimization for images
    if (uploadType === 'image') {
      uploadOptions.quality = 'auto';
      uploadOptions.fetch_format = 'auto';
    }

    // For PDFs, set specific options
    if (uploadType === 'document') {
      uploadOptions.format = 'pdf';
    }

    console.log('☁️ Uploading to Cloudinary with options:', uploadOptions);

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(base64String, uploadOptions) as CloudinaryResponse;

    console.log('✅ Upload successful:', {
      url: result.secure_url,
      publicId: result.public_id,
      format: result.format,
      size: result.bytes,
      folder: result.folder
    });

    // Return success response
    const response: UploadResponse = {
      success: true,
      url: result.secure_url,
      publicId: result.public_id,
      format: result.format,
      size: result.bytes,
      originalFilename: file.name,
      uploadedAt: new Date().toISOString(),
      cloudinaryData: {
        version: result.version,
        signature: result.signature,
        width: result.width,
        height: result.height,
        created_at: result.created_at,
        tags: result.tags,
        bytes: result.bytes,
        type: result.type,
        etag: result.etag,
        placeholder: result.placeholder,
        url: result.url,
        secure_url: result.secure_url,
        access_mode: result.access_mode,
        original_filename: result.original_filename,
        moderation: result.moderation,
        access_control: result.access_control,
        context: result.context
      }
    };

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('❌ Upload error:', error);
    
    // Handle Cloudinary specific errors
    if (error.message.includes('Invalid Cloudinary credentials')) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Cloudinary configuration error. Check environment variables.' 
        },
        { status: 500 }
      );
    }
    
    if (error.message.includes('File size too large')) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'File size exceeds Cloudinary limits.' 
        },
        { status: 400 }
      );
    }

    const errorResponse: UploadResponse = {
      success: false,
      error: error.message || 'Upload failed',
    };

    // Only include stack trace in development
    if (process.env.NODE_ENV === 'development') {
      errorResponse.stack = error.stack;
    }

    return NextResponse.json(
      errorResponse,
      { status: 500 }
    );
  }
}

// Add OPTIONS method for CORS (important for Vercel)
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

// Define interface for GET response
interface GetResponse {
  name: string;
  status: string;
  endpoints: {
    POST: {
      description: string;
      requiredFields: string[];
      optionalFields: string[];
      fileTypes: {
        image: string[];
        document: string[];
      };
      maxSizes: {
        image: string;
        document: string;
      };
    };
  };
  environment: string;
  cloudinaryConfigured: boolean;
  timestamp: string;
}

// Add GET method for testing
export async function GET() {
  // Return API information (useful for testing)
  const response: GetResponse = {
    name: 'Cloudinary Upload API',
    status: 'active',
    endpoints: {
      POST: {
        description: 'Upload files to Cloudinary',
        requiredFields: ['file', 'type'],
        optionalFields: ['folder'],
        fileTypes: {
          image: ALLOWED_IMAGE_TYPES,
          document: [ALLOWED_PDF_TYPE]
        },
        maxSizes: {
          image: `${MAX_IMAGE_SIZE / (1024 * 1024)}MB`,
          document: `${MAX_PDF_SIZE / (1024 * 1024)}MB`
        }
      }
    },
    environment: process.env.NODE_ENV || 'development',
    cloudinaryConfigured: !!process.env.CLOUDINARY_CLOUD_NAME,
    timestamp: new Date().toISOString()
  };
  
  return NextResponse.json(response);
}