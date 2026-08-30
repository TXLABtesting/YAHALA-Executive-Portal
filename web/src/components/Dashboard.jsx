import { fmtNum, todayLabel } from '../lib/format.js';
import { SectionHead, SegGroup } from './common.jsx';
import { KpiGrid, KpiRail } from './dashboard/Kpis.jsx';
import { SpotlightCompact, SpotlightHero } from './dashboard/Spotlight.jsx';
import {
  AccommodationCard,
  CategoryGrid,
  CategoryTiles,
  LaunchGrid,
  LaunchList,
  NewslettersGrid,
  RedeemersBlockA,
  RedeemersBlockB,
  UpdatesPanel,
} from './dashboard/Panels.jsx';

const LAYOUTS = [
  { value: 'A', label: 'Editorial' },
  { value: 'B', label: 'Command' },
];

export default function Dashboard({
  data,
  loading,
  layout,
  onLayout,
  spot,
  pool,
  spotlightIndex,
  onSpotlightIndex,
  pinned,
  onOpenCategory,
  onOpenRedeemers,
  onKpiClick,
}) {
  const { merchants, kpis, launches, updates, newsletters, redeemers, accommodation } = data;
  const activeIndex = pool.length ? spotlightIndex % pool.length : 0;

  const spotlightProps = {
    merchant: spot,
    pool,
    activeIndex,
    pinned,
    onSelect: onSpotlightIndex,
  };

  return (
    <main className="page">
      <div className="dash-head">
        <div className="dash-date">{todayLabel()}</div>
        <div className="layout-switch">
          <span>LAYOUT</span>
          <SegGroup options={LAYOUTS} value={layout} onChange={onLayout} />
        </div>
      </div>

      {loading && merchants.length === 0 ? (
        <div className="app-loading" style={{ minHeight: '40vh' }}>
          <div className="spinner" />
          <span>Loading data</span>
        </div>
      ) : layout === 'B' ? (
        <div className="stack-tight">
          <div
            className="grid-b-main"
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0,1.7fr) minmax(0,1fr)',
              gap: 22,
              alignItems: 'stretch',
            }}
          >
            <div className="stack-tight" style={{ animation: 'none' }}>
              {spot && <SpotlightCompact {...spotlightProps} />}

              <div id="categories-section">
                <SectionHead title="Merchant Categories" />
                <CategoryTiles merchants={merchants} onOpen={onOpenCategory} />
              </div>

              <div>
                <SectionHead
                  title="Upcoming Launches"
                  note={`${launches.length} in pipeline`}
                />
                <LaunchList launches={launches} />
              </div>
            </div>

            <div className="stack-tight" style={{ animation: 'none' }}>
              <KpiRail kpis={kpis} onKpiClick={onKpiClick} />
              <div style={{ marginTop: 'auto' }}>
                <SectionHead title="Recent Updates" />
                <UpdatesPanel updates={updates} compact />
              </div>
            </div>
          </div>

          <div
            className="grid-split-stretch"
            style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))' }}
          >
            <div className="col">
              <RedeemersBlockB redeemers={redeemers} onViewAll={onOpenRedeemers} />
            </div>
            <div className="col" style={{ display: 'flex', flexDirection: 'column' }}>
              <SectionHead title="Accommodation Requests & Inquiries" />
              <AccommodationCard total={accommodation.total} />
            </div>
          </div>

          <div>
            <SectionHead
              title="Marketing Newsletters"
              note={`${newsletters.length} issues in the library`}
            />
            <NewslettersGrid newsletters={newsletters} />
          </div>
        </div>
      ) : (
        <div className="stack">
          <KpiGrid kpis={kpis} merchants={merchants} onKpiClick={onKpiClick} />

          {spot && <SpotlightHero {...spotlightProps} />}

          <div className="grid-split">
            <div className="col-span-2">
              <SectionHead title="Upcoming Launches" note={`${launches.length} in pipeline`} />
              <LaunchGrid launches={launches} />
            </div>
            <div className="col">
              <SectionHead title="Recent Updates" />
              <UpdatesPanel updates={updates} />
            </div>
          </div>

          <div id="categories-section">
            <SectionHead
              title="Merchant Categories"
              note={`${fmtNum(kpis.merchants)} merchants across 6 categories`}
            />
            <CategoryGrid merchants={merchants} onOpen={onOpenCategory} />
          </div>

          <div className="grid-split-stretch">
            <div className="col-span-2">
              <RedeemersBlockA redeemers={redeemers} onViewAll={onOpenRedeemers} />
            </div>
            <div className="col" style={{ display: 'flex', flexDirection: 'column' }}>
              <SectionHead title="Accommodation" />
              <AccommodationCard total={accommodation.total} />
            </div>
          </div>

          <div>
            <SectionHead
              title="Marketing Newsletters"
              note={`${newsletters.length} issues in the library`}
            />
            <NewslettersGrid newsletters={newsletters} />
          </div>
        </div>
      )}
    </main>
  );
}
