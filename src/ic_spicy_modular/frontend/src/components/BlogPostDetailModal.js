import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import BlogPostShareModal from './BlogPostShareModal';
import { generateOpenGraphMeta } from '../utils/socialMedia';

const BlogPostDetailModal = ({ post, isOpen, onClose, onLike, onTip, isConnected }) => {
  const [showShareModal, setShowShareModal] = useState(false);
  const [liked, setLiked] = useState(false);

  // Update meta tags for social media previews when modal opens
  useEffect(() => {
    if (isOpen && post) {
      try {
        const meta = generateOpenGraphMeta(post);
        
        // Update existing meta tags or create new ones
        Object.entries(meta).forEach(([property, content]) => {
          try {
            let metaTag = document.querySelector(`meta[property="${property}"]`) || 
                         document.querySelector(`meta[name="${property}"]`);
            
            if (!metaTag) {
              metaTag = document.createElement('meta');
              if (property.startsWith('og:')) {
                metaTag.setAttribute('property', property);
              } else if (property.startsWith('twitter:')) {
                metaTag.setAttribute('name', property);
              } else if (property.startsWith('article:')) {
                metaTag.setAttribute('property', property);
              }
              document.head.appendChild(metaTag);
            }
            
            metaTag.setAttribute('content', content);
          } catch (metaError) {
            console.error(`Error updating meta tag ${property}:`, metaError);
          }
        });

        // Update page title
        try {
          document.title = `IC SPICY: ${post.title}`;
        } catch (titleError) {
          console.error('Error updating page title:', titleError);
        }
        
        // Update canonical URL
        try {
          let canonicalLink = document.querySelector('link[rel="canonical"]');
          if (!canonicalLink) {
            canonicalLink = document.createElement('link');
            canonicalLink.setAttribute('rel', 'canonical');
            document.head.appendChild(canonicalLink);
          }
          canonicalLink.setAttribute('href', `https://vmcfj-haaaa-aaaao-a4o3q-cai.icp0.io/blog/${post.id}`);
        } catch (canonicalError) {
          console.error('Error updating canonical URL:', canonicalError);
        }
      } catch (error) {
        console.error('Error updating meta tags:', error);
        // Fallback: just update the title
        try {
          document.title = `IC SPICY: ${post.title}`;
        } catch (fallbackError) {
          console.error('Fallback title update failed:', fallbackError);
        }
      }
    }
  }, [isOpen, post]);

  if (!isOpen || !post) return null;

  const handleLike = () => {
    if (!isConnected) {
      // Show error or prompt to connect wallet
      return;
    }
    setLiked(!liked);
    onLike(post.id);
  };

  const handleTip = () => {
    if (!isConnected) {
      // Show error or prompt to connect wallet
      return;
    }
    onTip(post);
  };

  const handleShare = () => {
    setShowShareModal(true);
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const createImageUrlFromPhotoData = (photoData) => {
    try {
      if (!photoData || photoData.length === 0) {
        return null;
      }
      const blob = new Blob([photoData], { type: 'image/jpeg' });
      const imageUrl = URL.createObjectURL(blob);
      return imageUrl;
    } catch (error) {
      console.error('Error creating image URL from photo data:', error);
      return null;
    }
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={onClose}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-gray-900/95 backdrop-blur-xl rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="sticky top-0 bg-gray-900/95 backdrop-blur-xl border-b border-gray-700 p-6 rounded-t-2xl">
                <div className="flex items-center justify-between">
                  <h1 className="text-3xl font-bold text-yellow-100">{post.title}</h1>
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-white transition-colors p-2 rounded-full hover:bg-gray-800"
                  >
                    ✕
                  </button>
                </div>
                
                {/* Post Meta */}
                <div className="flex items-center gap-6 text-gray-400 mt-4 text-sm">
                  <span className="flex items-center gap-2">
                    <span className="w-8 h-8 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full flex items-center justify-center text-white font-bold">
                      {post.author_name?.charAt(0) || 'A'}
                    </span>
                    {post.author_name || 'Anonymous'}
                  </span>
                  <span>📅 {formatDate(post.timestamp)}</span>
                  <span>⏱️ {post.read_time || 1} min read</span>
                  <span>👁️ {post.views || 0} views</span>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                {/* Featured Image */}
                {(post.image_url || (post.photo && post.photo.length > 0)) && (
                  <div className="mb-8">
                    <img 
                      src={post.image_url || createImageUrlFromPhotoData(post.photo)} 
                      alt={post.title}
                      className="w-full h-96 object-cover rounded-xl shadow-2xl"
                    />
                    {/* Compression Stats */}
                    {post.compression_ratio > 0 && (
                      <div className="text-xs text-gray-400 bg-gray-800/50 p-3 rounded-lg mt-3 inline-block">
                        📊 Image optimized: {post.compression_ratio}% size reduction
                      </div>
                    )}
                  </div>
                )}

                {/* Post Content */}
                <div className="prose prose-invert prose-lg max-w-none mb-8">
                  <div className="text-gray-100 leading-relaxed text-lg whitespace-pre-wrap">
                    {post.content}
                  </div>
                </div>

                {/* Tags */}
                {post.tags && post.tags.length > 0 && (
                  <div className="flex flex-wrap gap-3 mb-8">
                    {post.tags.map((tag, tagIndex) => (
                      <span 
                        key={tagIndex} 
                        className="px-4 py-2 bg-gradient-to-r from-gray-700 to-gray-600 text-gray-200 text-sm rounded-full border border-gray-600"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Engagement Stats */}
                <div className="bg-gray-800/50 rounded-xl p-6 mb-8">
                  <div className="grid grid-cols-3 gap-6 text-center">
                    <div>
                      <div className="text-2xl font-bold text-yellow-100">{post.likes || 0}</div>
                      <div className="text-gray-400 text-sm">Likes</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-blue-100">{post.views || 0}</div>
                      <div className="text-gray-400 text-sm">Views</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-green-100">{post.read_time || 1}</div>
                      <div className="text-gray-400 text-sm">Min Read</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Bar */}
              <div className="sticky bottom-0 bg-gray-900/95 backdrop-blur-xl border-t border-gray-700 p-6 rounded-b-2xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {/* Like Button */}
                    <button 
                      onClick={handleLike}
                      className={`flex items-center gap-3 px-6 py-3 rounded-xl transition-all duration-300 ${
                        liked 
                          ? 'bg-red-500/20 text-red-400 border border-red-500/50' 
                          : 'bg-gray-800/50 text-gray-300 border border-gray-600 hover:bg-gray-700/50'
                      }`}
                    >
                      <span className="text-xl">{liked ? '❤️' : '🤍'}</span>
                      <span className="font-medium">{liked ? 'Liked' : 'Like'}</span>
                      <span className="text-sm">({post.likes || 0})</span>
                    </button>
                    
                    {/* Tip Button */}
                    <button 
                      onClick={handleTip}
                      className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-xl hover:from-yellow-600 hover:to-orange-600 transition-all duration-300 border border-yellow-500/50"
                    >
                      <span className="text-xl">💎</span>
                      <span className="font-medium">Tip Author</span>
                    </button>
                  </div>
                  
                  {/* Share Button */}
                  <button 
                    onClick={handleShare}
                    className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl hover:from-blue-600 hover:to-purple-600 transition-all duration-300 border border-blue-500/50"
                  >
                    <span className="text-xl">📤</span>
                    <span className="font-medium">Share Post</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Share Modal */}
      <BlogPostShareModal 
        post={post}
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
      />
    </>
  );
};

export default BlogPostDetailModal;
