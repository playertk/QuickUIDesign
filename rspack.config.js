/* eslint-disable @typescript-eslint/no-var-requires */
const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const CopyPlugin = require('copy-webpack-plugin')
const rspack = require('@rspack/core')
module.exports = {
  devtool: false,
  optimization: {
    chunkIds: 'deterministic',
    minimizer: [
      new rspack.SwcJsMinimizerRspackPlugin({
        minimizerOptions: {
          format: {
            comments: false
          }
        }
      }),
      new rspack.LightningCssMinimizerRspackPlugin({
        minimizerOptions: {
          errorRecovery: false
        }
      })
    ]
  },
  entry: {
    index: './src/pages/template/index.tsx',
  },
  plugins: [
    new HtmlWebpackPlugin({
      title: 'Index Page',
      filename: 'index.html',
      template: path.join(__dirname, 'public', 'index.html'),
      inject: 'body',
      chunks: ['index']
    }),

    new CopyPlugin({
      patterns: [
        {
          from: path.resolve(__dirname, 'public'),
          to: path.resolve(__dirname, 'dist'),
          filter: (source) => {
            return !source.includes('index.html')
          }
        }
      ]
    })
  ],

  devServer: {
    open: true,
    static: {
      directory: path.join(__dirname, 'dist')
    },
    hot: true,
    historyApiFallback: true,
    port: 3000
  },
  output: {
    filename: '[name]_bundle.js',
    path: path.resolve(__dirname, 'dist'),
    assetModuleFilename: 'images/[hash][ext][query]'
  },
  module: {
    rules: [
      {
        test: /\.txt$/,
        use: 'raw-loader'
      },
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: ['babel-loader']
      },
      {
        test: /\.(ts|tsx)$/,
        loader: 'ts-loader'
      },

      {
        test: /\.(png|jpg|gif|svg|avif)$/i,
        use: {
          loader: 'url-loader',
          options: {
            limit: 8192,
            name: 'images/[name].[hash:8].[ext]'
          }
        }
      },
      {
        test: /\.css$/i,
        include: path.resolve(__dirname, 'src'),
        use: [
          'style-loader',
          {
            loader: 'css-loader',
            options: {
              esModule: true
            }
          },
          'postcss-loader'
        ]
      }
    ]
  },
  // pass all js files through Babel
  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx'],
    alias: {
      '@': path.resolve(__dirname, './src'),
      'ue-connect': path.resolve(__dirname, './ue-connect')
    }
  }
}
