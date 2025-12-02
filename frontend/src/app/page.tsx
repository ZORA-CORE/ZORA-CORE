'use client';

import { useEffect, useState } from 'react';
import { PageShell } from '@/components/ui/PageShell';
import { HeroSection } from '@/components/ui/HeroSection';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { ValueCard } from '@/components/ui/ValueCard';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { getPublicProducts, getPublicMashupStats } from '@/lib/api';
import type { PublicProduct, PublicMashupStats } from '@/lib/types';
import { getToken } from '@/lib/auth';

const AGENTS = [
  { id: 'odin', name: 'ODIN', role: 'Chief Strategist & Research Lead', color: 'primary' },
  { id: 'thor', name: 'THOR', role: 'Backend & Infra Engineer', color: 'secondary' },
  { id: 'freya', name: 'FREYA', role: 'Humans, Storytelling & Growth', color: 'accent' },
  { id: 'baldur', name: 'BALDUR', role: 'Frontend, UX & Product', color: 'primary' },
  { id: 'heimdall', name: 'HEIMDALL', role: 'Observability & Monitoring', color: 'secondary' },
  { id: 'tyr', name: 'TYR', role: 'Ethics, Safety & Climate Integrity', color: 'accent' },
  { id: 'eivor', name: 'EIVOR', role: 'Memory & Knowledge', color: 'primary' },
];

const FAQ_ITEMS = [
  {
    question: 'What is ZORA CORE?',
    answer: 'ZORA CORE is a multi-agent, climate-first AI Operating System. It combines 6 specialized AI agents to help individuals and organizations take meaningful climate action.',
  },
  {
    question: 'How does the Mashup Shop work?',
    answer: 'The Mashup Shop features climate-aligned cross-brand collaborations. Every product is climate-neutral or climate-positive, with transparent impact metrics.',
  },
  {
    question: 'What is Climate OS?',
    answer: 'Climate OS is your personal climate dashboard. Track your climate profile, complete missions, and see your real impact over time.',
  },
  {
    question: 'Is ZORA CORE free to use?',
    answer: 'The public Mashup Shop is free to browse. Climate OS and advanced features require an account.',
  },
];

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    // Initialize auth state synchronously to avoid effect warning
    if (typeof window !== 'undefined') {
      const token = getToken();
      return !!token;
    }
    return false;
  });
  const [products, setProducts] = useState<PublicProduct[]>([]);
  const [stats, setStats] = useState<PublicMashupStats | null>(null);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  useEffect(() => {
    // Re-check auth on mount (for SSR hydration)
    const token = getToken();
    if (!!token !== isAuthenticated) {
      setIsAuthenticated(!!token);
    }

    async function loadPublicData() {
      try {
        const [productsRes, statsRes] = await Promise.all([
          getPublicProducts(),
          getPublicMashupStats(),
        ]);
        setProducts(productsRes.data.slice(0, 3));
        setStats(statsRes);
      } catch (error) {
        console.error('Failed to load public data:', error);
      }
    }

    loadPublicData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <PageShell isAuthenticated={isAuthenticated}>
      <HeroSection
        badge="Climate-First AI"
        headline="The AI Operating System for Climate Action"
        subheadline="ZORA CORE combines 6 specialized AI agents to help you understand, track, and reduce your climate impact. No greenwashing, just honest tools for real change."
        primaryCta={{ label: 'Explore Mashups', href: '/mashups' }}
        secondaryCta={{ label: 'Sign In', href: '/login' }}
        size="lg"
      />

      <section className="py-16 border-t border-[var(--card-border)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <ValueCard
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              }
              title="No Greenwashing"
              description="Honest, traceable climate claims backed by real data"
              variant="primary"
            />
            <ValueCard
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              }
              title="6 AI Agents"
              description="Specialized agents working together for your climate goals"
              variant="secondary"
            />
            <ValueCard
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
              title="Climate-First"
              description="Every feature supports real climate action"
              variant="accent"
            />
            <ValueCard
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              }
              title="Track Progress"
              description="See your real impact with clear metrics"
              variant="primary"
            />
          </div>
        </div>
      </section>

      <section className="py-20 bg-[var(--card-bg)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeader
            badge="For Everyone"
            title="Who is ZORA CORE for?"
            subtitle="Whether you're an individual, a business, or a brand, ZORA CORE helps you take meaningful climate action."
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card variant="bordered" padding="lg" className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--primary)]/10 flex items-center justify-center">
                <svg className="w-8 h-8 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-[var(--foreground)] mb-2">Individuals</h3>
              <p className="text-[var(--foreground)]/60">Track your personal climate footprint and discover actionable missions to reduce your impact.</p>
            </Card>

            <Card variant="bordered" padding="lg" className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--secondary)]/10 flex items-center justify-center">
                <svg className="w-8 h-8 text-[var(--secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-[var(--foreground)] mb-2">Organizations</h3>
              <p className="text-[var(--foreground)]/60">Manage your organization&apos;s climate profile and coordinate team-wide sustainability initiatives.</p>
            </Card>

            <Card variant="bordered" padding="lg" className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--accent)]/10 flex items-center justify-center">
                <svg className="w-8 h-8 text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-[var(--foreground)] mb-2">Brands</h3>
              <p className="text-[var(--foreground)]/60">Create climate-aligned products and collaborate with other brands in the Mashup Shop.</p>
            </Card>
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeader
            badge="The Team"
            title="Meet the 6 ZORA Agents"
            subtitle="Each agent specializes in a different aspect of the climate-first AI experience."
          />

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {AGENTS.map((agent) => (
              <Card key={agent.id} variant="default" padding="md" hoverable href="/agents">
                <div className={`w-10 h-10 rounded-lg mb-3 flex items-center justify-center text-white font-bold text-sm ${
                  agent.color === 'primary' ? 'bg-[var(--primary)]' :
                  agent.color === 'secondary' ? 'bg-[var(--secondary)]' :
                  'bg-[var(--accent)]'
                }`}>
                  {agent.name.charAt(0)}
                </div>
                <h4 className="font-semibold text-[var(--foreground)] text-sm">{agent.name}</h4>
                <p className="text-xs text-[var(--foreground)]/60">{agent.role}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {products.length > 0 && (
        <section className="py-20 bg-[var(--card-bg)]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <SectionHeader
              badge="Mashup Shop"
              title="Climate-Aligned Products"
              subtitle="Discover cross-brand collaborations that are climate-neutral or climate-positive."
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {products.map((product) => {
                const brands = product.product_brands
                  ?.map((pb) => {
                    const brand = Array.isArray(pb.brand) ? pb.brand[0] : pb.brand;
                    return brand;
                  })
                  .filter((b): b is NonNullable<typeof b> => b !== null) || [];

                return (
                  <Card key={product.id} variant="default" padding="md" hoverable href="/mashups">
                    <div className="aspect-[4/3] bg-[var(--card-border)] rounded-lg mb-4 overflow-hidden">
                      {product.primary_image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={product.primary_image_url}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[var(--foreground)]/20">
                          <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {brands.slice(0, 2).map((brand) => (
                        <span key={brand.id} className="text-xs px-2 py-0.5 rounded-full bg-[var(--secondary)]/10 text-[var(--secondary)]">
                          {brand.name}
                        </span>
                      ))}
                    </div>
                    <h3 className="font-semibold text-[var(--foreground)] mb-1">{product.name}</h3>
                    {product.short_description && (
                      <p className="text-sm text-[var(--foreground)]/60 line-clamp-2">{product.short_description}</p>
                    )}
                  </Card>
                );
              })}
            </div>

            <div className="text-center">
              <Button href="/mashups" variant="primary" size="lg">
                View All Products
              </Button>
            </div>
          </div>
        </section>
      )}

      {stats && (
        <section className="py-16 border-t border-[var(--card-border)]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              <div>
                <div className="text-4xl font-bold text-[var(--primary)] mb-2">{stats.products_count}</div>
                <div className="text-sm text-[var(--foreground)]/60">Climate Products</div>
              </div>
              <div>
                <div className="text-4xl font-bold text-[var(--secondary)] mb-2">{stats.brands_count}</div>
                <div className="text-sm text-[var(--foreground)]/60">Partner Brands</div>
              </div>
              <div>
                <div className="text-4xl font-bold text-[var(--accent)] mb-2">{stats.sectors.length}</div>
                <div className="text-sm text-[var(--foreground)]/60">Sectors</div>
              </div>
              <div>
                <div className="text-4xl font-bold text-[var(--primary)] mb-2">{stats.countries.length}</div>
                <div className="text-sm text-[var(--foreground)]/60">Countries</div>
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeader
            title="Frequently Asked Questions"
            subtitle="Everything you need to know about ZORA CORE."
          />

          <div className="space-y-4">
            {FAQ_ITEMS.map((item, index) => (
              <div
                key={index}
                className="border border-[var(--card-border)] rounded-xl overflow-hidden"
              >
                <button
                  className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-[var(--card-bg)] transition-colors"
                  onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                >
                  <span className="font-medium text-[var(--foreground)]">{item.question}</span>
                  <svg
                    className={`w-5 h-5 text-[var(--foreground)]/40 transition-transform ${expandedFaq === index ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {expandedFaq === index && (
                  <div className="px-6 pb-4 text-[var(--foreground)]/60">
                    {item.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-[var(--primary)]/5 border-t border-[var(--primary)]/20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-[var(--foreground)] mb-4">
            Ready to take climate action?
          </h2>
          <p className="text-lg text-[var(--foreground)]/60 mb-8 max-w-2xl mx-auto">
            Join ZORA CORE today and start your journey towards a more sustainable future. No greenwashing, just honest tools for real change.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button href="/mashups" variant="primary" size="lg">
              Explore Mashups
            </Button>
            <Button href="/login" variant="outline" size="lg">
              Sign In
            </Button>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
