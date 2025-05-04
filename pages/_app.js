import { DefaultSeo } from 'next-seo';
import '../styles/globals.css';

const seoConfig = {
  defaultTitle: 'ちょうどいい投票アプリ',
  description: '2〜4択の手軽な投票をすぐに始められます。QRコードで投票を共有でき、24時間で自動終了します。',
  canonical: 'https://votejam.vercel.app',
  openGraph: {
    type: 'website',
    locale: 'ja_JP',
    url: 'https://votejam.vercel.app',
    siteName: 'ちょうどいい投票アプリ',
    title: 'ちょうどいい投票アプリ',
    description: '2〜4択の手軽な投票をすぐに始められます。QRコードで投票を共有でき、24時間で自動終了します。',
    images: [
      {
        url: 'https://votejam.vercel.app/ogp.png',
        width: 1200,
        height: 630,
        alt: 'ちょうどいい投票アプリ',
      },
    ],
  },
  twitter: {
    handle: '@handle',
    site: '@site',
    cardType: 'summary_large_image',
  },
  additionalMetaTags: [
    {
      name: 'application-name',
      content: 'ちょうどいい投票アプリ'
    },
    {
      name: 'apple-mobile-web-app-capable',
      content: 'yes'
    },
    {
      name: 'apple-mobile-web-app-status-bar-style',
      content: 'default'
    },
    {
      name: 'apple-mobile-web-app-title',
      content: 'ちょうどいい投票アプリ'
    },
    {
      name: 'format-detection',
      content: 'telephone=no'
    },
    {
      name: 'mobile-web-app-capable',
      content: 'yes'
    },
    {
      name: 'theme-color',
      content: '#16A34A'
    }
  ],
};

function MyApp({ Component, pageProps }) {
  return (
    <>
      <DefaultSeo {...seoConfig} />
      <Component {...pageProps} />
    </>
  );
}

export default MyApp;
