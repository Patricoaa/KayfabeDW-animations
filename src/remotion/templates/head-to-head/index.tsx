import {useCurrentFrame, useVideoConfig, interpolate, spring} from 'remotion';

export type HeadToHeadProps = {
  wrestlerA: string;
  wrestlerB: string;
  winsA: number;
  winsB: number;
  draws?: number;
  titleA?: string;
  titleB?: string;
};

export const HeadToHead: React.FC<HeadToHeadProps> = ({
  wrestlerA,
  wrestlerB,
  winsA,
  winsB,
  draws = 0,
  titleA,
  titleB,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const total = winsA + winsB + draws;
  const pctA = total > 0 ? (winsA / total) * 100 : 50;
  const pctB = total > 0 ? (winsB / total) * 100 : 50;

  const progressA = spring({fps, frame, config: {damping: 15, stiffness: 40}});
  const progressB = spring({fps, frame: frame - 5, config: {damping: 15, stiffness: 40}});

  const vsOpacity = interpolate(frame, [0, 20], [0, 1], {extrapolateRight: 'clamp'});
  const titleAOps = interpolate(frame, [10, 30], [0, 1], {extrapolateRight: 'clamp'});
  const titleBOps = interpolate(frame, [10, 30], [0, 1], {extrapolateRight: 'clamp'});
  const barA = interpolate(progressA, [0, 1], [0, pctA]);
  const barB = interpolate(progressB, [0, 1], [0, pctB]);

  const winsAOps = interpolate(frame, [20, 40], [0, 1], {extrapolateRight: 'clamp'});
  const winsBOps = interpolate(frame, [20, 40], [0, 1], {extrapolateRight: 'clamp'});

  const countWinsA = Math.round(interpolate(frame, [20, 60], [0, winsA], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  }));
  const countWinsB = Math.round(interpolate(frame, [20, 60], [0, winsB], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  }));

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: '#0a0a0a',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Inter', sans-serif",
        padding: 80,
        boxSizing: 'border-box',
      }}
    >
      <div style={{display: 'flex', width: '100%', alignItems: 'center', gap: 60}}>
        <div style={{flex: 1, textAlign: 'right'}}>
          <div style={{opacity: titleAOps, fontSize: 48, fontWeight: 800, color: '#3b82f6', marginBottom: 8}}>
            {wrestlerA}
          </div>
          {titleA && (
            <div style={{opacity: titleAOps, fontSize: 20, color: '#94a3b8'}}>
              {titleA}
            </div>
          )}
        </div>

        <div style={{opacity: vsOpacity, fontSize: 72, fontWeight: 900, color: '#ffffff20'}}>
          VS
        </div>

        <div style={{flex: 1, textAlign: 'left'}}>
          <div style={{opacity: titleBOps, fontSize: 48, fontWeight: 800, color: '#ef4444', marginBottom: 8}}>
            {wrestlerB}
          </div>
          {titleB && (
            <div style={{opacity: titleBOps, fontSize: 20, color: '#94a3b8'}}>
              {titleB}
            </div>
          )}
        </div>
      </div>

      <div style={{width: '100%', marginTop: 80}}>
        <div style={{display: 'flex', height: 80, borderRadius: 12, overflow: 'hidden', backgroundColor: '#1a1a1a'}}>
          <div style={{
            width: `${barA}%`,
            backgroundColor: '#3b82f6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 30px #3b82f640',
          }}>
            <span style={{opacity: winsAOps, fontSize: 36, fontWeight: 800, color: '#fff'}}>
              {countWinsA}
            </span>
          </div>
          {draws > 0 && (
            <div style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#333',
            }}>
              <span style={{fontSize: 24, fontWeight: 600, color: '#999'}}>
                {draws}
              </span>
            </div>
          )}
          <div style={{
            width: `${barB}%`,
            backgroundColor: '#ef4444',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 30px #ef444440',
          }}>
            <span style={{opacity: winsBOps, fontSize: 36, fontWeight: 800, color: '#fff'}}>
              {countWinsB}
            </span>
          </div>
        </div>

        <div style={{display: 'flex', justifyContent: 'space-between', marginTop: 20}}>
          <span style={{opacity: winsAOps, fontSize: 24, fontWeight: 600, color: '#3b82f6'}}>
            {Math.round(pctA)}% victorias
          </span>
          <span style={{opacity: winsBOps, fontSize: 24, fontWeight: 600, color: '#ef4444'}}>
            {Math.round(pctB)}% victorias
          </span>
        </div>
      </div>
    </div>
  );
};
