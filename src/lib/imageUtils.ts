/**
 * Utility functions for optimizing and scaling image URLs.
 */

/**
 * Automatically adjusts Unsplash and other dynamic image URLs to the ideal format, size, and quality.
 * This prevents loading excessively large images, saves bandwidth, and ensures fast loading times.
 * 
 * @param url The original image URL
 * @param options Optimization options like target width, aspect ratio, quality, and fit.
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

  const {
    width = 1200,
    quality = 80,
    fit = 'crop',
    format = 'auto'
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
