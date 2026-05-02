import { Globe, BellRing, LineChart } from 'lucide-react'
import { FeatureCard } from './FeatureCard'

export function Hero() {
  return (
    <section className="flex-1 flex flex-col items-center text-center px-4 sm:px-6 lg:px-8 pt-12 sm:pt-16 pb-12 sm:pb-16 bg-gradient-to-b from-orange-50 via-background to-background dark:from-transparent">
      <h1 className="text-3xl sm:text-5xl font-semibold leading-tight sm:leading-[1.1] tracking-tight max-w-2xl">
        Never miss a price drop
      </h1>
      <p className="mt-4 text-base leading-relaxed text-muted-foreground max-w-xl">
        Paste any product URL. We&apos;ll check the price daily and email you
        the moment it drops.
      </p>
      <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 w-full max-w-5xl">
        <FeatureCard
          icon={Globe}
          title="Multi-site support"
          blurb="Track products from any e-commerce site in the world."
        />
        <FeatureCard
          icon={BellRing}
          title="Instant email alerts"
          blurb="Get an email the moment a price drops."
        />
        <FeatureCard
          icon={LineChart}
          title="Price history"
          blurb="See every price change on a clean chart."
        />
      </div>
    </section>
  )
}
