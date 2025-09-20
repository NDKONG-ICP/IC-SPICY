// Enhanced social media sharing utilities for IC SPICY

const SPICY_BASE_URL = 'https://vmcfj-haaaa-aaaao-a4o3q-cai.icp0.io';
const SPICY_BRAND_MESSAGE = 'Join me on my IC SPICY adventures! 🌶️ Growing peppers on the blockchain with real rewards!';

// Generate Open Graph meta tags for social media previews
export const generateOpenGraphMeta = (post) => {
  const { id, title, content, author_name, timestamp, image_url, photo } = post;
  
  // For social media previews, we need a publicly accessible image URL
  // Since blob URLs are only accessible in the current browser session,
  // we'll use a fallback image for now. In a production environment,
  // you'd want to store images on a CDN or public canister.
  let imageUrl = image_url;
  
  // If we have a photo, we could potentially create a data URL for social sharing
  // but this has size limitations. For now, use a fallback image.
  if (!imageUrl) {
    imageUrl = `${SPICY_BASE_URL}/og-image-default.jpg`; // Fallback image
  }
  
  // Note: For proper social media previews with custom images,
  // you would need to implement image hosting on a public canister
  // or use a service like Cloudinary, AWS S3, etc.
  
  // Generate description from content
  const description = content && content.length > 160 
    ? content.substring(0, 160) + '...' 
    : content || 'Join the IC SPICY community and start your own blockchain pepper growing adventure!';
  
  // Safely convert timestamp to ISO string
  let publishedTime;
  try {
    if (timestamp) {
      // Handle BigInt timestamps from canister
      let timeValue = timestamp;
      if (typeof timestamp === 'bigint') {
        timeValue = Number(timestamp);
      } else if (typeof timestamp === 'string') {
        timeValue = parseInt(timestamp, 10);
      }
      
      // Validate the timestamp is reasonable (not too old or future)
      const now = Date.now();
      const minTime = new Date('2020-01-01').getTime();
      const maxTime = now + (365 * 24 * 60 * 60 * 1000); // 1 year in future
      
      if (timeValue >= minTime && timeValue <= maxTime) {
        publishedTime = new Date(timeValue).toISOString();
      } else {
        publishedTime = new Date().toISOString(); // Use current time as fallback
      }
    } else {
      publishedTime = new Date().toISOString(); // Use current time as fallback
    }
  } catch (error) {
    console.error('Error converting timestamp to ISO string:', error);
    publishedTime = new Date().toISOString(); // Use current time as fallback
  }
  
  const meta = {
    'og:title': `IC SPICY: ${title}`,
    'og:description': description,
    'og:type': 'article',
    'og:url': `${SPICY_BASE_URL}/blog/${id}`,
    'og:site_name': 'IC SPICY',
    'og:image': imageUrl || `${SPICY_BASE_URL}/og-image-default.jpg`,
    'og:image:width': '1200',
    'og:image:height': '630',
    'og:image:alt': title,
    'twitter:card': 'summary_large_image',
    'twitter:title': `IC SPICY: ${title}`,
    'twitter:description': description,
    'twitter:image': imageUrl || `${SPICY_BASE_URL}/og-image-default.jpg`,
    'twitter:site': '@ICSpicy',
    'twitter:creator': '@ICSpicy',
    'article:published_time': publishedTime,
    'article:author': author_name || 'IC SPICY Community',
    'article:section': 'Pepper Growing',
    'article:tag': ['IC SPICY', 'Pepper Growing', 'Blockchain', 'Web3', 'DeFi']
  };
  
  return meta;
};

// Generate a data URL for small images that can be used in social media previews
// Note: This has size limitations and is not ideal for production
export const generateImageDataUrl = (photoData, maxSize = 100000) => { // 100KB limit
  if (!photoData || photoData.length === 0 || photoData.length > maxSize) {
    return null;
  }
  
  try {
    const blob = new Blob([photoData], { type: 'image/jpeg' });
    return URL.createObjectURL(blob);
  } catch (error) {
    console.error('Error creating image data URL:', error);
    return null;
  }
};

// Generate a proper social media preview URL
export const generateSocialPreviewUrl = (postId, title) => {
  const baseUrl = SPICY_BASE_URL;
  const encodedTitle = encodeURIComponent(title);
  return `${baseUrl}/blog/${postId}?title=${encodedTitle}&utm_source=social&utm_medium=share&utm_campaign=blog_post`;
};

// Generate blog post share URL with tracking
export const generateBlogPostUrl = (postId) => {
  // Use the IC canister URL with proper routing and post ID in path for better SEO
  return `${SPICY_BASE_URL}/blog/${postId}?utm_source=social&utm_medium=share&utm_campaign=blog_post`;
};

// Generate URL for sharing on X (Twitter)
export const generateXShareUrl = (postTitle, postContent, postId) => {
  try {
    const postUrl = generateBlogPostUrl(postId);
    const hashtags = ['ICSpicy', 'PepperGrowing', 'Web3', 'Blockchain', 'DeFi', 'PlayToEarn'];
    
    let text = `🌶️ ${SPICY_BRAND_MESSAGE}\n\n"${postTitle}"\n\nCheck out my latest grow experience!`;
    
    if (text.length > 240) {
      text = `🌶️ ${SPICY_BRAND_MESSAGE}\n\n"${postTitle.substring(0, 80)}..."\n\nCheck it out!`;
    }
    
    const params = new URLSearchParams({
      text: text,
      url: postUrl,
      hashtags: hashtags.join(',')
    });
    
    return `https://twitter.com/intent/tweet?${params.toString()}`;
  } catch (error) {
    console.log('Twitter sharing URL generation failed, using fallback');
    return `https://twitter.com/intent/tweet?text=${encodeURIComponent('🌶️ Join me on my IC SPICY adventures!')}`;
  }
};

// Generate URL for sharing on Facebook
export const generateFacebookShareUrl = (postId) => {
  const postUrl = generateBlogPostUrl(postId);
  const params = new URLSearchParams({
    u: postUrl,
    quote: SPICY_BRAND_MESSAGE
  });
  return `https://www.facebook.com/sharer/sharer.php?${params.toString()}`;
};

// Generate URL for sharing on LinkedIn
export const generateLinkedInShareUrl = (postTitle, postContent, postId) => {
  const postUrl = generateBlogPostUrl(postId);
  const summary = `${SPICY_BRAND_MESSAGE}\n\n${postContent.substring(0, 200)}...`;
  
  const params = new URLSearchParams({
    url: postUrl,
    title: `IC SPICY: ${postTitle}`,
    summary: summary
  });
  return `https://www.linkedin.com/sharing/share-offsite/?${params.toString()}`;
};

// Generate URL for sharing via WhatsApp
export const generateWhatsAppShareUrl = (postTitle, postId) => {
  const postUrl = generateBlogPostUrl(postId);
  const message = `🌶️ ${SPICY_BRAND_MESSAGE}\n\n"${postTitle}"\n\n${postUrl}`;
  
  const params = new URLSearchParams({
    text: message
  });
  return `https://wa.me/?${params.toString()}`;
};

// Generate URL for sharing via Telegram
export const generateTelegramShareUrl = (postTitle, postId) => {
  const postUrl = generateBlogPostUrl(postId);
  const message = `🌶️ ${SPICY_BRAND_MESSAGE}\n\n"${postTitle}"\n\n${postUrl}`;
  
  const params = new URLSearchParams({
    url: postUrl,
    text: message
  });
  return `https://t.me/share/url?${params.toString()}`;
};

// Generate URL for sharing via SMS
export const generateSMSShareUrl = (postTitle, postId) => {
  const postUrl = generateBlogPostUrl(postId);
  const message = `🌶️ Check out my IC SPICY grow experience: "${postTitle}" ${postUrl}`;
  
  const params = new URLSearchParams({
    body: message
  });
  return `sms:?${params.toString()}`;
};

// Generate mailto link for email sharing
export const generateEmailShareUrl = (postTitle, postContent, postId) => {
  const postUrl = generateBlogPostUrl(postId);
  const subject = `🌶️ Check out my IC SPICY grow experience: ${postTitle}`;
  const body = `${SPICY_BRAND_MESSAGE}\n\nI wanted to share my latest pepper growing experience with you!\n\n"${postTitle}"\n\n${postContent.substring(0, 300)}...\n\nRead the full post here: ${postUrl}\n\nJoin the IC SPICY community and start your own blockchain pepper growing adventure!\n\n🌶️ Grow • Earn • Share 🌶️`;
  
  const params = new URLSearchParams({
    subject: subject,
    body: body
  });
  return `mailto:?${params.toString()}`;
};

// Enhanced error handling for social media services
export const handleSocialMediaError = (platform, error) => {
  console.log(`${platform} sharing error:`, error);
  
  // Return user-friendly error messages
  const errorMessages = {
    'twitter': 'Twitter sharing temporarily unavailable. Try copying the link instead.',
    'facebook': 'Facebook sharing temporarily unavailable. Try copying the link instead.',
    'linkedin': 'LinkedIn sharing temporarily unavailable. Try copying the link instead.',
    'whatsapp': 'WhatsApp sharing temporarily unavailable. Try copying the link instead.',
    'telegram': 'Telegram sharing temporarily unavailable. Try copying the link instead.',
    'sms': 'SMS sharing temporarily unavailable. Try copying the link instead.',
    'email': 'Email sharing temporarily unavailable. Try copying the link instead.',
    'default': 'Sharing temporarily unavailable. Try copying the link instead.'
  };
  
  return errorMessages[platform] || errorMessages.default;
};

// Copy to clipboard functionality
export const copyToClipboard = async (postTitle, postContent, postId) => {
  const postUrl = generateBlogPostUrl(postId);
  const shareText = `🌶️ ${SPICY_BRAND_MESSAGE}\n\n"${postTitle}"\n\n${postContent.substring(0, 200)}...\n\n${postUrl}`;
  
  try {
    await navigator.clipboard.writeText(shareText);
    return { success: true, message: 'Post link copied to clipboard!' };
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return { success: false, message: 'Failed to copy to clipboard. Please try again.' };
  }
};

// Native Web Share API (when available)
export const webShare = async (postTitle, postContent, postId) => {
  if (navigator.share) {
    const postUrl = generateBlogPostUrl(postId);
    const shareData = {
      title: `🌶️ IC SPICY: ${postTitle}`,
      text: `${SPICY_BRAND_MESSAGE}\n\n${postContent.substring(0, 100)}...`,
      url: postUrl
    };
    
    try {
      await navigator.share(shareData);
      return { success: true, message: 'Shared successfully!' };
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Error sharing:', error);
        return { success: false, message: 'Failed to share. Please try again.' };
      }
      return { success: false, message: 'Share cancelled.' };
    }
  }
  return { success: false, message: 'Web Share API not supported.' };
};
