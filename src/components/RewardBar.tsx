import { useStore } from '../data/StoreContext';
import { rewardProgress } from '../lists/stars';
import { useReward } from '../lists/useReward';

/** "⭐ 12 / 20 · Movie night" with a bar; the number is always in words, never colour alone. */
export function RewardBar({ personId }: { personId: string }) {
  const { reward } = useReward(useStore(), personId);
  const ready = reward.banked >= reward.target;
  return (
    <div className="reward" aria-label={`${reward.banked} of ${reward.target} stars for ${reward.label}`}>
      <span className="reward-text">
        <span aria-hidden="true">⭐</span> {reward.banked} / {reward.target} · {reward.label}{ready ? ' · ready!' : ''}
      </span>
      <span className="reward-bar" aria-hidden="true"><span style={{ width: `${rewardProgress(reward) * 100}%` }} /></span>
    </div>
  );
}
