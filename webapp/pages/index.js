import dynamic from 'next/dynamic'
import Head from 'next/head'
import styles from '../styles/Home.module.css'

const Map = dynamic(
  () => import('../components/map'),
  { ssr: false }
)

export default function Home() {
  const position = [51.505, -0.09]

  return (
    <div className={styles.container}>
      <Head>
        <title>k3s clusters</title>
        <meta name="description" content="k3s clusters" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Map />
    </div>
  )
}
