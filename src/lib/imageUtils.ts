import { storage } from './firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

/**
 * Utility functions for optimizing, compressing, and scaling image URLs.
 */

/**
 * Compresses an image File or Base64 string and converts it to a high-quality WebP Blob on the client side.
 * This saves network bandwidth, improves performance, and reduces storage costs.
 */
export async function compressAndConvertToWebP(
  fileOrBase64: File | string,
  maxWidth = 1400,
  quality = 0.82
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      // Calculate optimized responsive dimensions keeping aspect ratio
      let width = img.width;
      let height = img.height;
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Canvas context could not be created'));
        return;
      }

      // Draw image to canvas
      ctx.drawImage(img, 0, 0, width, height);

      // Convert canvas content to WebP blob
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to convert image to WebP blob'));
          }
        },
        'image/webp',
        quality
      );
    };

    img.onerror = () => {
      reject(new Error('Failed to load image for compression'));
    };

    if (typeof fileOrBase64 === 'string') {
      img.src = fileOrBase64;
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (typeof e.target?.result === 'string') {
          img.src = e.target.result;
        } else {
          reject(new Error('FileReader failed to read file'));
        }
      };
      reader.onerror = () => reject(new Error('FileReader error'));
      reader.readAsDataURL(fileOrBase64);
    }
  });
}

/**
 * Clean and convert a string to a safe, SEO-friendly, and clean filename slug.
 */
export function slugifyString(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // remove non-word characters except space and dashes
    .replace(/[\s_-]+/g, '-') // convert spaces, underscores, and multiple dashes to a single dash
    .replace(/^-+|-+$/g, '');  // trim leading/trailing dashes
}

/**
 * Compresses an image to WebP, uploads it to Firebase Storage, and returns the download URL.
 * Includes a self-healing fallback that returns a compressed Base64 WebP URL if Firebase Storage is blocked.
 * Automatically names image files based on custom description context or original file names.
 */
export async function uploadOptimizedImageToFirebase(
  fileOrBase64: File | string,
  folder = 'articles',
  customName?: string
): Promise<string> {
  try {
    // 1. Client-side compress and convert to WebP
    const webpBlob = await compressAndConvertToWebP(fileOrBase64);
    
    // 2. Determine an SEO-friendly, descriptive base name
    let baseName = '';
    
    if (customName && customName.trim().length > 0) {
      baseName = slugifyString(customName.trim());
    } else if (fileOrBase64 instanceof File) {
      // Extract original file name without extension and clean it
      const originalName = fileOrBase64.name;
      const lastDotIndex = originalName.lastIndexOf('.');
      const nameWithoutExtension = lastDotIndex !== -1 ? originalName.substring(0, lastDotIndex) : originalName;
      baseName = slugifyString(nameWithoutExtension);
    }
    
    // Fallback if no valid base name was resolved or if it is too generic
    if (!baseName || baseName === 'image' || baseName === 'file' || baseName === 'blob') {
      const folderPrefix = folder === 'articles' ? 'pulsewire-news'
                         : folder === 'ads' ? 'pulsewire-ad'
                         : folder === 'authors' ? 'pulsewire-avatar'
                         : 'pulsewire-media';
      baseName = `${folderPrefix}-${Math.random().toString(36).substring(2, 6)}`;
    }

    // Limit baseName length to keep paths clean and avoid extremely long storage keys
    if (baseName.length > 80) {
      baseName = baseName.substring(0, 80).replace(/-+$/, '');
    }
    
    // 3. Append a short unique random suffix to completely prevent collisions while preserving SEO indexing
    const uniqueSuffix = Math.random().toString(36).substring(2, 7);
    const filename = `${baseName}_${uniqueSuffix}.webp`;
    const storageRef = ref(storage, `${folder}/${filename}`);
    
    // 4. Upload with metadata (Brotli/Gzip cache control is managed by Firebase CDN, but we specify browser cache control)
    const metadata = {
      contentType: 'image/webp',
      cacheControl: 'public,max-age=31536000',
    };
    
    const snapshot = await uploadBytes(storageRef, webpBlob, metadata);
    const downloadUrl = await getDownloadURL(snapshot.ref);
    return downloadUrl;
  } catch (error) {
    console.warn('[Storage Fallback] Firebase Storage upload failed or was blocked. Falling back to compressed client-side WebP Base64 URL.', error);
    try {
      // Self-healing fallback: Generate a highly compressed Base64 WebP URL directly so the app never fails!
      const fallbackBlob = await compressAndConvertToWebP(fileOrBase64, 800, 0.65);
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(fallbackBlob);
      });
    } catch (fallbackError) {
      console.error('Fallback compression failed:', fallbackError);
      // Absolute fallback: return the original string if it is base64 or a url
      return typeof fileOrBase64 === 'string' ? fileOrBase64 : '';
    }
  }
}

/**
 * Generates a super-lightweight, 16px wide blurred base64 placeholder for progressive image loading.
 */
export async function generateBlurPlaceholder(base64OrUrl: string): Promise<string> {
  try {
    const blob = await compressAndConvertToWebP(base64OrUrl, 16, 0.2);
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  } catch {
    return 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%"><rect width="100%" height="100%" fill="%23ecefef"/></svg>';
  }
}

/**
 * Generates a standard srcset structure for responsive images.
 * Since Unsplash handles sizes dynamically, we can use this helper for Unsplash URLs.
 */
export function generateSrcSet(
  url: string,
  widths = [480, 768, 1200, 1600]
): { src: string; srcSet: string; sizes: string } {
  const optimizedUrl = getOptimizedImageUrl(url, { width: 1200 });
  if (!url || !url.includes('unsplash.com')) {
    return { src: optimizedUrl, srcSet: '', sizes: '' };
  }
  
  const srcSet = widths
    .map((w) => `${getOptimizedImageUrl(url, { width: w })} ${w}w`)
    .join(', ');

  return {
    src: optimizedUrl,
    srcSet,
    sizes: '(max-width: 640px) 480px, (max-width: 1024px) 768px, 1200px',
  };
}

/**
 * Automatically adjusts Unsplash and other dynamic image URLs to the ideal format, size, and quality.
 * This prevents loading excessively large images, saves bandwidth, and ensures fast loading times.
 */
export function getOptimizedImageUrl(
  url: string,
  options: {
    width?: number;
    height?: number;
    quality?: number;
    fit?: 'crop' | 'max' | 'min' | 'scale';
    format?: 'auto' | 'webp' | 'jpg' | 'png';
  } = {}
): string {
  if (!url) return '';
  if (url.startsWith('data:image')) return url; // Don't try to format base64 URLs

  const {
    width = 1200,
    quality = 80,
    fit = 'crop',
    format = 'webp' // Use webp as default optimized format
  } = options;

  // Handle Unsplash URLs
  if (url.includes('unsplash.com')) {
    try {
      const urlObj = new URL(url);
      
      // Update or set common Unsplash parameters
      urlObj.searchParams.set('auto', format);
      urlObj.searchParams.set('fit', fit);
      urlObj.searchParams.set('w', width.toString());
      urlObj.searchParams.set('q', quality.toString());
      
      if (options.height) {
        urlObj.searchParams.set('h', options.height.toString());
      } else {
        urlObj.searchParams.delete('h'); // clean up explicit height if not requested
      }
      
      return urlObj.toString();
    } catch (e) {
      // Fallback if URL constructor fails
      if (url.includes('?')) {
        const baseUrl = url.split('?')[0];
        let params = `auto=${format}&fit=${fit}&w=${width}&q=${quality}`;
        if (options.height) params += `&h=${options.height}`;
        return `${baseUrl}?${params}`;
      } else {
        let params = `?auto=${format}&fit=${fit}&w=${width}&q=${quality}`;
        if (options.height) params += `&h=${options.height}`;
        return `${url}${params}`;
      }
    }
  }

  // Handle other known image networks or return original as fallback
  return url;
}

/**
 * Determines whether a URL is a valid image URL.
 */
export function isValidImageUrl(url: string): boolean {
  if (!url) return false;
  return (
    url.startsWith('http://') || 
    url.startsWith('https://') || 
    url.startsWith('/') || 
    url.startsWith('data:image/')
  );
}
