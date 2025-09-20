const webpack = require('webpack');
const TerserPlugin = require('terser-webpack-plugin');
const CompressionPlugin = require('compression-webpack-plugin');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

module.exports = {
  webpack: {
    configure: (webpackConfig, { env, paths }) => {
      // Production optimizations
      if (env === 'production') {
        // Disable source maps to reduce bundle size significantly
        webpackConfig.devtool = false;
        
        // Ultra-aggressive bundle splitting for better caching
        webpackConfig.optimization = {
          ...webpackConfig.optimization,
          splitChunks: {
            chunks: 'all',
            maxInitialRequests: 15,
            minSize: 15000,
            maxSize: 200000, // 200KB chunks
            cacheGroups: {
              vendor: {
                test: /[\\/]node_modules[\\/]/,
                name: 'vendors',
                priority: 10,
                chunks: 'all',
                enforce: true,
              },
              common: {
                name: 'common',
                minChunks: 2,
                priority: 5,
                chunks: 'all',
                enforce: true,
              },
              // Separate large libraries
              dfinity: {
                test: /[\\/]node_modules[\\/]@dfinity[\\/]/,
                name: 'dfinity',
                priority: 20,
                chunks: 'all',
              },
              phantom: {
                test: /[\\/]node_modules[\\/]@phantom[\\/]/,
                name: 'phantom',
                priority: 20,
                chunks: 'all',
              },
              solana: {
                test: /[\\/]node_modules[\\/]@solana[\\/]/,
                name: 'solana',
                priority: 20,
                chunks: 'all',
              },
              sui: {
                test: /[\\/]node_modules[\\/]@mysten[\\/]/,
                name: 'sui',
                priority: 20,
                chunks: 'all',
              },
              walletconnect: {
                test: /[\\/]node_modules[\\/]@walletconnect[\\/]/,
                name: 'walletconnect',
                priority: 20,
                chunks: 'all',
              },
              bitcoin: {
                test: /[\\/]node_modules[\\/]bitcoinjs-lib[\\/]/,
                name: 'bitcoin',
                priority: 20,
                chunks: 'all',
              },
              react: {
                test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
                name: 'react',
                priority: 30,
                chunks: 'all',
              },
              framer: {
                test: /[\\/]node_modules[\\/]framer-motion[\\/]/,
                name: 'framer',
                priority: 20,
                chunks: 'all',
              }
            }
          },
          // Aggressive minification
          minimize: true,
          minimizer: [
            new TerserPlugin({
              terserOptions: {
                compress: {
                  drop_console: true,
                  drop_debugger: true,
                  pure_funcs: ['console.log', 'console.info', 'console.debug'],
                  passes: 2
                },
                mangle: {
                  safari10: true
                },
                output: {
                  comments: false
                }
              },
              extractComments: false
            })
          ]
        };

        // Add compression plugin for gzip
        webpackConfig.plugins.push(
          new CompressionPlugin({
            algorithm: 'gzip',
            test: /\.(js|css|html|svg)$/,
            threshold: 10240,
            minRatio: 0.8
          })
        );

        // Add bundle analyzer in production (optional)
        if (process.env.ANALYZE === 'true') {
          webpackConfig.plugins.push(
            new BundleAnalyzerPlugin({
              analyzerMode: 'static',
              openAnalyzer: false,
              reportFilename: 'bundle-report.html'
            })
          );
        }

        // Tree shaking optimizations
        webpackConfig.resolve.alias = {
          ...webpackConfig.resolve.alias
        };
      }

      // Add polyfills for Node.js globals
      webpackConfig.resolve.fallback = {
        ...webpackConfig.resolve.fallback,
        "buffer": require.resolve("buffer"),
        "process": require.resolve("process"),
        "crypto": require.resolve("crypto-browserify"),
        "stream": require.resolve("stream-browserify"),
        "util": require.resolve("util"),
        "assert": require.resolve("assert"),
        "os": require.resolve("os-browserify/browser"),
        "path": require.resolve("path-browserify"),
        "fs": false,
        "net": false,
        "tls": false
      };

      // Add plugins for polyfills
      webpackConfig.plugins.push(
        new webpack.ProvidePlugin({
          Buffer: ['buffer', 'Buffer'],
          process: 'process'
        })
      );

      return webpackConfig;
    }
  }
};
