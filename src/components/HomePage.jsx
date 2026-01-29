
import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import anime from 'animejs';
import { motion, useMotionValue, useSpring, useTransform, animate, useScroll } from 'framer-motion';
import { getStats } from '../firebase/firestore';

// --- Components ---

const MouseFollower = () => {
  const cursorX = useMotionValue(-100);
  const cursorY = useMotionValue(-100);
  const scale = useMotionValue(1);

  const springConfig = { damping: 50, stiffness: 300, mass: 0.3 };
  const cursorXSpring = useSpring(cursorX, springConfig);
  const cursorYSpring = useSpring(cursorY, springConfig);
  const scaleSpring = useSpring(scale, springConfig);

  useEffect(() => {
    const moveCursor = (e) => {
      cursorX.set(e.clientX - 16);
      cursorY.set(e.clientY - 16);
    };

    const handleMouseOver = (e) => {
      if (e.target.closest('button, a, .interactive')) {
        scale.set(1.5);
      } else {
        scale.set(1);
      }
    };

    window.addEventListener('mousemove', moveCursor);
    window.addEventListener('mouseover', handleMouseOver);
    return () => {
      window.removeEventListener('mousemove', moveCursor);
      window.removeEventListener('mouseover', handleMouseOver);
    };
  }, [cursorX, cursorY, scale]);

  return (
    <motion.div
      className="fixed top-0 left-0 w-8 h-8 rounded-full border border-cyan-400/50 pointer-events-none z-50 hidden md:block mix-blend-screen"
      style={{
        translateX: cursorXSpring,
        translateY: cursorYSpring,
        scale: scaleSpring,
        background: 'radial-gradient(circle, rgba(0, 243, 255, 0.4) 0%, transparent 70%)',
        boxShadow: '0 0 30px rgba(0, 243, 255, 0.7)'
      }}
    />
  );
};

const MagneticButton = ({ children, className, onClick, to, href }) => {
  const ref = useRef(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const xSpring = useSpring(x, { stiffness: 150, damping: 25, mass: 0.15 });
  const ySpring = useSpring(y, { stiffness: 150, damping: 25, mass: 0.15 });

  const handleMouseMove = (e) => {
    const { clientX, clientY } = e;
    const { left, top, width, height } = ref.current.getBoundingClientRect();
    const centerX = left + width / 2;
    const centerY = top + height / 2;
    x.set((clientX - centerX) * 0.3); // Magnetic strength
    y.set((clientY - centerY) * 0.3);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  const Component = to ? Link : (href ? 'a' : 'button');
  const props = to ? { to } : (href ? { href } : { onClick });

  return (
    <motion.div
      style={{ x: xSpring, y: ySpring }}
    >
      <Component
        ref={ref}
        className={className}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        {...props}
      >
        {children}
      </Component>
    </motion.div>
  );
};

const StatItem = ({ value, label, suffix = "" }) => {
  const count = useMotionValue(0);
  const rounded = useTransform(count, latest => Math.round(latest));
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          animate(count, value, { duration: 2, ease: "easeOut" });
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [value, count]);

  return (
    <div ref={ref} className="text-center p-6 glass-card rounded-lg relative group overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-lg" />
      <motion.div className="text-4xl md:text-5xl font-black text-white mb-2 font-mono">
        <motion.span>{rounded}</motion.span>{suffix}
      </motion.div>
      <div className="text-sm text-cyan-400 tracking-widest uppercase font-bold">{label}</div>
    </div>
  );
};

const FeatureCard = ({ title, description, colorClass, highlightColor }) => {
  const cardRef = useRef(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const rotateX = useTransform(y, [-100, 100], [15, -15]);
  const rotateY = useTransform(x, [-100, 100], [-15, 15]);

  const handleMouseMove = (e) => {
    const { left, top, width, height } = cardRef.current.getBoundingClientRect();
    const centerX = left + width / 2;
    const centerY = top + height / 2;
    x.set(e.clientX - centerX);
    y.set(e.clientY - centerY);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          anime({
            targets: cardRef.current,
            opacity: [0, 1],
            translateY: [60, 0],
            duration: 1200,
            easing: 'spring(1, 80, 10, 0)'
          });
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.2 }
    );

    if (cardRef.current) observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
      className="opacity-0 p-8 h-full rounded-sm bg-black/40 border border-[#00f3ff]/10 hover:border-[#00f3ff]/40 transition-all duration-500 group relative overflow-hidden interactive hover:shadow-[0_0_30px_rgba(0,243,255,0.2)]"
    >
      <div style={{ transform: "translateZ(50px)" }} className="relative z-10">
        <div className={`absolute top-0 left-[-32px] w-1 h-full ${highlightColor} opacity-50 group-hover:opacity-100 transition-opacity`} />
        <h3 className={`text-xl font-black mb-4 tracking-wider uppercase ${colorClass}`}>
          {title}
        </h3>
        <p className="text-white/60 text-sm leading-relaxed font-medium">
          {description}
        </p>
      </div>
      <div
        className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          background: `radial-gradient(circle at ${x.get() + 150}px ${y.get() + 150}px, rgba(0, 243, 255, 0.1) 0%, transparent 70%)`
        }}
      />
    </motion.div>
  );
};

const ScrollProgress = () => {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  return (
    <motion.div
      className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#00f3ff] via-[#ff00ff] to-[#00f3ff] z-[100] origin-left"
      style={{ scaleX }}
    />
  );
};

const BackgroundAura = () => {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const auraX = useSpring(mouseX, { stiffness: 30, damping: 30 });
  const auraY = useSpring(mouseY, { stiffness: 30, damping: 30 });
  const { scrollY } = useScroll();

  const auraColor = useTransform(
    scrollY,
    [0, 1000, 2000],
    ["rgba(0, 243, 255, 0.15)", "rgba(255, 0, 255, 0.15)", "rgba(0, 243, 255, 0.15)"]
  );

  useEffect(() => {
    const handleMouseMove = (e) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [mouseX, mouseY]);

  return (
    <motion.div
      className="fixed w-[800px] h-[800px] pointer-events-none z-0 opacity-80 current-aura hidden md:block" // Increased opacity to 80
      style={{
        x: auraX,
        y: auraY,
        left: -400,
        top: -400,
        background: useTransform(auraColor, (c) => `radial-gradient(circle, ${c} 0%, transparent 70%)`),
        filter: 'blur(80px)' // Increased blur for smoother edge
      }}
    />
  );
};

const ParallaxElement = ({ children, speed = 0.5, className }) => {
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 2000], [0, 2000 * speed]);

  return (
    <motion.div style={{ y }} className={className}>
      {children}
    </motion.div>
  );
};

const AnimatedLogo = () => {
  const logoRef = useRef(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const handleMouseMove = (e) => {
    const { clientX, clientY } = e;
    const { left, top, width, height } = logoRef.current.getBoundingClientRect();
    const x = (clientX - (left + width / 2)) / 20;
    const y = (clientY - (top + height / 2)) / 20;
    mouseX.set(x);
    mouseY.set(y);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  useEffect(() => {
    // Animation for visual fragments
    anime.timeline({
      loop: true,
      direction: 'alternate',
    })
      .add({
        targets: '.logo-fragment',
        scale: [0.8, 1.1],
        opacity: [0.3, 0.8],
        rotate: () => anime.random(-10, 10),
        delay: anime.stagger(150),
        duration: 1200,
        easing: 'easeInOutQuad'
      })
      .add({
        targets: '.logo-fragment',
        translateX: () => anime.random(-5, 5),
        translateY: () => anime.random(-5, 5),
        duration: 800,
        easing: 'spring(1, 80, 10, 0)'
      });

    anime({
      targets: '.logo-text-glitch',
      opacity: [0, 1],
      translateX: [-20, 0],
      duration: 1200,
      delay: 400,
      easing: 'easeOutExpo'
    });
  }, []);

  return (
    <motion.div
      ref={logoRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ x: mouseX, y: mouseY }}
      className="flex flex-col items-center justify-center mb-16 relative"
    >
      <div className="absolute inset-0 bg-cyan-500/20 blur-[100px] rounded-full opacity-20 pointer-events-none" />
      <svg width="140" height="140" viewBox="0 0 100 100" className="mb-6 relative z-10">
        <rect className="logo-fragment" x="20" y="20" width="20" height="20" fill="#00f3ff" filter="url(#glow)" />
        <rect className="logo-fragment" x="60" y="20" width="20" height="20" fill="#ff00ff" filter="url(#glow)" />
        <rect className="logo-fragment" x="40" y="40" width="20" height="20" fill="white" filter="url(#glow)" />
        <rect className="logo-fragment" x="20" y="60" width="20" height="20" fill="#ff00ff" filter="url(#glow)" />
        <rect className="logo-fragment" x="60" y="60" width="20" height="20" fill="#00f3ff" filter="url(#glow)" />
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
      </svg>
      <h1 className="logo-text-glitch text-7xl md:text-9xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-[#00f3ff] via-white to-[#ff00ff] drop-shadow-[0_0_15px_rgba(0,243,255,0.4)] relative z-10">
        ATLAS
      </h1>
      <div className="logo-text-glitch h-1 w-24 bg-[#00f3ff] mt-2 glow-cyan" />
    </motion.div>
  );
};

// --- Main Page ---

const HomePage = () => {
  const containerRef = useRef(null);
  const [stats, setStats] = useState({ users: 0, sessions: 0, checkins: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      const data = await getStats();
      setStats(data);
    };
    fetchStats();
  }, []);

  useEffect(() => {
    // Hero content entrance
    anime({
      targets: '.hero-reveal',
      opacity: [0, 1],
      translateY: [20, 0],
      delay: anime.stagger(150, { start: 600 }),
      duration: 1000,
      easing: 'easeOutExpo'
    });

    // Background particles loop
    anime({
      targets: '.bg-particle',
      translateY: ['-100vh', '100vh'],
      opacity: [0, 0.2, 0],
      duration: () => anime.random(5000, 10000),
      delay: () => anime.random(0, 5000),
      loop: true,
      easing: 'linear'
    });
  }, []);

  return (
    <div ref={containerRef} className="relative min-h-screen overflow-hidden text-white flex flex-col items-center py-20 px-4 bg-[#050505] selection:bg-cyan-500 selection:text-black">
      <div className="noise-overlay" />
      <BackgroundAura />
      <ScrollProgress />
      <MouseFollower />

      {/* Parallax Background Elements */}
      <ParallaxElement speed={-0.2} className="absolute top-[10%] left-[5%] w-64 h-64 border border-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <ParallaxElement speed={0.3} className="absolute top-[40%] right-[10%] w-96 h-96 border border-pink-500/10 rounded-full blur-3xl pointer-events-none" />
      <ParallaxElement speed={-0.1} className="absolute top-[70%] left-[15%] w-48 h-48 border border-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Grid Background */}
      <div className="absolute inset-0 z-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(to right, #ffffff08 1px, transparent 1px), linear-gradient(to bottom, #ffffff08 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }}
      />

      {/* Background Particles */}
      {[...Array(20)].map((_, i) => (
        <div
          key={i}
          className="bg-particle absolute w-[1px] h-20 bg-cyan-400/20 top-0 pointer-events-none"
          style={{ left: `${Math.random() * 100}%` }}
        />
      ))}

      {/* Floating Geometric Elements */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 100, repeat: Infinity, ease: "linear" }}
        className="absolute top-20 left-10 w-96 h-96 border border-cyan-500/5 rounded-full pointer-events-none border-dashed"
      />
      <motion.div
        animate={{ rotate: -360 }}
        transition={{ duration: 150, repeat: Infinity, ease: "linear" }}
        className="absolute bottom-20 right-10 w-[500px] h-[500px] border border-pink-500/5 rounded-full pointer-events-none border-dotted"
      />

      <div className="max-w-6xl w-full z-10 text-center relative">
        <AnimatedLogo />

        <div className="hero-reveal mb-14">
          <p className="text-xl md:text-2xl text-white/70 max-w-2xl mx-auto font-bold leading-relaxed tracking-wide">
            Attendance Tracking & Location Authenticated System.
            <span className="block mt-2 text-[#00f3ff] text-sm tracking-[0.3em] font-black uppercase opacity-60">
              Secure and reliable verification
            </span>
          </p>
        </div>

        <div className="hero-reveal flex flex-col sm:flex-row gap-6 justify-center mb-20">
          <MagneticButton
            to="/login"
            className="px-12 py-4 bg-[#00f3ff] text-black font-black uppercase tracking-widest rounded-sm inline-block shadow-[0_0_20px_rgba(0,243,255,0.4)]"
          >
            GET STARTED
          </MagneticButton>

          <MagneticButton
            href="#features"
            className="px-12 py-4 border-2 border-white/20 text-white font-black uppercase tracking-widest rounded-sm inline-block hover:border-[#ff00ff] hover:text-[#ff00ff] hover:shadow-[0_0_20px_rgba(255,0,255,0.3)] bg-transparent"
          >
            LEARN MORE
          </MagneticButton>
        </div>

        {/* Stats Section */}
        <div className="hero-reveal grid grid-cols-1 md:grid-cols-3 gap-6 mb-28 max-w-4xl mx-auto">
          <StatItem value={stats.users} label="Total Users" />
          <StatItem value={stats.checkins} label="Total Check-ins" />
          <StatItem value={stats.sessions} label="Sessions Created" />
        </div>

        <div id="features" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-left hero-reveal">
          <FeatureCard
            title="Secure Attendance"
            description="Our location verification system ensures that attendees are actually present at the venue."
            colorClass="text-[#00f3ff]"
            highlightColor="bg-[#00f3ff]"
          />
          <FeatureCard
            title="Smart Geofencing"
            description="Define virtual boundaries for your sessions with simple and precise controls."
            colorClass="text-[#ff00ff]"
            highlightColor="bg-[#ff00ff]"
          />
          <FeatureCard
            title="Blockchain Verified"
            description="Cryptographic proof of attendance with immutable blockchain-style verification for tamper-proof records."
            colorClass="text-[#00f3ff]"
            highlightColor="bg-[#00f3ff]"
          />
          <FeatureCard
            title="Offline-First"
            description="Mark attendance even without internet. Seamlessly syncs when back online with zero data loss."
            colorClass="text-[#39ff14]"
            highlightColor="bg-[#39ff14]"
          />
          <FeatureCard
            title="Live Insights"
            description="Track attendance growth and engagement in real-time with easy-to-read charts."
            colorClass="text-[#ffff00]"
            highlightColor="bg-[#ffff00]"
          />
          <FeatureCard
            title="Mobile Ready"
            description="A smooth and responsive experience that works perfectly on any smartphone or tablet."
            colorClass="text-[#ff00ff]"
            highlightColor="bg-[#ff00ff]"
          />
        </div>
      </div>

      <footer className="mt-32 text-white/20 text-[10px] font-black tracking-[0.5em] uppercase hero-reveal">
                // POWERED BY <span className="text-[#ff00ff]">TEAM ALGOFORGE</span>
      </footer>
    </div>
  );
};

export default HomePage;
