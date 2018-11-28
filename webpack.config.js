'use strict';

const path = require('path');
const webpack = require('webpack');
const CleanWebpackPlugin = require('clean-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');

const packageJson = require('./package.json');

module.exports = env => {
  const config = {
    entry: ['./src/main.ts'],
    mode: env.mode,
    target: 'node',
    devtool: false,
    node: {
      __dirname: false, // Fix for native node __dirname
      __filename: false // Fix for native node __filename
    },
    output: {
      filename: packageJson.name + '.js',
      path: path.resolve(__dirname, 'dist'),
    },
    resolve: {
      extensions: ['.ts', '.js'],
      modules: ['node_modules', 'src']
    },
    stats: {
      modules: false, // We don't need to see this
      warningsFilter: /^(?!CriticalDependenciesWarning$)/
    },
    optimization: {
      minimizer: [
        new TerserPlugin({
          parallel: true,
          terserOptions: {
            keep_fnames: true
          }
        })
      ]
    },
    module: {
      rules: [
        {
          test: /\.ts$/,
          use: 'ts-loader'
        }
      ]
    },
    plugins: [
      new CleanWebpackPlugin(['./dist']),
      new webpack.DefinePlugin({
        VERSION: JSON.stringify(packageJson.version),
        DEVELOP: env.mode === 'development'
      }),
      new webpack.NormalModuleReplacementPlugin(/config.ts/, env.mode === 'production' ? 'config.ts' : 'config.hidden.ts')
    ],
  };

  if (env.analyse) {
    const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
    config.plugins.push(new BundleAnalyzerPlugin({
      analyzerMode: 'static' // Generates file instead of starting a web server
    }));
  }

  return config;
};
