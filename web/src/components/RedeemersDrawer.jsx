import { Icon } from '../lib/icons.jsx';
import { fmtNum, initials } from '../lib/format.js';
import { DrawerHead, Overlay } from './common.jsx';
import { rankClass } from './dashboard/Panels.jsx';

export default function RedeemersDrawer({ redeemers, onClose }) {
  return (
    <Overlay onClose={onClose}>
      <div className="drawer is-narrow">
        <DrawerHead
          icon={<Icon name="trophy" size={22} stroke={1.7} />}
          iconGold
          title="Top Redeemers"
          sub={`${redeemers.length} members · ranked by redemptions`}
          onClose={onClose}
        />
        <div className="drawer-body">
          <div className="table-card">
            <div className="table-head">
              <span style={{ width: 26 }}>#</span>
              <span className="flex-1">User Name</span>
              <span>Redemptions</span>
            </div>
            {redeemers.map((r, i) => (
              <div key={r.id} className="table-row">
                <span className={rankClass(i)}>{i + 1}</span>
                <span className="avatar-sm">{initials(r.name)}</span>
                <span
                  className="red-name"
                  style={{ fontSize: 14 }}
                >
                  {r.name}
                </span>
                <span className="red-value">{fmtNum(r.redemptions)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Overlay>
  );
}
