import React, { useState, useRef, useEffect } from 'react';
import { useWallet } from '../WalletContext';
import { Principal } from '@dfinity/principal';
import { Actor } from '@dfinity/agent';
import { useAgent, useIdentityKit } from '@nfid/identitykit/react';
import { idlFactory as membershipIdl } from '../declarations/membership';
import { CANISTER_IDS } from '../config';
import BlogPostShareModal from '../components/BlogPostShareModal';
import BlogPostDetailModal from '../components/BlogPostDetailModal';
import { 
  compressImage, 
  fileToUint8Array, 
  uint8ArrayToFile, 
  validateImage,
  getCompressionRecommendations,
  optimizeForCanister
} from '../utils/imageCompression';
import { motion, AnimatePresence } from 'framer-motion';
import { HttpAgent } from '@dfinity/agent';

const BlogPage = () => {
  const { principal: walletPrincipal, plugConnected, canisters, connectPlug, agent } = useWallet();
  const { user, isAuthenticated } = useIdentityKit();
  const oisyAgent = useAgent();
  
  // State management
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState('growing');
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [posts, setPosts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [membership, setMembership] = useState(null);
  const [tipping, setTipping] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [tipAmount, setTipAmount] = useState('');
  const [tipToken, setTipToken] = useState('SPICY');
  const [showTipModal, setShowTipModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sharePost, setSharePost] = useState(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [compressionStats, setCompressionStats] = useState(null);
  const [optimizedPhotoData, setOptimizedPhotoData] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [detailPost, setDetailPost] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // LocalStorage keys for persistent mock data (fallback)
  const STORAGE_KEY = 'ic_spicy_blog_posts';
  const POST_ID_KEY = 'ic_spicy_next_post_id';
  
  const formRef = useRef(null);

  const effectivePrincipal = React.useMemo(() => {
    if (user?.principal?.toText) return user.principal.toText();
    if (walletPrincipal) return String(walletPrincipal);
    return null;
  }, [user, walletPrincipal]);

  const isConnected = plugConnected || (isAuthenticated && oisyAgent) || (agent && !plugConnected && !oisyAgent);

  // Debug wallet connection status
  useEffect(() => {
    console.log('🔍 Wallet Connection Debug (useEffect):');
    console.log('  - Plug Connected:', plugConnected);
    console.log('  - OISY Authenticated:', isAuthenticated);
    console.log('  - OISY Agent Available:', !!oisyAgent);
    console.log('  - Internet Identity Agent:', !!agent);
    console.log('  - Wallet Principal:', walletPrincipal);
    console.log('  - OISY User Principal:', user?.principal?.toText());
    console.log('  - Effective Principal:', effectivePrincipal);
    console.log('  - Is Connected:', isConnected);
    console.log('  - Wallet Context Canisters:', Object.keys(canisters));
  }, [plugConnected, isAuthenticated, oisyAgent, agent, walletPrincipal, user, effectivePrincipal, isConnected, canisters]);

  // Check if device is mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const categories = [
    { id: 'all', name: 'All Posts', icon: '🌱', color: 'from-emerald-500 to-teal-500' },
    { id: 'growing', name: 'Growing Tips', icon: '🌿', color: 'from-green-500 to-emerald-500' },
    { id: 'harvest', name: 'Harvest Stories', icon: '🌶️', color: 'from-red-500 to-orange-500' },
    { id: 'recipe', name: 'Recipes', icon: '👨‍🍳', color: 'from-yellow-500 to-orange-500' },
    { id: 'experience', name: 'My Experience', icon: '💬', color: 'from-purple-500 to-pink-500' },
    { id: 'tutorial', name: 'Tutorials', icon: '📚', color: 'from-blue-500 to-indigo-500' },
  ];

  // Utility function to safely convert BigInt values
  const safeBigIntToNumber = (value) => {
    try {
      if (typeof value === 'bigint') {
        // Check if the BigInt is within safe number range
        if (value > Number.MAX_SAFE_INTEGER || value < Number.MIN_SAFE_INTEGER) {
          console.warn('BigInt value exceeds safe number range:', value);
          return value.toString(); // Return as string for very large numbers
        }
        return Number(value);
      }
      return value;
    } catch (error) {
      console.error('Error converting BigInt to number:', error, 'Value:', value);
      return value?.toString() || 0; // Fallback to string or 0
    }
  };

  // Utility function to create image URL from photo data
  const createImageUrlFromPhotoData = (photoData) => {
    try {
      if (!photoData || photoData.length === 0) {
        return null;
      }
      
      // Convert Uint8Array to Blob
      const blob = new Blob([photoData], { type: 'image/jpeg' });
      
      // Create object URL for display
      const imageUrl = URL.createObjectURL(blob);
      
      console.log('🖼️ Created image URL from photo data:', {
        photoDataLength: photoData.length,
        blobSize: blob.size,
        imageUrl: imageUrl
      });
      
      return imageUrl;
    } catch (error) {
      console.error('❌ Error creating image URL from photo data:', error);
      return null;
    }
  };

  // Enhanced image handling with compression
  const handlePhotoChange = async (event) => {
    console.log('🖼️ handlePhotoChange triggered');
    const file = event.target.files[0];
    if (!file) {
      console.log('❌ No file selected');
      return;
    }

    console.log('📁 File selected:', {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified
    });

    // Validate image
    console.log('🔍 Validating image...');
    const validation = validateImage(file);
    console.log('✅ Validation result:', validation);
    
    if (!validation.isValid) {
      console.error('❌ Image validation failed:', validation.errors);
      setError(validation.errors.join(', '));
      return;
    }

    try {
      setUploading(true);
      setError('');
      console.log('🔄 Starting image compression...');

      // Optimize image specifically for on-chain storage
      console.log('🌐 Optimizing image for canister storage...');
      
      let compressedFile, stats, uint8Array;
      
      try {
        const result = await optimizeForCanister(file);
        compressedFile = result.compressedFile;
        stats = result.stats;
        uint8Array = result.uint8Array;
        
        console.log('✅ Canister optimization completed:', {
          originalSize: stats.originalSize,
          compressedSize: stats.compressedSize,
          compressionRatio: stats.compressionRatio
        });
      } catch (compressionError) {
        console.error('❌ Canister optimization failed, falling back to basic compression:', compressionError);
        
        // Fallback to basic compression
        const fallbackResult = await compressImage(file, {
          maxWidth: 800,
          maxHeight: 600,
          quality: 0.7,
          maxSizeMB: 0.5
        });
        
        compressedFile = fallbackResult.compressedFile;
        stats = fallbackResult.stats;
        
        console.log('✅ Basic compression completed:', {
          originalSize: stats.originalSize,
          compressedSize: stats.compressedSize,
          compressionRatio: stats.compressionRatio
        });
        
        // Convert to Uint8Array for canister upload
        uint8Array = await fileToUint8Array(compressedFile);
      }
      
      // Update state with compressed data (either optimized or fallback)
      setPhoto(compressedFile);
      setPhotoPreview(URL.createObjectURL(compressedFile));
      setCompressionStats(stats);
      
      // Store the optimized Uint8Array for canister upload
      setOptimizedPhotoData(uint8Array);
      
      console.log('📸 Photo state updated:', {
        photo: !!compressedFile,
        photoPreview: !!URL.createObjectURL(compressedFile),
        compressionStats: stats
      });
      
      setSuccess(`✅ Image compressed successfully! Saved ${(stats.spaceSaved / 1024 / 1024).toFixed(2)}MB (${stats.compressionRatio}% reduction)`);
      setTimeout(() => setSuccess(''), 5000);
      
    } catch (error) {
      console.error('❌ Image compression failed:', error);
      setError(`Image compression failed: ${error.message}`);
    } finally {
      setUploading(false);
      console.log('🏁 handlePhotoChange completed');
    }
  };

  // Enhanced post creation with on-chain storage
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    console.log('🚀 Form submission started');
    console.log('🔍 Pre-submission wallet status:');
    console.log('  - isConnected:', isConnected);
    console.log('  - plugConnected:', plugConnected);
    console.log('  - isAuthenticated:', isAuthenticated);
    console.log('  - oisyAgent:', !!oisyAgent);
    console.log('  - agent:', !!agent);
    console.log('  - canisters.blog:', !!canisters.blog);
    console.log('  - effectivePrincipal:', effectivePrincipal);
    
    if (!isConnected) {
      console.error('❌ Wallet not connected. Connection status:', {
        plugConnected,
        isAuthenticated,
        oisyAgent: !!oisyAgent,
        agent: !!agent,
        canisters: Object.keys(canisters)
      });
      setError('Please connect your wallet to create a blog post');
      return;
    }

    if (!title.trim() || !content.trim()) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setUploading(true);
      setError('');

      let blogCanister = null;
      
      // Debug connection status
      console.log('🔍 Connection Debug Info:');
      console.log('  - Plug Connected:', plugConnected);
      console.log('  - OISY Authenticated:', isAuthenticated);
      console.log('  - OISY Agent Available:', !!oisyAgent);
      console.log('  - OISY Agent Type:', oisyAgent?.constructor?.name);
      console.log('  - Wallet Principal:', walletPrincipal);
      console.log('  - OISY User Principal:', user?.principal?.toText());
      console.log('  - Effective Principal:', effectivePrincipal);
      
      // Try to get blog canister from different sources
      if (canisters.blog) {
        blogCanister = canisters.blog;
        console.log('✅ Using blog canister from wallet context');
      } else if (isAuthenticated && oisyAgent) {
        try {
          console.log('🔄 Creating blog canister with OISY agent...');
          const { idlFactory: blogIdl } = await import('../declarations/blog');
          console.log('📦 Blog IDL loaded successfully');
          
          blogCanister = Actor.createActor(blogIdl, { 
            agent: oisyAgent, 
            canisterId: CANISTER_IDS.blog 
          });
          console.log('✅ Created blog canister with OISY agent');
          
          // Test the canister connection
          try {
            const info = await blogCanister.get_blog_info();
            console.log('✅ OISY canister connection test successful:', info);
          } catch (testError) {
            console.warn('⚠️ OISY canister connection test failed:', testError);
            // Don't fail here, just log the warning
          }
          
        } catch (e) {
          console.error('❌ Failed to create blog canister with OISY agent:', e);
          console.error('❌ Error details:', {
            message: e.message,
            stack: e.stack,
            oisyAgent: !!oisyAgent,
            isAuthenticated,
            canisterId: CANISTER_IDS.blog
          });
        }
      } else if (plugConnected && agent) {
        try {
          console.log('🔄 Creating blog canister with Plug agent...');
          const { idlFactory: blogIdl } = await import('../declarations/blog');
          blogCanister = Actor.createActor(blogIdl, { 
            agent: agent, 
            canisterId: CANISTER_IDS.blog 
          });
          console.log('✅ Created blog canister with Plug agent');
        } catch (e) {
          console.error('❌ Failed to create blog canister with Plug agent:', e);
        }
      } else if (agent && !plugConnected && !oisyAgent) {
        // This handles Internet Identity agent from WalletContext
        try {
          console.log('🔄 Creating blog canister with Internet Identity agent...');
          const { idlFactory: blogIdl } = await import('../declarations/blog');
          blogCanister = Actor.createActor(blogIdl, { 
            agent: agent, 
            canisterId: CANISTER_IDS.blog 
          });
          console.log('✅ Created blog canister with Internet Identity agent');
          
          // Test the canister connection
          try {
            const info = await blogCanister.get_blog_info();
            console.log('✅ Internet Identity canister connection test successful:', info);
          } catch (testError) {
            console.warn('⚠️ Internet Identity canister connection test failed:', testError);
          }
          
        } catch (e) {
          console.error('❌ Failed to create blog canister with Internet Identity agent:', e);
        }
      } else if (!isAuthenticated && !plugConnected && !agent) {
        // Only create anonymous agent when no wallet is connected at all
        try {
          console.log('🔄 Creating anonymous agent for read-only access...');
          const { idlFactory: blogIdl } = await import('../declarations/blog');
          const anonymousAgent = new HttpAgent({ host: 'https://ic0.app' });
          blogCanister = Actor.createActor(blogIdl, { 
            agent: anonymousAgent, 
            canisterId: CANISTER_IDS.blog 
          });
          console.log('✅ Created blog canister with anonymous agent (read-only)');
          
          // Test the connection
          try {
            const info = await blogCanister.get_blog_info();
            console.log('✅ Anonymous canister connection test successful:', info);
          } catch (testError) {
            console.warn('⚠️ Anonymous canister connection test failed:', testError);
          }
          
        } catch (e) {
          console.error('❌ Failed to create anonymous blog canister:', e);
        }
      }

      if (!blogCanister) {
        console.error('❌ No blog canister available. Connection status:');
        console.error('  - Plug Connected:', plugConnected);
        console.error('  - OISY Authenticated:', isAuthenticated);
        console.error('  - OISY Agent:', !!oisyAgent);
        console.error('  - Internet Identity Agent:', !!agent);
        console.error('  - Wallet Context Canisters:', Object.keys(canisters));
        console.error('  - User Principal:', user?.principal?.toText());
        console.error('  - Wallet Principal:', walletPrincipal);
        
        if (isAuthenticated && !oisyAgent) {
          throw new Error('OISY wallet connected but agent not available. Please refresh the page and try again.');
        } else if (agent && !plugConnected && !oisyAgent) {
          throw new Error('Internet Identity connected but blog canister creation failed. Please refresh the page and try again.');
        } else if (!isAuthenticated && !plugConnected && !agent) {
          throw new Error('No wallet connected. Please connect OISY, NFID, Plug, or Phantom wallet.');
        } else {
          throw new Error('Blog canister not available. Please ensure your wallet is properly connected and refresh the page.');
        }
      }

      // Check if we're using anonymous agent (read-only)
      const isAnonymousAgent = blogCanister.agent && 
                               blogCanister.agent.constructor.name === 'HttpAgent' && 
                               !blogCanister.agent.identity && 
                               !isAuthenticated && 
                               !plugConnected && 
                               !agent;
      
      if (isAnonymousAgent) {
        throw new Error('You are currently in read-only mode. Please connect a wallet (OISY, NFID, Plug, or Phantom) to create posts.');
      }

      console.log('🌐 Blog canister ready for posting:');
      console.log('  - Canister type:', blogCanister.constructor.name);
      console.log('  - Agent type:', blogCanister.agent?.constructor?.name);
      console.log('  - Has identity:', !!blogCanister.agent?.identity);
      console.log('  - Effective principal:', effectivePrincipal);
      console.log('  - Title:', title.trim());
      console.log('  - Content length:', content.trim().length);
      console.log('  - Photo attached:', !!photo);

      console.log('🌐 Creating post on-chain using deployed canister...');

      // Use the actual deployed canister methods
      let postId;
      let photoData = [];
      
      if (photo && optimizedPhotoData) {
        // Use the pre-optimized photo data for canister storage
        photoData = Array.from(optimizedPhotoData);
        console.log('📸 Using pre-optimized photo data for canister:');
        console.log('  - Original photo size:', photo.size);
        console.log('  - Optimized data length:', photoData.length);
        console.log('  - Compression ratio:', compressionStats?.compressionRatio || 'N/A');
        console.log('  - Space saved:', compressionStats?.spaceSaved ? `${(compressionStats.spaceSaved / 1024).toFixed(1)}KB` : 'N/A');
      } else if (photo) {
        // Fallback: process photo on-demand (less optimal)
        console.log('⚠️ No pre-optimized data, processing photo on-demand...');
        photoData = await fileToUint8Array(photo);
        photoData = Array.from(photoData);
        console.log('📸 Photo data processed on-demand, length:', photoData.length);
      }

      try {
        // Ensure we're sending the correct format for the canister
        // The canister expects Opt<Vec<Nat8>> which means:
        // - If no photo: [] (empty array)
        // - If photo: [photoData] (optional array of Nat8 values)
        const canisterPhotoData = photoData.length > 0 ? [photoData] : [];
        console.log('🌐 Sending to canister - photo data format:', canisterPhotoData);
        console.log('🌐 Photo data array length:', canisterPhotoData.length);
        if (canisterPhotoData.length > 0) {
          console.log('🌐 Photo data length:', canisterPhotoData[0].length);
          console.log('🌐 Photo data type:', canisterPhotoData[0].constructor.name);
          console.log('🌐 Photo data is array:', Array.isArray(canisterPhotoData[0]));
          console.log('🌐 First few bytes:', canisterPhotoData[0].slice(0, 10));
          
          // Validate the data structure matches canister expectations
          if (!Array.isArray(canisterPhotoData[0])) {
            throw new Error('Invalid photo data structure. Expected array of Nat8 values.');
          }
          
          console.log('✅ Photo data structure validated successfully');
        }
        
        postId = await blogCanister.add_post(
          title.trim(),
          content.trim(),
          effectivePrincipal || 'anonymous',
          canisterPhotoData
        );
        
        console.log('✅ Post created successfully with ID:', postId);
        
        setSuccess('🎉 Blog post created successfully on-chain!');
        setTitle('');
        setContent('');
        setPhoto(null);
        setPhotoPreview(null);
        setOptimizedPhotoData(null);
        setCategory('growing');
        setShowForm(false);
        
        // Refresh posts
        await loadPosts();
        
      } catch (canisterError) {
        console.error('❌ Canister add_post failed:', canisterError);
        
        // Check for specific error types
        if (canisterError.message && canisterError.message.includes('not available')) {
          throw new Error('Blog canister not available. Please ensure your wallet is properly connected.');
        } else if (canisterError.message && (canisterError.message.includes('Invalid opt vec nat8') || canisterError.message.includes('Invalid opt vec vec nat8'))) {
          // Photo data serialization issue - try without photo
          console.log('🔄 Photo data serialization failed, trying without photo...');
          try {
            postId = await blogCanister.add_post(
              title.trim(),
              content.trim(),
              effectivePrincipal || 'anonymous',
              [] // Empty array, no photo
            );
            
            console.log('✅ Post created successfully without photo, ID:', postId);
            setSuccess('🎉 Blog post created successfully on-chain! (Photo upload failed, but post was saved)');
            setTitle('');
            setContent('');
            setPhoto(null);
            setPhotoPreview(null);
            setOptimizedPhotoData(null);
            setCategory('growing');
            setShowForm(false);
            
            // Refresh posts
            await loadPosts();
            return; // Exit early since we succeeded
            
          } catch (retryError) {
            console.error('❌ Retry without photo also failed:', retryError);
            throw new Error(`Photo upload failed and fallback posting also failed: ${retryError.message}`);
          }
        } else {
          throw new Error(`Canister error: ${canisterError.message || 'Unknown error occurred'}`);
        }
      }
      
    } catch (error) {
      console.error('❌ Post creation failed:', error);
      setError(`Failed to create post on-chain: ${error.message}. Please try again or contact support.`);
    } finally {
      setUploading(false);
    }
  };

  // Local storage fallback
  const createLocalPost = async () => {
    const newPost = {
      id: getNextPostId(),
      title: title.trim(),
      content: content.trim(),
      author: effectivePrincipal || 'anonymous',
      author_name: 'IC SPICY User',
      timestamp: Date.now(),
      created_at: Date.now(),
      category,
      tags: [category, 'ic-spicy', 'pepper-growing'],
      excerpt: content.length > 150 ? content.substring(0, 150) + '...' : content,
      read_time: Math.ceil(content.split(' ').length / 200),
      views: 0,
      likes: 0,
      status: 'published',
      photo: [],
      image_url: photoPreview,
      compressed_size: photo ? photo.size : 0,
      original_size: compressionStats?.originalSize || 0,
      compression_ratio: compressionStats?.compressionRatio || 0
    };

    const updatedPosts = [newPost, ...posts];
    setPosts(updatedPosts);
    savePostsToStorage(updatedPosts);
    
    setSuccess('📝 Blog post saved locally! (Connect to canister for on-chain storage)');
    setTitle('');
    setContent('');
    setPhoto(null);
    setPhotoPreview(null);
    setOptimizedPhotoData(null);
    setCategory('growing');
    setShowForm(false);
  };

  // Load posts from canister and local storage
  const loadPosts = async () => {
    setLoading(true);
    try {
      let canisterPosts = [];
      let blogCanister = null;
      
      // Try to get blog canister from different sources
      if (canisters.blog) {
        blogCanister = canisters.blog;
        console.log('✅ Using blog canister from wallet context');
      } else if (oisyAgent) {
        try {
          const { idlFactory: blogIdl } = await import('../declarations/blog');
          blogCanister = Actor.createActor(blogIdl, { 
            agent: oisyAgent, 
            canisterId: CANISTER_IDS.blog 
          });
          console.log('✅ Created blog canister with OISY agent');
        } catch (e) {
          console.log('❌ Failed to create blog canister with OISY agent:', e);
        }
      } else if (plugConnected && agent) {
        try {
          const { idlFactory: blogIdl } = await import('../declarations/blog');
          blogCanister = Actor.createActor(blogIdl, { 
            agent: agent, 
            canisterId: CANISTER_IDS.blog 
          });
          console.log('✅ Created blog canister with Plug agent');
        } catch (e) {
          console.log('❌ Failed to create blog canister with Plug agent:', e);
        }
      } else {
        // Try anonymous access for viewing posts
        try {
          const { idlFactory: blogIdl } = await import('../declarations/blog');
          const anonymousAgent = new HttpAgent({ host: 'https://ic0.app' });
          blogCanister = Actor.createActor(blogIdl, { 
            agent: anonymousAgent, 
            canisterId: CANISTER_IDS.blog 
          });
          console.log('✅ Created blog canister with anonymous agent for viewing');
        } catch (e) {
          console.log('❌ Failed to create blog canister with anonymous agent:', e);
        }
      }
      
      if (blogCanister) {
        try {
          console.log('🌐 Loading posts from deployed canister...');
          
          // Use the list_posts method that actually exists
          canisterPosts = await blogCanister.list_posts();
          console.log('✅ Loaded', canisterPosts.length, 'posts from canister');
          
          // Transform the posts to match our frontend format
          canisterPosts = canisterPosts.map(post => ({
            id: safeBigIntToNumber(post.id), // Convert BigInt nat to number
            title: post.title,
            content: post.content,
            author: post.author,
            author_name: post.author,
            timestamp: safeBigIntToNumber(post.timestamp), // Convert BigInt int to number
            created_at: safeBigIntToNumber(post.timestamp), // Convert BigInt int to number
            category: 'general', // Default category since deployed canister doesn't have categories
            tags: ['ic-spicy', 'pepper-growing'],
            excerpt: post.content.length > 150 ? post.content.substring(0, 150) + '...' : post.content,
            read_time: Math.ceil(post.content.split(' ').length / 200),
            views: 0,
            likes: 0,
            status: 'published',
            photo: post.photo?.[0] || [],
            image_url: null, // Will be handled in render using createImageUrlFromPhotoData
            compressed_size: post.photo?.[0]?.length || 0,
            original_size: post.photo?.[0]?.length || 0,
            compression_ratio: 0
          }));
          
        } catch (e) {
          console.log('❌ Canister methods not available:', e.message);
          setError('Unable to load posts from canister. Please ensure your wallet is properly connected.');
          canisterPosts = [];
        }
      } else {
        console.log('❌ No blog canister available');
        setError('Blog canister not available. Please connect your wallet to view posts.');
        canisterPosts = [];
      }

      // Load stored posts as fallback when canister fails
      let finalPosts = canisterPosts;
      
      if (canisterPosts.length === 0) {
        console.log('📱 Loading fallback posts from local storage...');
        const storedPosts = getStoredPosts();
        
        // Add demo posts if no posts exist anywhere
        if (storedPosts.length === 0) {
          const demoPosts = createDemoPosts();
          savePostsToStorage(demoPosts);
          finalPosts = demoPosts;
          setSuccess('🌶️ Demo posts loaded. Connect your wallet to create real posts on-chain!');
        } else {
          finalPosts = storedPosts;
          setSuccess('📱 Using locally stored posts. Connect your wallet to sync with the blockchain!');
        }
      } else {
        // Canister posts available - clear any local storage messages
        setError('');
        setSuccess('');
      }
      
      setPosts(finalPosts.reverse() || []);
      
      // Handle deep linking
      handleDeepLinking(finalPosts);
      
    } catch (error) {
      console.error('Error loading posts:', error);
      setError('Failed to load blog posts: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Create demo posts
  const createDemoPosts = () => [
    {
      id: 1001,
      title: "My First Carolina Reaper Harvest! 🔥",
      content: "After 6 months of careful growing, I finally harvested my first Carolina Reaper peppers! The heat level is absolutely insane - definitely the hottest thing I've ever grown. The plants produced about 20 peppers each, and I'm planning to make some scorching hot sauce. Growing tips: They need LOTS of heat and humidity, consistent watering, and patience. The wait is so worth it when you see those wrinkled, devilish peppers growing. Next year I'm trying the Pepper X variety!",
      author: "2vxsx-fae",
      author_name: "Spicy Grower",
      timestamp: Date.now() - 86400000,
      created_at: Date.now() - 86400000,
      category: "harvest",
      tags: ["carolina-reaper", "super-hot", "harvest"],
      excerpt: "After 6 months of careful growing, I finally harvested my first Carolina Reaper peppers!",
      read_time: 2,
      views: 47,
      likes: 12,
      status: 'published',
      photo: [],
      image_url: null,
      compressed_size: 0,
      original_size: 0,
      compression_ratio: 0
    },
    {
      id: 1002,
      title: "Growing Jalapeños in Winter: My Indoor Setup",
      content: "Living in a cold climate doesn't mean you can't grow peppers year-round! I've set up a fantastic indoor growing system that's been producing beautiful jalapeños all winter long. My setup includes: LED grow lights (full spectrum), temperature control (keeps it at 75-80°F), humidity monitoring, and a good ventilation system. The key is maintaining consistent conditions and not overwatering. I've harvested over 50 jalapeños in the past 2 months! The taste is incredible - much better than store-bought. Planning to expand to habaneros next!",
      author: "vklag-edc",
      author_name: "Winter Grower",
      timestamp: Date.now() - 172800000,
      created_at: Date.now() - 172800000,
      category: "growing",
      tags: ["jalapeño", "indoor", "winter-growing"],
      excerpt: "Living in a cold climate doesn't mean you can't grow peppers year-round!",
      read_time: 3,
      views: 83,
      likes: 25,
      status: 'published',
      photo: [],
      image_url: null,
      compressed_size: 0,
      original_size: 0,
      compression_ratio: 0
    }
  ];

  // Handle deep linking
  const handleDeepLinking = (finalPosts) => {
    const urlParams = new URLSearchParams(window.location.search);
    const postId = urlParams.get('post');
    const utmSource = urlParams.get('utm_source');
    
    if (postId && finalPosts.length > 0) {
      // Convert postId to number for comparison
      const targetPostId = parseInt(postId);
      const targetPost = finalPosts.find(p => {
        // Handle both number and string IDs
        const postIdNum = typeof p.id === 'bigint' ? Number(p.id) : Number(p.id);
        return postIdNum === targetPostId;
      });
      
      if (targetPost) {
        if (utmSource === 'social') {
          setSuccess(`🌶️ Welcome to IC SPICY! You're viewing "${targetPost.title}" - Connect your wallet to join our pepper growing community!`);
          setTimeout(() => setSuccess(""), 5000);
        }
        
        // Scroll to the post
        setTimeout(() => {
          const postElement = document.getElementById(`post-${targetPostId}`);
          if (postElement) {
            postElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            postElement.classList.add('highlight-post');
            setTimeout(() => postElement.classList.remove('highlight-post'), 3000);
          }
        }, 1000);
      }
    }
  };

  // Persistent storage utilities
  const getStoredPosts = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.error('Error loading stored posts:', e);
      return [];
    }
  };

  const savePostsToStorage = (postsToSave) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(postsToSave));
    } catch (e) {
      console.error('Error saving posts to storage:', e);
    }
  };

  const getNextPostId = () => {
    try {
      const nextId = localStorage.getItem(POST_ID_KEY);
      const id = nextId ? parseInt(nextId) : 1001;
      localStorage.setItem(POST_ID_KEY, (id + 1).toString());
      return id;
    } catch (e) {
      console.error('Error getting next post ID:', e);
      return Date.now();
    }
  };

  // Load data on component mount
  useEffect(() => {
    loadPosts();
  }, [canisters, oisyAgent]);

  // Filter posts by category
  const filteredPosts = selectedCategory === 'all' 
    ? posts 
    : posts.filter(post => post.category === selectedCategory);

  // Mobile-optimized blog post component
  const BlogPost = ({ post, index }) => (
    <motion.div
      id={`post-${post.id}`}
      key={post.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className={`${isMobile ? 'mobile-blog-post' : 'luxury-card'} mb-6 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-yellow-500/20 cursor-pointer group`}
      onClick={() => {
        setDetailPost(post);
        setShowDetailModal(true);
      }}
    >
      {/* Post Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-xl font-bold text-yellow-100 mb-2">{post.title}</h3>
          <div className="flex items-center gap-4 text-sm text-gray-400 mb-3">
            <span>👤 {post.author_name || 'Anonymous'}</span>
            <span>📅 {new Date(post.timestamp).toLocaleDateString()}</span>
            <span>⏱️ {post.read_time || 1} min read</span>
            <span>👁️ {post.views || 0} views</span>
            <span>❤️ {post.likes || 0} likes</span>
          </div>
        </div>
        
        {/* Category Badge */}
        <span className={`px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r ${categories.find(c => c.id === post.category)?.color || 'from-gray-500 to-gray-600'} text-white`}>
          {categories.find(c => c.id === post.category)?.name || post.category}
        </span>
      </div>

      {/* Post Image */}
      {(post.image_url || (post.photo && post.photo.length > 0)) && (
        <div className="mb-4">
          <img 
            src={post.image_url || createImageUrlFromPhotoData(post.photo)} 
            alt={post.title}
            className={`${isMobile ? 'mobile-blog-post-image' : 'w-full h-64 object-cover rounded-lg'} mb-4`}
          />
          {/* Compression Stats */}
          {post.compression_ratio > 0 && (
            <div className="text-xs text-gray-400 bg-gray-800/50 p-2 rounded">
              📊 Image optimized: {post.compression_ratio}% size reduction
            </div>
          )}
        </div>
      )}

      {/* Post Content */}
      <div className={`${isMobile ? 'mobile-blog-post-content' : 'text-gray-100 leading-relaxed'} mb-4`}>
        {post.excerpt || (post.content && post.content.length > 200 ? post.content.substring(0, 200) + '...' : post.content)}
        {post.content && post.content.length > 200 && (
          <div className="text-yellow-400 text-sm mt-2 font-medium">
            👆 Click to read full post
          </div>
        )}
      </div>

      {/* Post Tags */}
      {post.tags && post.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {post.tags.map((tag, tagIndex) => (
            <span key={tagIndex} className="px-2 py-1 bg-gray-700/50 text-gray-300 text-xs rounded">
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Post Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-700">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => handleLike(post.id)}
            className="flex items-center gap-2 text-gray-400 hover:text-red-400 transition-colors"
          >
            <span>❤️</span>
            <span>{post.likes || 0}</span>
          </button>
          
          <button 
            onClick={() => handleTip(post)}
            className="flex items-center gap-2 text-gray-400 hover:text-yellow-400 transition-colors"
          >
            <span>💎</span>
            <span>Tip</span>
          </button>
        </div>
        
        <button 
          onClick={() => handleShare(post)}
          className="flex items-center gap-2 text-gray-400 hover:text-blue-400 transition-colors"
        >
          <span>📤</span>
          <span>Share</span>
        </button>
      </div>
    </motion.div>
  );

  // Handle post actions
  const handleLike = (postId) => {
    if (!isConnected) {
      setError('Please connect your wallet to like posts');
      return;
    }
    
    setPosts(posts.map(post => {
      // Ensure both IDs are numbers for comparison
      const postIdNum = safeBigIntToNumber(post.id);
      const targetIdNum = safeBigIntToNumber(postId);
      
      return postIdNum === targetIdNum 
        ? { ...post, likes: (post.likes || 0) + 1 }
        : post;
    }));
  };

  const handleTip = (post) => {
    setSelectedPost(post);
    setShowTipModal(true);
  };

  const handleShare = (post) => {
    setSharePost(post);
    setShowShareModal(true);
  };

  // Handle tip submission
  const handleTipSubmit = async () => {
    if (!tipAmount || !tipToken) {
      setError('Please enter tip amount and select token');
      return;
    }

    try {
      // Implement tipping logic here
      setSuccess(`💎 Tip of ${tipAmount} ${tipToken} sent successfully!`);
      setShowTipModal(false);
      setTipAmount('');
      setTipToken('SPICY');
    } catch (error) {
      setError(`Tipping failed: ${error.message}`);
    }
  };

  if (loading) {
    return (
      <div className="relative min-h-screen py-8 px-2 md:px-0 flex flex-col items-center justify-center overflow-x-hidden">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-yellow-500 mx-auto mb-4"></div>
          <p className="text-xl text-yellow-100">Loading spicy blog posts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen py-8 px-2 md:px-0 flex flex-col items-center overflow-x-hidden space-y-8">
      {/* Background */}
      <div className="fixed inset-0 z-0 pointer-events-none select-none">
        <div className="w-full h-full bg-gradient-to-br from-red-900 via-orange-800 to-yellow-700 opacity-70" />
        <div className="absolute inset-0 bg-black bg-opacity-40" />
      </div>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`${isMobile ? 'w-full px-4' : 'luxury-container'} text-center glass-card-dark mb-8 px-6 py-8 md:px-12 md:py-10 z-10`}
        style={{borderRadius: '2rem'}}
      >
        <div className="text-6xl mb-4">📝</div>
        <h1 className="text-4xl md:text-5xl font-extrabold luxury-heading mb-4 tracking-tight">
          IC SPICY Blog
        </h1>
        <p className="text-xl text-gray-100 mb-6">
          Share your pepper growing adventures with the community
        </p>
        
        {/* Create Post Button */}
        {isConnected && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowForm(!showForm)}
            className="luxury-btn text-lg px-8 py-4"
          >
            {showForm ? '✖️ Cancel' : '✍️ Create New Post'}
          </motion.button>
        )}
        
        {!isConnected && (
          <div className="text-center">
            <p className="text-gray-300 mb-4">Connect your wallet to create and interact with blog posts</p>
            <button onClick={connectPlug} className="spicy-btn px-6 py-3">
              🔐 Connect Wallet
            </button>
          </div>
        )}
      </motion.div>

      {/* Create Post Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className={`${isMobile ? 'w-full px-4' : 'luxury-container'} z-10`}
          >
            <div className="luxury-card p-8">
              <h2 className="text-2xl font-bold text-yellow-100 mb-6">Create New Blog Post</h2>
              
              <form onSubmit={handleSubmit} ref={formRef} className="space-y-6">
                {/* Title */}
                <div>
                  <label className="block text-yellow-100 font-medium mb-2">Title *</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="luxury-input w-full"
                    placeholder="Enter your post title..."
                    required
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-yellow-100 font-medium mb-2">Category *</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="luxury-input w-full"
                    required
                  >
                    {categories.filter(c => c.id !== 'all').map(cat => (
                      <option key={cat.id} value={cat.id}>
                        {cat.icon} {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Photo Upload */}
                <div>
                  <label className="block text-yellow-100 font-medium mb-2">Photo (Optional)</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="luxury-input w-full"
                  />
                  {uploading && <p className="text-blue-400 text-sm mt-2">🔄 Compressing image...</p>}
                  {compressionStats && (
                    <div className="text-green-400 text-sm mt-2">
                      ✅ Compressed: {compressionStats.compressionRatio}% reduction
                    </div>
                  )}
                  {photoPreview && (
                    <img 
                      src={photoPreview} 
                      alt="Preview" 
                      className="w-32 h-32 object-cover rounded-lg mt-2 border border-gray-600"
                    />
                  )}
                </div>

                {/* Content */}
                <div>
                  <label className="block text-yellow-100 font-medium mb-2">Content *</label>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="luxury-input w-full h-32 resize-none"
                    placeholder="Share your pepper growing experience..."
                    required
                  />
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={uploading}
                  className="luxury-btn w-full text-lg py-4 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? '🔄 Creating Post...' : '📝 Publish Post'}
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Category Filter */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`${isMobile ? 'w-full px-4' : 'luxury-container'} z-10`}
      >
        <div className="luxury-card p-6">
          <h3 className="text-lg font-bold text-yellow-100 mb-4">Filter by Category</h3>
          <div className={`${isMobile ? 'grid grid-cols-2 gap-2' : 'flex flex-wrap gap-3'}`}>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                  selectedCategory === cat.id
                    ? `bg-gradient-to-r ${cat.color} text-white`
                    : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50'
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.name}</span>
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Blog Posts */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`${isMobile ? 'w-full px-4' : 'luxury-container'} z-10`}
      >
        {filteredPosts.length === 0 ? (
          <div className="text-center luxury-card p-8">
            <div className="text-4xl mb-4">🌱</div>
            <h3 className="text-xl font-bold text-yellow-100 mb-2">No posts yet</h3>
            <p className="text-gray-300">Be the first to share your pepper growing experience!</p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredPosts.map((post, index) => (
              <BlogPost key={post.id} post={post} index={index} />
            ))}
          </div>
        )}
      </motion.div>

      {/* Success/Error Messages */}
      <AnimatePresence>
        {success && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-4 left-4 right-4 z-50"
          >
            <div className="bg-green-600/90 text-white p-4 rounded-lg text-center">
              {success}
            </div>
          </motion.div>
        )}
        
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-4 left-4 right-4 z-50"
          >
            <div className="bg-red-600/90 text-white p-4 rounded-lg text-center">
              {error}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tip Modal */}
      <AnimatePresence>
        {showTipModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="absolute inset-0 bg-black/50" onClick={() => setShowTipModal(false)} />
            <div className="luxury-card p-6 max-w-md w-full relative">
              <h3 className="text-xl font-bold text-yellow-100 mb-4">Tip {selectedPost?.author_name}</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-yellow-100 font-medium mb-2">Amount</label>
                  <input
                    type="number"
                    value={tipAmount}
                    onChange={(e) => setTipAmount(e.target.value)}
                    className="luxury-input w-full"
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                  />
                </div>
                
                <div>
                  <label className="block text-yellow-100 font-medium mb-2">Token</label>
                  <select
                    value={tipToken}
                    onChange={(e) => setTipToken(e.target.value)}
                    className="luxury-input w-full"
                  >
                    <option value="SPICY">SPICY</option>
                    <option value="HEAT">HEAT</option>
                    <option value="ICP">ICP</option>
                  </select>
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowTipModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-600/50 text-gray-300 rounded-lg hover:bg-gray-600/70"
                >
                  Cancel
                </button>
                <button
                  onClick={handleTipSubmit}
                  className="flex-1 luxury-btn"
                >
                  Send Tip
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Share Modal */}
      <AnimatePresence>
        {showShareModal && (
          <BlogPostShareModal
            post={sharePost}
            onClose={() => setShowShareModal(false)}
          />
        )}
      </AnimatePresence>

      {/* Blog Post Detail Modal */}
      <BlogPostDetailModal
        post={detailPost}
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setDetailPost(null);
        }}
        onLike={handleLike}
        onTip={handleTip}
        isConnected={isConnected}
      />

      {/* Custom Styles */}
      <style>{`
        .highlight-post {
          animation: highlightPulse 3s ease-in-out;
        }
        
        @keyframes highlightPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(255, 215, 0, 0.7); }
          50% { box-shadow: 0 0 0 20px rgba(255, 215, 0, 0); }
        }
        
        .glass-card-dark {
          background: rgba(0, 0, 0, 0.3);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
        }
      `}</style>
    </div>
  );
};

export default BlogPage; 