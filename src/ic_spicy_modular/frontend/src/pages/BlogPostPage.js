import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { generateOpenGraphMeta } from '../utils/socialMedia';
import BlogPostShareModal from '../components/BlogPostShareModal';

const BlogPostPage = () => {
  const { postId } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [liked, setLiked] = useState(false);

  // Load the specific blog post
  useEffect(() => {
    const loadPost = async () => {
      try {
        setLoading(true);
        setError(null);

        // Try to load from canister first
        try {
          const agent = new (await import('@dfinity/agent')).HttpAgent({ 
            host: 'https://ic0.app' 
          });
          
          const canisterId = 'l4gsl-gyaaa-aaaap-qp5ma-cai'; // Blog canister ID
          const testIdl = ({ IDL }) => {
            const Post = IDL.Record({
              'id' : IDL.Nat,
              'title' : IDL.Text,
              'content' : IDL.Text,
              'author' : IDL.Text,
              'timestamp' : IDL.Int,
              'photo' : IDL.Opt(IDL.Vec(IDL.Nat8)),
            });
            return IDL.Service({
              'get_post' : IDL.Func([IDL.Nat], [IDL.Opt(Post)], ['query']),
            });
          };

          const blogCanister = (await import('@dfinity/agent')).Actor.createActor(testIdl, { 
            agent: agent, 
            canisterId: canisterId 
          });

          const postResult = await blogCanister.get_post(Number(postId));
          
          if (postResult.length > 0 && postResult[0]) {
            const canisterPost = postResult[0];
            
            // Transform canister post to frontend format
            const transformedPost = {
              id: Number(canisterPost.id),
              title: canisterPost.title,
              content: canisterPost.content,
              author: canisterPost.author,
              timestamp: Number(canisterPost.timestamp),
              photo: canisterPost.photo?.[0] || [],
              author_name: canisterPost.author,
              created_at: Number(canisterPost.timestamp),
              category: 'growing',
              tags: ['ic-spicy', 'pepper-growing'],
              excerpt: canisterPost.content.length > 150 ? canisterPost.content.substring(0, 150) + '...' : canisterPost.content,
              read_time: Math.ceil(canisterPost.content.split(' ').length / 200),
              views: 0,
              likes: 0,
              status: 'published',
              image_url: null,
              compressed_size: canisterPost.photo?.[0]?.length || 0,
              original_size: canisterPost.photo?.[0]?.length || 0,
              compression_ratio: 0
            };
            
            setPost(transformedPost);
            return;
          }
        } catch (canisterError) {
          console.log('Could not load from canister, trying localStorage:', canisterError);
        }

        // Fallback to localStorage
        const storedPosts = JSON.parse(localStorage.getItem('ic_spicy_blog_posts') || '[]');
        const foundPost = storedPosts.find(p => p.id === parseInt(postId));
        
        if (foundPost) {
          setPost(foundPost);
        } else {
          setError('Blog post not found');
        }
      } catch (err) {
        console.error('Error loading post:', err);
        setError('Failed to load blog post');
      } finally {
        setLoading(false);
      }
    };

    if (postId) {
      loadPost();
    }
  }, [postId]);

  // Generate and update meta tags when post loads
  useEffect(() => {
    if (post) {
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
      }
    }
  }, [post]);

  const handleLike = () => {
    setLiked(!liked);
    // TODO: Implement actual like functionality
  };

  const handleTip = () => {
    // TODO: Implement tip functionality
    console.log('Tip functionality to be implemented');
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-yellow-500 mx-auto mb-4"></div>
          <div className="text-yellow-100 text-xl">Loading blog post...</div>
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-400 text-6xl mb-4">📝</div>
          <div className="text-yellow-100 text-2xl mb-4">Post Not Found</div>
          <div className="text-gray-400 mb-6">
            {error || 'The blog post you\'re looking for doesn\'t exist or has been removed.'}
          </div>
          <button
            onClick={() => navigate('/blog')}
            className="luxury-btn px-6 py-3"
          >
            ← Back to Blog
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      {/* Header */}
      <div className="sticky top-0 bg-gray-900/95 backdrop-blur-xl border-b border-gray-700 p-6 z-40">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/blog')}
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
            >
              ← Back to Blog
            </button>
            <h1 className="text-3xl font-bold text-yellow-100 text-center flex-1">{post.title}</h1>
            <div className="w-20"></div> {/* Spacer for centering */}
          </div>
          
          {/* Post Meta */}
          <div className="flex items-center justify-center gap-6 text-gray-400 mt-4 text-sm">
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
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto p-6">
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
      <div className="sticky bottom-0 bg-gray-900/95 backdrop-blur-xl border-t border-gray-700 p-6">
        <div className="max-w-4xl mx-auto">
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
      </div>

      {/* Share Modal */}
      <BlogPostShareModal 
        post={post}
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
      />
    </div>
  );
};

export default BlogPostPage;
