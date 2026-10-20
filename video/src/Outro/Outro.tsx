import "@fontsource/cairo/600.css";
import "@fontsource/cairo/800.css";
import { useEffect, useState } from "react";
import {
  AbsoluteFill,
  Audio,
  Easing,
  Img,
  continueRender,
  delayRender,
  interpolate,
  random,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

const NAVY = "#0D4580";
const RED = "#BE1E1E";
const ease = Easing.bezier(0.22, 1, 0.36, 1);

const LULUAT = staticFile("outro/luluat-light.png");
const CHANGAN = staticFile("outro/changan-light.png");
const SFX = staticFile("outro/outro-sfx.wav");

// Wait for the Arabic font so the first frames never render with a fallback.
const useCairo = () => {
  const [handle] = useState(() => delayRender("Loading Cairo"));
  useEffect(() => {
    Promise.all([
      document.fonts.load('600 60px "Cairo"', "للاستفسار"),
      document.fonts.load('800 60px "Cairo"', "6881"),
    ]).then(() => continueRender(handle));
  }, [handle]);
};

const smooth = (frame: number, from: number, to: number) =>
  interpolate(frame, [from, to], [0, 1], {
    easing: ease,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

const Background: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames, width, height } = useVideoConfig();
  const t = frame / 30;
  const intro = smooth(frame, 0, 30);

  return (
    <AbsoluteFill style={{ opacity: intro }}>
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse 80% 70% at 50% 42%, #143a6e 0%, #0a1d3c 45%, #040b18 100%)",
        }}
      />
      {/* drifting colour glows */}
      <div
        style={{
          position: "absolute",
          width: 900,
          height: 900,
          borderRadius: "50%",
          left: width - 670 + Math.sin(t * 0.6) * 90,
          top: -250 + Math.cos(t * 0.5) * 70,
          background: `radial-gradient(circle, ${NAVY}cc 0%, transparent 65%)`,
          filter: "blur(40px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 800,
          height: 800,
          borderRadius: "50%",
          left: -300 + Math.cos(t * 0.5) * 80,
          top: height - 560 + Math.sin(t * 0.7) * 60,
          background: `radial-gradient(circle, ${RED}55 0%, transparent 65%)`,
          filter: "blur(50px)",
        }}
      />
      <Arcs />
      <Particles />
      {/* light sweep at the start */}
      <div
        style={{
          position: "absolute",
          top: -400,
          width: 420,
          height: height + 900,
          left: interpolate(frame, [4, 44], [-700, width + 400], {
            easing: Easing.inOut(Easing.cubic),
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          transform: "rotate(18deg)",
          background:
            "linear-gradient(90deg, transparent, rgba(255,255,255,0.13), transparent)",
        }}
      />
      {/* vignette */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.55) 100%)",
        }}
      />
      <AbsoluteFill
        style={{
          backgroundColor: "#000",
          opacity: interpolate(
            frame,
            [durationInFrames - 14, durationInFrames - 1],
            [0, 1],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
          ),
        }}
      />
    </AbsoluteFill>
  );
};

// Curved bands echoing the Luluat Al Bakhet mark.
const Arcs: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const bands = [
    { r: 620, color: "#ffffff", w: 34, delay: 0 },
    { r: 700, color: RED, w: 34, delay: 6 },
    { r: 780, color: "#2a6cc0", w: 34, delay: 12 },
  ];
  const drift = Math.sin(frame / 50) * 6;

  const renderSet = (flip: boolean) =>
    bands.map((b, i) => {
      const len = (Math.PI * b.r) / 2;
      const p = smooth(frame, 8 + b.delay, 58 + b.delay);
      return (
        <path
          key={`${flip}-${i}`}
          d={`M ${-b.r} 0 A ${b.r} ${b.r} 0 0 0 0 ${b.r}`}
          fill="none"
          stroke={b.color}
          strokeWidth={b.w}
          strokeLinecap="round"
          strokeDasharray={len}
          strokeDashoffset={len * (1 - p)}
          opacity={0.16}
        />
      );
    });

  return (
    <svg width={width} height={height} style={{ position: "absolute" }}>
      <g transform={`translate(${width + 120 + drift}, ${-60}) rotate(0)`}>
        {renderSet(false)}
      </g>
      <g transform={`translate(${-120 - drift}, ${height + 60}) rotate(180)`}>
        {renderSet(true)}
      </g>
    </svg>
  );
};

const Particles: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const span = height + 100;
  return (
    <AbsoluteFill>
      {new Array(Math.round((width * height) / 37000)).fill(0).map((_, i) => {
        const x = random(`x${i}`) * width;
        const speed = 0.3 + random(`s${i}`) * 0.9;
        const y =
          ((((random(`y${i}`) * span - frame * speed) % span) + span) % span) -
          50;
        const size = 2 + random(`z${i}`) * 4;
        const tw = 0.25 + 0.35 * (0.5 + 0.5 * Math.sin(frame / 12 + i));
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x + Math.sin(frame / 40 + i) * 12,
              top: y,
              width: size,
              height: size,
              borderRadius: "50%",
              background: i % 7 === 0 ? "#ff6b6b" : "#cfe2ff",
              opacity: tw,
              boxShadow: "0 0 8px rgba(207,226,255,0.8)",
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

const LogoReveal: React.FC<{
  src: string;
  width: number;
  height: number;
  start: number;
  fromRight: boolean;
  shineAt: number;
}> = ({ src, width, height, start, fromRight, shineAt }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({
    frame: frame - start,
    fps,
    config: { damping: 200 },
    durationInFrames: 45,
  });
  const wipe = (1 - s) * 100;
  const shine = interpolate(frame, [shineAt, shineAt + 32], [-40, 140], {
    easing: Easing.inOut(Easing.quad),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const mask = `url(${src})`;

  return (
    <div
      style={{
        position: "relative",
        width,
        height,
        opacity: s,
        transform: `translateY(${(1 - s) * 40}px) scale(${1.08 - 0.08 * s})`,
        filter: `blur(${(1 - s) * 18}px) drop-shadow(0 12px 30px rgba(0,0,0,0.45))`,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          clipPath: fromRight
            ? `inset(0 0 0 ${wipe}%)`
            : `inset(0 ${wipe}% 0 0)`,
        }}
      >
        <Img src={src} style={{ width, height }} />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `linear-gradient(105deg, transparent ${shine - 18}%, rgba(255,255,255,0.95) ${shine}%, transparent ${shine + 18}%)`,
            WebkitMaskImage: mask,
            maskImage: mask,
            WebkitMaskSize: "100% 100%",
            maskSize: "100% 100%",
            mixBlendMode: "overlay",
          }}
        />
      </div>
    </div>
  );
};

const PhoneIcon: React.FC = () => (
  <svg width="54" height="54" viewBox="0 0 24 24" fill="#fff">
    <path d="M6.62 10.79a15.05 15.05 0 0 0 6.59 6.59l2.2-2.2a1 1 0 0 1 1.02-.24c1.12.37 2.33.57 3.57.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1C10.61 21 3 13.39 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1.02l-2.2 2.2z" />
  </svg>
);

const Contact: React.FC<{ vertical: boolean }> = ({ vertical }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const words = ["للاستفسار", "الاتصال", "على", "الرقم"];
  const digits = "6881".split("");
  const lineP = smooth(frame, 96, 130);
  const badge = spring({
    frame: frame - 128,
    fps,
    config: { damping: 12, mass: 0.8 },
  });
  const glow = 0.5 + 0.5 * Math.sin(frame / 10);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        fontFamily: "Cairo",
        color: "#fff",
      }}
    >
      <div
        style={{
          display: "flex",
          gap: 22,
          direction: "rtl",
          fontSize: vertical ? 70 : 62,
          fontWeight: 600,
        }}
      >
        {words.map((w, i) => {
          const p = smooth(frame, 104 + i * 6, 134 + i * 6);
          return (
            <span
              key={w}
              style={{
                opacity: p,
                transform: `translateY(${(1 - p) * 34}px)`,
                filter: `blur(${(1 - p) * 10}px)`,
                color: "rgba(255,255,255,0.88)",
              }}
            >
              {w}
            </span>
          );
        })}
      </div>

      <div
        style={{
          width: (vertical ? 640 : 560) * lineP,
          height: 3,
          margin: vertical ? "26px 0 34px" : "18px 0 22px",
          borderRadius: 3,
          background: `linear-gradient(90deg, transparent, ${RED}, #ffffff, ${RED}, transparent)`,
        }}
      />

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 40,
          direction: "ltr",
        }}
      >
        <div
          style={{
            position: "relative",
            width: 112,
            height: 112,
            transform: `scale(${badge})`,
          }}
        >
          {[0, 1].map((k) => {
            const cycle = ((frame - 140 + k * 22) % 44) / 44;
            const on = frame > 140;
            return (
              <div
                key={k}
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: "50%",
                  border: `3px solid ${RED}`,
                  opacity: on ? (1 - cycle) * 0.8 : 0,
                  transform: `scale(${1 + cycle * 0.7})`,
                }}
              />
            );
          })}
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              background: `linear-gradient(145deg, #e23a3a, ${RED} 60%, #8e1414)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: `0 10px 40px rgba(190,30,30,${0.35 + glow * 0.3})`,
            }}
          >
            <PhoneIcon />
          </div>
        </div>

        <div
          style={{
            display: "flex",
            padding: "0 6px",
            filter: `drop-shadow(0 0 ${14 + glow * 18}px rgba(120,170,255,0.45))`,
          }}
        >
          {digits.map((d, i) => {
            const p = spring({
              frame: frame - (122 + i * 5),
              fps,
              config: { damping: 200 },
              durationInFrames: 30,
            });
            return (
              <span
                key={i}
                style={{
                  display: "inline-block",
                  fontSize: vertical ? 200 : 176,
                  fontWeight: 800,
                  lineHeight: 1.15,
                  letterSpacing: 6,
                  transform: `translateY(${(1 - p) * 110}%)`,
                  opacity: p,
                  backgroundImage:
                    "linear-gradient(180deg, #ffffff 30%, #c9d8f0 100%)",
                  WebkitBackgroundClip: "text",
                  color: "transparent",
                }}
              >
                {d}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export const Outro: React.FC = () => {
  useCairo();
  const frame = useCurrentFrame();
  const { durationInFrames, width, height } = useVideoConfig();
  const vertical = height > width;
  const push = interpolate(frame, [0, durationInFrames], [1, 1.045]);
  const divider = smooth(frame, 50, 85);

  const luluat = vertical
    ? { width: 690, height: 131 }
    : { width: 600, height: 114 };
  const changan = vertical
    ? { width: 640, height: 126 }
    : { width: 560, height: 110 };

  return (
    <AbsoluteFill style={{ backgroundColor: "#040b18" }}>
      <Audio src={SFX} />
      <Background />
      <AbsoluteFill
        style={{
          transform: `scale(${push})`,
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: vertical ? 170 : 90,
          paddingBottom: vertical ? 200 : 0,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: vertical ? "column" : "row",
            alignItems: "center",
            gap: vertical ? 70 : 80,
            direction: "ltr",
          }}
        >
          {vertical ? (
            <>
              <LogoReveal
                src={CHANGAN}
                {...changan}
                start={22}
                fromRight={false}
                shineAt={86}
              />
              <div
                style={{
                  width: 520 * divider,
                  height: 3,
                  borderRadius: 3,
                  background:
                    "linear-gradient(90deg, transparent, rgba(255,255,255,0.85), transparent)",
                }}
              />
              <LogoReveal
                src={LULUAT}
                {...luluat}
                start={42}
                fromRight
                shineAt={96}
              />
            </>
          ) : (
            <>
              <LogoReveal
                src={CHANGAN}
                {...changan}
                start={42}
                fromRight={false}
                shineAt={96}
              />
              <div
                style={{
                  width: 3,
                  height: 150 * divider,
                  borderRadius: 3,
                  background:
                    "linear-gradient(180deg, transparent, rgba(255,255,255,0.85), transparent)",
                }}
              />
              <LogoReveal
                src={LULUAT}
                {...luluat}
                start={22}
                fromRight
                shineAt={86}
              />
            </>
          )}
        </div>
        <Contact vertical={vertical} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
