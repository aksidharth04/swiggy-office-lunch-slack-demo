import React from 'react';
import {
  AbsoluteFill,
  Easing,
  Img,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
} from 'remotion';

export const VIDEO_WIDTH = 1920;
export const VIDEO_HEIGHT = 1080;
export const VIDEO_FPS = 30;
export const VIDEO_DURATION_FRAMES = 450;

const palette = {
  paper: '#f7f3ea',
  panel: '#fffdf8',
  ink: '#211f1c',
  muted: '#706a60',
  faint: 'rgba(33,31,28,0.12)',
  accent: '#bd6742',
  green: '#55705d',
  charcoal: '#28241f',
};

const font = {
  sans: '"Satoshi", "Geist", "Aptos", ui-sans-serif, system-ui, sans-serif',
  mono: '"JetBrains Mono", "SFMono-Regular", Consolas, monospace',
};

const ease = Easing.bezier(0.16, 1, 0.3, 1);

const fade = (frame, start = 0, duration = 36) =>
  interpolate(frame, [start, start + duration], [0, 1], {
    easing: ease,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

const exitFade = (frame, start, duration = 30) =>
  interpolate(frame, [start, start + duration], [1, 0], {
    easing: Easing.in(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

const Shell = ({children}) => {
  return (
    <AbsoluteFill style={{backgroundColor: palette.paper, color: palette.ink, fontFamily: font.sans}}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'linear-gradient(rgba(33,31,28,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(33,31,28,0.035) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          opacity: 0.9,
        }}
      />
      <div style={{position: 'absolute', inset: 64, border: `1px solid ${palette.faint}`}} />
      {children}
    </AbsoluteFill>
  );
};

const Eyebrow = ({children}) => (
  <div
    style={{
      color: palette.accent,
      fontFamily: font.mono,
      fontSize: 24,
      fontWeight: 700,
      letterSpacing: 2.2,
      textTransform: 'uppercase',
    }}
  >
    {children}
  </div>
);

const Caption = ({children}) => (
  <div
    style={{
      position: 'absolute',
      left: 96,
      bottom: 68,
      color: palette.muted,
      fontFamily: font.mono,
      fontSize: 24,
      letterSpacing: 0,
      maxWidth: 980,
    }}
  >
    {children}
  </div>
);

const Progress = ({frame}) => (
  <div
    style={{
      position: 'absolute',
      right: 96,
      bottom: 78,
      width: 280,
      height: 3,
      backgroundColor: 'rgba(33,31,28,0.1)',
    }}
  >
    <div
      style={{
        width: `${interpolate(frame, [0, VIDEO_DURATION_FRAMES], [0, 100], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        })}%`,
        height: '100%',
        backgroundColor: palette.accent,
      }}
    />
  </div>
);

const SceneTitle = () => {
  const frame = useCurrentFrame();
  const opacity = fade(frame, 0, 14) * exitFade(frame, 34, 10);
  const y = interpolate(frame, [0, 14], [18, 0], {
    easing: ease,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <Shell>
      <div
        style={{
          position: 'absolute',
          left: 150,
          top: 210,
          width: 880,
          opacity,
          transform: `translateY(${y}px)`,
        }}
      >
        <Eyebrow>Swiggy Office Lunch</Eyebrow>
        <h1
          style={{
            margin: '36px 0 28px',
            fontSize: 116,
            lineHeight: 0.92,
            letterSpacing: -6,
            fontWeight: 760,
          }}
        >
          Group lunch, inside Slack.
        </h1>
        <p style={{margin: 0, color: palette.muted, fontSize: 34, lineHeight: 1.32, width: 760}}>
          A Slack-native prototype for collecting choices, enforcing policy, and placing a mock office meal order.
        </p>
      </div>
      <div
        style={{
          position: 'absolute',
          right: 164,
          top: 228,
          width: 470,
          height: 560,
          borderRadius: 36,
          backgroundColor: palette.panel,
          border: `1px solid ${palette.faint}`,
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.75), 0 42px 90px -62px rgba(33,31,28,0.7)',
          opacity,
          transform: `translateY(${-y}px) rotate(-2deg)`,
          overflow: 'hidden',
        }}
      >
        <div style={{height: 82, backgroundColor: palette.charcoal, color: palette.panel, display: 'flex', alignItems: 'center', paddingLeft: 34, gap: 18, fontSize: 26, fontWeight: 700}}>
          <div style={{width: 28, height: 28, borderRadius: 9, backgroundColor: palette.accent}} />
          Slack workflow
        </div>
        <div style={{padding: 34, display: 'grid', gap: 22}}>
          {['Slash command received', 'Choices collected', 'Cart locked', 'Mock order placed'].map((item, index) => (
            <div key={item} style={{display: 'grid', gridTemplateColumns: '36px 1fr', gap: 16, alignItems: 'center'}}>
              <div style={{width: 18, height: 18, borderRadius: 99, backgroundColor: index === 3 ? palette.green : palette.accent, marginLeft: 8}} />
              <div style={{fontFamily: font.mono, fontSize: 20, color: index === 3 ? palette.ink : palette.muted}}>{item}</div>
            </div>
          ))}
        </div>
      </div>
    </Shell>
  );
};

const ProblemScene = () => {
  const frame = useCurrentFrame();
  const opacity = fade(frame, 0, 36) * exitFade(frame, 220, 30);

  const rows = [
    ['01', 'Lunch coordination lives in chat, but the work becomes manual.'],
    ['02', 'Budget and dietary rules are simple to say, harder to enforce.'],
    ['03', 'The final approval step needs a clear owner before placement.'],
  ];

  return (
    <Shell>
      <div style={{position: 'absolute', left: 140, top: 160, opacity}}>
        <Eyebrow>Problem</Eyebrow>
        <h2 style={{margin: '32px 0 0', width: 760, fontSize: 76, lineHeight: 0.98, letterSpacing: -4.2}}>
          Office lunch is operational work hiding in messages.
        </h2>
      </div>
      <div style={{position: 'absolute', right: 130, top: 190, width: 720, opacity}}>
        {rows.map(([number, text], index) => {
          const itemOpacity = fade(frame, 18 + index * 14, 32);
          const itemY = interpolate(itemOpacity, [0, 1], [18, 0]);
          return (
            <div
              key={number}
              style={{
                display: 'grid',
                gridTemplateColumns: '90px 1fr',
                gap: 24,
                padding: '38px 0',
                borderTop: `1px solid ${palette.faint}`,
                opacity: itemOpacity,
                transform: `translateY(${itemY}px)`,
              }}
            >
              <div style={{fontFamily: font.mono, color: palette.accent, fontSize: 25, fontWeight: 700}}>{number}</div>
              <div style={{fontSize: 38, lineHeight: 1.16, letterSpacing: -1.2}}>{text}</div>
            </div>
          );
        })}
      </div>
      <Caption>The demo does not ask users to leave Slack.</Caption>
    </Shell>
  );
};

const ArchitectureScene = () => {
  const frame = useCurrentFrame();
  const opacity = fade(frame, 0, 22) * exitFade(frame, 96, 18);
  const steps = [
    ['Slack', 'Signed command and button payloads'],
    ['Tunnel', 'Public HTTPS route for local review'],
    ['Node', 'Signature verification and state handling'],
    ['Mock Swiggy', 'Provider-safe order placement boundary'],
  ];

  return (
    <Shell>
      <div style={{position: 'absolute', left: 132, top: 126, opacity}}>
        <Eyebrow>Architecture</Eyebrow>
        <h2 style={{margin: '30px 0 0', width: 900, fontSize: 64, lineHeight: 1, letterSpacing: -3.2}}>
          Real Slack requests, a local backend, and a safe provider boundary.
        </h2>
      </div>
      <div style={{position: 'absolute', left: 132, right: 132, top: 520, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 18, opacity}}>
        {steps.map(([title, copy], index) => {
          const itemOpacity = fade(frame, 12 + index * 8, 20);
          return (
            <div
              key={title}
              style={{
                minHeight: 230,
                border: `1px solid ${palette.faint}`,
                borderRadius: 30,
                backgroundColor: 'rgba(255,253,248,0.78)',
                padding: 30,
                opacity: itemOpacity,
                transform: `translateY(${interpolate(itemOpacity, [0, 1], [20, 0])}px)`,
              }}
            >
              <div style={{fontFamily: font.mono, fontSize: 22, color: palette.accent, marginBottom: 24}}>0{index + 1}</div>
              <h3 style={{margin: 0, fontSize: 42, letterSpacing: -1.6}}>{title}</h3>
              <p style={{margin: '22px 0 0', color: palette.muted, fontSize: 24, lineHeight: 1.35}}>{copy}</p>
            </div>
          );
        })}
      </div>
      <Caption>Review build: signed Slack surface, safe mock provider boundary.</Caption>
    </Shell>
  );
};

const SlackDemoScene = () => {
  const frame = useCurrentFrame();
  const opacity = fade(frame, 0, 34) * exitFade(frame, 500, 32);
  const command = '/swiggy-lunch for 12 250 by 13:15 veg';
  const typedCount = Math.floor(
    interpolate(frame, [42, 186], [0, command.length], {
      easing: Easing.bezier(0.45, 0, 0.55, 1),
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }),
  );
  const typedCommand = command.slice(0, typedCount);
  const cursorOn = Math.floor(frame / 15) % 2 === 0;
  const sendPulse = interpolate(frame, [190, 205, 226], [0, 1, 0], {
    easing: Easing.bezier(0.34, 1.56, 0.64, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const resultReveal = fade(frame, 224, 48);
  const zoom = interpolate(frame, [0, 210, 500], [1.01, 1.04, 1.11], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const x = interpolate(frame, [0, 210, 500], [0, -12, -58], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const y = interpolate(frame, [0, 210, 500], [0, -12, -168], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const composerOpacity = interpolate(frame, [214, 248], [1, 0], {
    easing: Easing.in(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const proofLabelOpacity = fade(frame, 256, 36);

  return (
    <Shell>
      <div style={{position: 'absolute', left: 90, top: 68, opacity}}>
        <Eyebrow>Slack flow</Eyebrow>
      </div>
      <div
        style={{
          position: 'absolute',
          left: 88,
          right: 88,
          top: 126,
          height: 820,
          borderRadius: 34,
          backgroundColor: palette.charcoal,
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 42px 110px -74px rgba(33,31,28,0.95)',
          overflow: 'hidden',
          opacity,
        }}
      >
        <div style={{height: 58, display: 'flex', alignItems: 'center', gap: 13, paddingLeft: 24, backgroundColor: '#332f2a'}}>
          <div style={{width: 16, height: 16, borderRadius: 99, backgroundColor: '#d58768'}} />
          <div style={{width: 16, height: 16, borderRadius: 99, backgroundColor: '#d9b865'}} />
          <div style={{width: 16, height: 16, borderRadius: 99, backgroundColor: '#75936f'}} />
          <div style={{marginLeft: 22, color: '#ded5c8', fontFamily: font.mono, fontSize: 18}}>app.slack.com</div>
        </div>
        <Img
          src={staticFile('video-assets/slack-current.png')}
          style={{
            width: '100%',
            height: 762,
            objectFit: 'cover',
            objectPosition: 'center bottom',
            transform: `translate(${x}px, ${y}px) scale(${zoom})`,
            transformOrigin: 'center bottom',
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: 520,
            top: 576,
            width: 1030,
            height: 76,
            borderRadius: 12,
            backgroundColor: '#222429',
            opacity: composerOpacity,
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: 546,
            top: 596,
            height: 42,
            display: 'flex',
            alignItems: 'center',
            color: '#f4f1ed',
            fontSize: 24,
            fontFamily: '"Slack-Lato", "Lato", "Aptos", ui-sans-serif, system-ui, sans-serif',
            letterSpacing: 0,
            opacity: composerOpacity,
          }}
        >
          <span>{typedCommand}</span>
          <span
            style={{
              width: 2,
              height: 30,
              marginLeft: 3,
              backgroundColor: '#f4f1ed',
              opacity: cursorOn ? 1 : 0,
            }}
          />
        </div>
        <div
          style={{
            position: 'absolute',
            left: 1568,
            top: 620,
            width: 56,
            height: 40,
            borderRadius: 10,
            backgroundColor: '#148567',
            boxShadow: `0 0 0 ${sendPulse * 18}px rgba(20,133,103,${0.18 * sendPulse})`,
            transform: `scale(${1 + sendPulse * 0.08})`,
            opacity: composerOpacity,
          }}
        >
          <div
            style={{
              width: 0,
              height: 0,
              borderTop: '8px solid transparent',
              borderBottom: '8px solid transparent',
              borderLeft: '13px solid #f8fff9',
              position: 'absolute',
              left: 23,
              top: 12,
            }}
          />
        </div>
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: 150,
            background: 'linear-gradient(to bottom, rgba(31,33,37,0), #1f2125 62%)',
            opacity: resultReveal,
          }}
        />
      </div>
      <div
        style={{
          position: 'absolute',
          left: 118,
          bottom: 62,
          padding: '16px 22px',
          borderRadius: 999,
          backgroundColor: 'rgba(255,253,248,0.86)',
          border: `1px solid ${palette.faint}`,
          color: palette.ink,
          fontFamily: font.mono,
          fontSize: 22,
          opacity,
        }}
      >
        {frame < 225 ? 'The slash command is typed directly inside Slack.' : 'The resulting order state shows budget, choices, policy, and mock provider id.'}
      </div>
      <div
        style={{
          position: 'absolute',
          right: 118,
          top: 830,
          width: 430,
          padding: '18px 22px',
          borderRadius: 18,
          backgroundColor: 'rgba(255,253,248,0.9)',
          border: `1px solid ${palette.faint}`,
          color: palette.ink,
          fontSize: 24,
          lineHeight: 1.28,
          opacity: proofLabelOpacity,
          transform: `translateY(${interpolate(proofLabelOpacity, [0, 1], [14, 0])}px)`,
        }}
      >
        Final proof: mock order placed with a Swiggy Mock provider order id.
      </div>
    </Shell>
  );
};

const SlackTypeFlowScene = () => {
  const frame = useCurrentFrame();
  const opacity = fade(frame, 0, 14) * exitFade(frame, 386, 18);
  const command = '/swiggy-lunch for 12 250 by 13:15 veg';
  const typedCount = Math.floor(
    interpolate(frame, [10, 90], [0, command.length], {
      easing: Easing.bezier(0.45, 0, 0.55, 1),
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }),
  );
  const typedCommand = command.slice(0, typedCount);
  const cursorOn = Math.floor(frame / 10) % 2 === 0;
  const sendPulse = interpolate(frame, [92, 103, 118], [0, 1, 0], {
    easing: Easing.bezier(0.34, 1.56, 0.64, 1),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const commandOpacity = interpolate(frame, [120, 136], [1, 0], {
    easing: Easing.in(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const userMessageOpacity = fade(frame, 132, 16);
  const appMessageOpacity = fade(frame, 150, 20);
  const choiceOpacity = fade(frame, 190, 18);
  const lockOpacity = fade(frame, 235, 18);
  const approveOpacity = fade(frame, 280, 18);
  const placedOpacity = fade(frame, 330, 20);
  const status =
    frame < 235 ? 'Collecting choices' : frame < 280 ? 'Locked' : frame < 330 ? 'Approved' : 'Placed';
  const windowScale = interpolate(frame, [0, 130, 290, 404], [0.96, 1, 1.018, 1.01], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const windowY = interpolate(frame, [0, 130, 290, 404], [18, 0, -12, -5], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const focusRingOpacity = commandOpacity * interpolate(frame, [18, 46], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const appCardLift = interpolate(appMessageOpacity, [0, 1], [18, 0]);
  const appCardScale = interpolate(appMessageOpacity, [0, 1], [0.985, 1]);
  const providerSweep = interpolate(frame, [330, 375], [-1, 1], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const providerSweepOpacity = fade(frame, 330, 14) * exitFade(frame, 382, 16);

  return (
    <Shell>
      <div style={{position: 'absolute', left: 90, top: 68, opacity}}>
        <Eyebrow>Slack flow</Eyebrow>
      </div>
      <div
        style={{
          position: 'absolute',
          left: 88,
          right: 88,
          top: 126,
          height: 820,
          borderRadius: 34,
          backgroundColor: palette.charcoal,
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 42px 110px -74px rgba(33,31,28,0.95)',
          overflow: 'hidden',
          opacity,
          transform: `translateY(${windowY}px) scale(${windowScale})`,
          transformOrigin: 'center center',
        }}
      >
        <div style={{height: 58, display: 'flex', alignItems: 'center', gap: 13, paddingLeft: 24, backgroundColor: '#332f2a'}}>
          <div style={{width: 16, height: 16, borderRadius: 99, backgroundColor: '#d58768'}} />
          <div style={{width: 16, height: 16, borderRadius: 99, backgroundColor: '#d9b865'}} />
          <div style={{width: 16, height: 16, borderRadius: 99, backgroundColor: '#75936f'}} />
          <div style={{marginLeft: 22, color: '#ded5c8', fontFamily: font.mono, fontSize: 18}}>app.slack.com</div>
        </div>
        <div style={{display: 'grid', gridTemplateColumns: '330px 1fr', height: 762, backgroundColor: '#1f2125'}}>
          <div style={{backgroundColor: '#2b102f', color: '#efe6f1', padding: '28px 22px'}}>
            <div style={{fontSize: 25, fontWeight: 750, marginBottom: 34}}>Test for Swiggy Integration</div>
            <div style={{fontSize: 20, opacity: 0.74, marginBottom: 28}}>Channels</div>
            {['all-test-for-swiggy-integration', 'new-channel', 'social'].map((channel, index) => (
              <div
                key={channel}
                style={{
                  padding: '12px 14px',
                  borderRadius: 10,
                  marginBottom: 6,
                  backgroundColor: index === 0 ? 'rgba(157, 87, 169, 0.72)' : 'transparent',
                  fontSize: 22,
                }}
              >
                # {channel}
              </div>
            ))}
            <div style={{fontSize: 20, opacity: 0.74, marginTop: 34, marginBottom: 12}}>Apps</div>
            <div style={{fontSize: 22, marginBottom: 10}}>Slackbot</div>
            <div style={{fontSize: 22}}>Swiggy Lunch Bot</div>
          </div>
          <div style={{display: 'grid', gridTemplateRows: '76px 1fr 146px', minWidth: 0}}>
            <div
              style={{
                borderBottom: '1px solid rgba(255,255,255,0.08)',
                display: 'flex',
                alignItems: 'center',
                padding: '0 34px',
                gap: 16,
              }}
            >
              <div style={{fontSize: 31, fontWeight: 780, color: '#f7f3ea'}}># all-test-for-swiggy-integration</div>
              <div style={{marginLeft: 'auto', fontSize: 19, color: '#b9b0bc', fontFamily: font.mono}}>Slack review workspace</div>
            </div>
            <div style={{position: 'relative', padding: '30px 42px', overflow: 'hidden'}}>
              <div
                style={{
                  display: 'flex',
                  gap: 18,
                  opacity: userMessageOpacity,
                  transform: `translateY(${interpolate(userMessageOpacity, [0, 1], [18, 0])}px)`,
                }}
              >
                <div style={{width: 48, height: 48, borderRadius: 13, backgroundColor: '#8fb2cf'}} />
                <div>
                  <div style={{color: '#f7f3ea', fontSize: 22, fontWeight: 740}}>
                    aksidharthm10 <span style={{fontWeight: 400, color: '#9b95a0', fontSize: 18}}>1:07 PM</span>
                  </div>
                  <div style={{color: '#d8d2dc', fontSize: 22, marginTop: 6, fontFamily: font.mono}}>{command}</div>
                </div>
              </div>
              <div
                style={{
                  position: 'absolute',
                  left: 42,
                  right: 42,
                  top: 116,
                  display: 'flex',
                  gap: 18,
                  opacity: appMessageOpacity,
                  transform: `translateY(${appCardLift}px) scale(${appCardScale})`,
                  transformOrigin: 'left top',
                }}
              >
                <div style={{width: 48, height: 48, borderRadius: 13, backgroundColor: '#efc75e', border: '2px solid rgba(255,255,255,0.72)'}} />
                <div style={{width: 1080}}>
                  <div style={{color: '#f7f3ea', fontSize: 22, fontWeight: 780}}>
                    Swiggy Office Lunch{' '}
                    <span style={{fontFamily: font.mono, fontSize: 15, color: '#201d19', backgroundColor: '#d9d0c5', borderRadius: 5, padding: '2px 5px', marginLeft: 8}}>
                      APP
                    </span>
                  </div>
                  <div style={{marginTop: 12, border: '1px solid rgba(255,255,255,0.12)', borderRadius: 18, backgroundColor: '#24262b', padding: '22px 24px', color: '#eee9e1'}}>
                    <div style={{display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14}}>
                      <div style={{width: 12, height: 12, borderRadius: 99, backgroundColor: frame < 330 ? '#d0a64f' : '#69a478'}} />
                      <div style={{fontSize: 28, fontWeight: 780}}>Office lunch run</div>
                      <div style={{marginLeft: 'auto', fontFamily: font.mono, fontSize: 19, color: '#d8d2dc'}}>{status}</div>
                    </div>
                    <div style={{fontSize: 21, color: '#d8d2dc', marginBottom: 18}}>
                      Budget: INR 250/person | Deadline: 13:15 | Participants: {frame < 190 ? '0' : '1'}/12 | Provider: Swiggy Mock
                    </div>
                    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20}}>
                      <div>
                        <div style={{fontSize: 21, fontWeight: 750, marginBottom: 8}}>Recommended restaurants</div>
                        {['Namma Meals Co. - 29 min, reliability 96', 'Lean Lunch Labs - 26 min, reliability 94', 'North Star Kitchen - 34 min, reliability 91'].map((restaurant) => (
                          <div key={restaurant} style={{fontSize: 19, color: '#d8d2dc', marginBottom: 6}}>
                            • {restaurant}
                          </div>
                        ))}
                      </div>
                      <div>
                        <div style={{fontSize: 21, fontWeight: 750, marginBottom: 8}}>Submitted choices</div>
                        <div style={{fontSize: 19, color: '#d8d2dc', opacity: choiceOpacity}}>Aksidharthm10: Paneer Millet Bowl (INR 220)</div>
                        <div style={{display: 'flex', gap: 9, marginTop: 18, flexWrap: 'wrap'}}>
                          {['Paneer bowl', 'Veg thali', 'Idli combo', 'Protein salad'].map((label, index) => (
                            <div
                              key={label}
                              style={{
                                border: '1px solid rgba(255,255,255,0.16)',
                                borderRadius: 8,
                                padding: '9px 12px',
                                fontSize: 16,
                                color: '#f5efe4',
                                opacity: fade(frame, 178 + index * 6, 14),
                                transform: `translateY(${interpolate(fade(frame, 178 + index * 6, 14), [0, 1], [8, 0])}px)`,
                              }}
                            >
                              {label}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div style={{display: 'flex', gap: 12, marginTop: 22, alignItems: 'center'}}>
                      <div style={{borderRadius: 8, backgroundColor: '#16745f', color: '#f7fff9', padding: '10px 14px', fontSize: 18, opacity: lockOpacity}}>Lock cart</div>
                      <div style={{borderRadius: 8, backgroundColor: '#6f5c40', color: '#fff7e9', padding: '10px 14px', fontSize: 18, opacity: approveOpacity}}>Approved</div>
                      <div style={{borderRadius: 8, backgroundColor: '#385f45', color: '#f7fff9', padding: '10px 14px', fontSize: 18, opacity: placedOpacity}}>Mock order placed</div>
                      <div
                        style={{
                          marginLeft: 'auto',
                          fontFamily: font.mono,
                          fontSize: 20,
                          color: '#f3d0bd',
                          opacity: placedOpacity,
                          position: 'relative',
                          overflow: 'hidden',
                          padding: '2px 0',
                        }}
                      >
                        <span>SWIGGY-MOCK-7C876AFA</span>
                        <div
                          style={{
                            position: 'absolute',
                            top: 0,
                            bottom: 0,
                            width: 70,
                            left: `${providerSweep * 100}%`,
                            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.45), transparent)',
                            opacity: providerSweepOpacity,
                            transform: 'skewX(-16deg)',
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div style={{borderTop: '1px solid rgba(255,255,255,0.1)', padding: '18px 28px'}}>
              <div style={{height: 84, borderRadius: 15, border: '1px solid rgba(255,255,255,0.16)', backgroundColor: '#222429', position: 'relative', padding: '24px 70px 0 24px'}}>
                <div
                  style={{
                    position: 'absolute',
                    inset: -4,
                    borderRadius: 18,
                    border: '2px solid rgba(20,133,103,0.7)',
                    boxShadow: '0 0 26px rgba(20,133,103,0.35)',
                    opacity: focusRingOpacity,
                  }}
                />
                <div
                  style={{
                    color: commandOpacity > 0.01 ? '#f4f1ed' : '#817a83',
                    fontSize: 27,
                    fontFamily: '"Slack-Lato", "Lato", "Aptos", ui-sans-serif, system-ui, sans-serif',
                  }}
                >
                  {commandOpacity > 0.01 ? typedCommand : 'Message #all-test-for-swiggy-integration'}
                  {commandOpacity > 0.01 ? (
                    <span style={{display: 'inline-block', width: 2, height: 30, marginLeft: 4, backgroundColor: '#f4f1ed', opacity: cursorOn ? 1 : 0, verticalAlign: -5}} />
                  ) : null}
                </div>
                <div
                  style={{
                    position: 'absolute',
                    right: 18,
                    bottom: 16,
                    width: 46,
                    height: 36,
                    borderRadius: 9,
                    backgroundColor: commandOpacity > 0.01 ? '#148567' : '#3b3d42',
                    boxShadow: `0 0 0 ${sendPulse * 18}px rgba(20,133,103,${0.18 * sendPulse})`,
                    transform: `scale(${1 + sendPulse * 0.08})`,
                  }}
                >
                  <div
                    style={{
                      width: 0,
                      height: 0,
                      borderTop: '7px solid transparent',
                      borderBottom: '7px solid transparent',
                      borderLeft: '12px solid #f8fff9',
                      position: 'absolute',
                      left: 19,
                      top: 11,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
};

const ProofScene = () => {
  const frame = useCurrentFrame();
  const opacity = fade(frame, 0, 34) * exitFade(frame, 280, 30);
  const facts = [
    ['Signed requests', 'Slack command and interaction endpoints verify payloads before handling.'],
    ['Organizer gate', 'Lock, approval, and placement stay under organizer control.'],
    ['Provider boundary', 'The mock order id proves the flow without touching private Swiggy APIs.'],
  ];

  return (
    <Shell>
      <div style={{position: 'absolute', left: 142, top: 148, opacity}}>
        <Eyebrow>Proof frame</Eyebrow>
        <h2 style={{margin: '32px 0 0', width: 860, fontSize: 78, lineHeight: 0.96, letterSpacing: -4.6}}>
          The review sees behavior, not a mockup.
        </h2>
      </div>
      <div style={{position: 'absolute', right: 132, top: 178, width: 620, opacity}}>
        {facts.map(([title, copy], index) => {
          const itemOpacity = fade(frame, 20 + index * 16, 30);
          return (
            <div key={title} style={{borderTop: `1px solid ${palette.faint}`, padding: '34px 0', opacity: itemOpacity}}>
              <h3 style={{margin: 0, color: palette.ink, fontSize: 38, letterSpacing: -1.2}}>{title}</h3>
              <p style={{margin: '12px 0 0', color: palette.muted, fontSize: 26, lineHeight: 1.36}}>{copy}</p>
            </div>
          );
        })}
      </div>
      <Caption>For a fresh Slack run, set the real signing secret and point Slack to the cloudflared URL.</Caption>
    </Shell>
  );
};

const ClosingScene = () => {
  const frame = useCurrentFrame();
  const opacity = fade(frame, 0, 40);
  const y = interpolate(frame, [0, 40], [22, 0], {
    easing: ease,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <Shell>
      <div style={{position: 'absolute', left: 144, top: 235, width: 1180, opacity, transform: `translateY(${y}px)`}}>
        <Eyebrow>Ready for review</Eyebrow>
        <h2 style={{margin: '34px 0 28px', fontSize: 96, lineHeight: 0.95, letterSpacing: -5.2}}>
          A Slack-native order flow with a clean path to live Swiggy access.
        </h2>
        <p style={{margin: 0, width: 900, color: palette.muted, fontSize: 32, lineHeight: 1.34}}>
          Signed requests, structured choices, approval controls, and a provider adapter that remains in mock mode until real credentials are available.
        </p>
      </div>
    </Shell>
  );
};

export const SwiggyOfficeLunchDemo = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill>
      <Sequence from={0} durationInFrames={45}>
        <SceneTitle />
      </Sequence>
      <Sequence from={45} durationInFrames={405}>
        <SlackTypeFlowScene />
      </Sequence>
      <Progress frame={frame} />
    </AbsoluteFill>
  );
};
