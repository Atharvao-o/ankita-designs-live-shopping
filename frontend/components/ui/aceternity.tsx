"use client";

import { ReactNode, useMemo, useState } from "react";
import type { ButtonHTMLAttributes, HTMLAttributes, InputHTMLAttributes } from "react";
import { motion, useMotionTemplate, useMotionValue, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

export function AuroraBackground({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("relative overflow-hidden", className)}>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-70 [background:radial-gradient(circle_at_18%_12%,rgba(124,58,237,0.22),transparent_30%),radial-gradient(circle_at_82%_18%,rgba(244,111,80,0.18),transparent_26%),radial-gradient(circle_at_48%_82%,rgba(216,183,106,0.18),transparent_30%)]"
      />
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-[20%] opacity-30 blur-3xl [background:conic-gradient(from_180deg_at_50%_50%,rgba(216,183,106,0.18),rgba(124,58,237,0.2),rgba(244,111,80,0.18),rgba(216,183,106,0.18))]"
        animate={{ rotate: [0, 360] }}
        transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

export function BackgroundBeams({ className }: { className?: string }) {
  const beams = useMemo(() => Array.from({ length: 9 }, (_, index) => index), []);
  return (
    <div aria-hidden="true" className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}>
      {beams.map((beam) => (
        <motion.span
          key={beam}
          className="absolute top-[-20%] h-[60%] w-px origin-top bg-gradient-to-b from-transparent via-[var(--gold)] to-transparent opacity-25"
          style={{ left: `${8 + beam * 11}%`, rotate: `${-18 + beam * 4}deg` }}
          animate={{ y: ["0%", "160%"], opacity: [0, 0.4, 0] }}
          transition={{ duration: 7 + beam * 0.45, repeat: Infinity, ease: "easeInOut", delay: beam * 0.35 }}
        />
      ))}
    </div>
  );
}

export function Sparkles({ className, density = 34 }: { className?: string; density?: number }) {
  const reduceMotion = useReducedMotion();
  const particles = useMemo(
    () =>
      Array.from({ length: density }, (_, index) => ({
        id: index,
        left: `${(index * 37) % 100}%`,
        top: `${(index * 53) % 100}%`,
        size: 2 + (index % 3),
        delay: index * 0.12
      })),
    [density]
  );

  return (
    <div aria-hidden="true" className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}>
      {particles.map((particle) => (
        <motion.span
          key={particle.id}
          className="absolute rounded-full bg-[var(--gold)] shadow-[0_0_18px_rgba(216,183,106,0.7)]"
          style={{ left: particle.left, top: particle.top, width: particle.size, height: particle.size }}
          animate={reduceMotion ? undefined : { scale: [0.4, 1.25, 0.4], opacity: [0.1, 0.8, 0.1] }}
          transition={{ duration: 2.8 + (particle.id % 6) * 0.35, repeat: Infinity, ease: "easeInOut", delay: particle.delay }}
        />
      ))}
    </div>
  );
}

export function MovingBorder({ children, className, wrapperClassName, ...props }: HTMLAttributes<HTMLDivElement> & { children: ReactNode; className?: string; wrapperClassName?: string }) {
  return (
    <div {...props} className={cn("group relative overflow-hidden rounded-[32px] p-px", wrapperClassName)}>
      <motion.div
        aria-hidden="true"
        className="absolute inset-[-45%] bg-[conic-gradient(from_0deg,transparent,rgba(216,183,106,0.85),rgba(244,111,80,0.72),transparent_34%)] opacity-70 blur-sm"
        animate={{ rotate: 360 }}
        transition={{ duration: 7, repeat: Infinity, ease: "linear" }}
      />
      <div className={cn("relative rounded-[inherit] border border-[color:var(--border)] bg-[var(--surface-strong)]", className)}>{children}</div>
    </div>
  );
}

export function Card3D({ children, className }: { children: ReactNode; className?: string }) {
  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);
  const transform = useMotionTemplate`perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;

  return (
    <motion.div
      className={cn("[transform-style:preserve-3d]", className)}
      style={{ transform }}
      onMouseMove={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        rotateX.set(((y / rect.height) - 0.5) * -8);
        rotateY.set(((x / rect.width) - 0.5) * 8);
      }}
      onMouseLeave={() => {
        rotateX.set(0);
        rotateY.set(0);
      }}
      transition={{ type: "spring", stiffness: 180, damping: 22 }}
    >
      {children}
    </motion.div>
  );
}

export function AnimatedTooltip({ items }: { items: Array<{ id: string; name: string; image?: string }> }) {
  const [hovered, setHovered] = useState<string | null>(null);
  return (
    <div className="flex -space-x-3">
      {items.map((item) => (
        <div key={item.id} className="relative" onMouseEnter={() => setHovered(item.id)} onMouseLeave={() => setHovered(null)}>
          {hovered === item.id ? (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className="absolute -top-11 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-full border border-[color:var(--border)] bg-[var(--bg-soft)] px-3 py-1 text-xs font-semibold text-[var(--text)] shadow-[var(--shadow-soft)]"
            >
              {item.name}
            </motion.div>
          ) : null}
          {item.image ? (
            <img src={item.image} alt={item.name} className="h-10 w-10 rounded-full border-2 border-[var(--bg-soft)] object-cover" />
          ) : (
            <span className="grid h-10 w-10 place-items-center rounded-full border-2 border-[var(--bg-soft)] bg-[var(--surface-strong)] text-xs font-bold text-[var(--gold)]">
              {item.name.slice(0, 2).toUpperCase()}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

export function BentoGrid({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("grid auto-rows-[minmax(180px,auto)] grid-cols-1 gap-4 md:grid-cols-3", className)}>{children}</div>;
}

export function BentoGridItem({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <MovingBorder wrapperClassName={cn("rounded-[32px]", className)} className="h-full p-5">
      {children}
    </MovingBorder>
  );
}

export function InfiniteMovingCards({ items, className }: { items: ReactNode[]; className?: string }) {
  return (
    <div className={cn("relative overflow-hidden", className)}>
      <motion.div className="flex w-max gap-4" animate={{ x: ["0%", "-50%"] }} transition={{ duration: 24, repeat: Infinity, ease: "linear" }}>
        {[...items, ...items].map((item, index) => (
          <div key={index} className="w-[280px] shrink-0">
            {item}
          </div>
        ))}
      </motion.div>
      <div className="pointer-events-none absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-[var(--bg)] to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-[var(--bg)] to-transparent" />
    </div>
  );
}

export function LampEffect({ children, className }: { children?: ReactNode; className?: string }) {
  return (
    <div className={cn("relative overflow-hidden", className)}>
      <div aria-hidden="true" className="absolute left-1/2 top-0 h-44 w-[70%] -translate-x-1/2 rounded-b-full bg-[radial-gradient(ellipse_at_top,rgba(216,183,106,0.36),transparent_68%)] blur-2xl" />
      <div aria-hidden="true" className="absolute left-1/2 top-10 h-px w-[56%] -translate-x-1/2 bg-gradient-to-r from-transparent via-[var(--gold)] to-transparent" />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

export function TextGenerateEffect({ text, className }: { text: string; className?: string }) {
  return (
    <span className={className}>
      {text.split(" ").map((word, index) => (
        <motion.span
          key={`${word}-${index}`}
          className="inline-block"
          initial={{ opacity: 0, y: 12, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.5, delay: index * 0.045 }}
        >
          {word}&nbsp;
        </motion.span>
      ))}
    </span>
  );
}

export function FloatingDock({ items, className }: { items: Array<{ label: string; href: string; icon: ReactNode }>; className?: string }) {
  return (
    <nav className={cn("fixed bottom-5 left-1/2 z-50 hidden -translate-x-1/2 rounded-full border border-[color:var(--border)] bg-[var(--nav-bg)] p-2 shadow-[var(--shadow-soft)] backdrop-blur-2xl lg:flex", className)}>
      {items.map((item) => (
        <motion.a
          key={item.label}
          href={item.href}
          aria-label={item.label}
          whileHover={{ y: -8, scale: 1.08 }}
          whileTap={{ scale: 0.95 }}
          className="grid h-12 w-12 place-items-center rounded-full text-[var(--muted)] transition hover:bg-[var(--surface-strong)] hover:text-[var(--gold)]"
        >
          {item.icon}
        </motion.a>
      ))}
    </nav>
  );
}

export function SpotlightCard({ children, className }: { children: ReactNode; className?: string }) {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const background = useMotionTemplate`radial-gradient(420px circle at ${mouseX}px ${mouseY}px, rgba(216,183,106,0.20), transparent 42%)`;

  return (
    <motion.div
      className={cn("relative overflow-hidden rounded-[32px] border border-[color:var(--border)] bg-[var(--surface)]", className)}
      onMouseMove={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        mouseX.set(event.clientX - rect.left);
        mouseY.set(event.clientY - rect.top);
      }}
    >
      <motion.div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" style={{ background }} />
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
}

export function GlareCard({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <Card3D className={className}>
      <div className="group relative overflow-hidden rounded-[32px] border border-[color:var(--border)] bg-[var(--surface)] shadow-[var(--shadow-soft)]">
        <div aria-hidden="true" className="pointer-events-none absolute -inset-full translate-x-[-55%] rotate-12 bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-0 transition duration-700 group-hover:translate-x-[55%] group-hover:opacity-100" />
        <div className="relative z-10">{children}</div>
      </div>
    </Card3D>
  );
}

export function HoverBorderGradient({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <MovingBorder wrapperClassName={cn("rounded-full", className)} className="rounded-full bg-[var(--surface-strong)] px-5 py-3 text-sm font-semibold text-[var(--text)]">
      {children}
    </MovingBorder>
  );
}

export function StatefulButton({
  children,
  loading,
  className,
  disabled,
  type = "button",
  onClick,
  ...props
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onDrag" | "onDragStart" | "onDragEnd" | "onAnimationStart"> & { loading?: boolean }) {
  return (
    <motion.button
      {...props}
      type={type}
      disabled={disabled}
      onClick={onClick}
      whileHover={{ y: disabled ? 0 : -2 }}
      whileTap={{ scale: disabled ? 1 : 0.97 }}
      className={cn("relative inline-flex min-h-12 items-center justify-center overflow-hidden rounded-full bg-gradient-to-r from-[var(--coral)] to-[#ff9a62] px-6 text-sm font-bold text-white shadow-[0_18px_44px_rgba(244,111,80,0.28)] disabled:cursor-not-allowed disabled:opacity-60", className)}
    >
      <motion.span animate={{ y: loading ? -28 : 0, opacity: loading ? 0 : 1 }}>{children}</motion.span>
      <motion.span className="absolute" animate={{ y: loading ? 0 : 28, opacity: loading ? 1 : 0 }}>
        Processing...
      </motion.span>
    </motion.button>
  );
}

export function PlaceholdersAndVanishInput({
  placeholders,
  value,
  onChange,
  className,
  inputClassName,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "className"> & { placeholders: string[]; className?: string; inputClassName?: string }) {
  const [index, setIndex] = useState(0);
  const placeholder = placeholders[index % placeholders.length] ?? props.placeholder;

  return (
    <div className={cn("relative", className)} onAnimationIteration={() => setIndex((current) => current + 1)}>
      <input
        {...props}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={cn("luxury-input h-12 w-full rounded-2xl px-4 text-sm", inputClassName)}
      />
    </div>
  );
}

export function Tabs({ tabs, active, onChange, className }: { tabs: string[]; active: string; onChange: (tab: string) => void; className?: string }) {
  return (
    <div className={cn("flex gap-2 overflow-x-auto rounded-full border border-[color:var(--border)] bg-[var(--surface)] p-1", className)}>
      {tabs.map((tab) => (
        <button key={tab} type="button" onClick={() => onChange(tab)} className="relative min-h-10 shrink-0 rounded-full px-4 text-sm font-semibold text-[var(--muted)]">
          {active === tab ? <motion.span layoutId="aceternity-tab-pill" className="absolute inset-0 rounded-full bg-[var(--surface-strong)] shadow-[var(--shadow-soft)]" /> : null}
          <span className="relative z-10 text-[var(--text)]">{tab}</span>
        </button>
      ))}
    </div>
  );
}

export function EmptyStateCard({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <MovingBorder wrapperClassName="rounded-[32px]" className="p-8 text-center">
      <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-[var(--surface)] text-2xl font-serif text-[var(--gold)]">AE</div>
      <h3 className="mt-5 text-2xl font-semibold tracking-[-0.04em] text-[var(--text)]">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--muted)]">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </MovingBorder>
  );
}

export function Timeline({ items }: { items: Array<{ title: string; description: string }> }) {
  return (
    <div className="relative grid gap-5">
      <div aria-hidden="true" className="absolute left-5 top-4 h-[calc(100%-2rem)] w-px bg-gradient-to-b from-[var(--gold)] via-[var(--coral)] to-transparent" />
      {items.map((item, index) => (
        <motion.div key={item.title} initial={{ opacity: 0, x: -18 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.08 }} className="relative pl-14">
          <span className="absolute left-2 top-1 grid h-7 w-7 place-items-center rounded-full border border-[color:var(--gold)] bg-[var(--bg-soft)] text-xs font-bold text-[var(--gold)]">{index + 1}</span>
          <h4 className="font-semibold text-[var(--text)]">{item.title}</h4>
          <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{item.description}</p>
        </motion.div>
      ))}
    </div>
  );
}

export function FAQSection({ items }: { items: Array<{ question: string; answer: string }> }) {
  const [open, setOpen] = useState(0);
  return (
    <div className="grid gap-3">
      {items.map((item, index) => (
        <SpotlightCard key={item.question} className="group p-0">
          <button type="button" onClick={() => setOpen(open === index ? -1 : index)} className="flex w-full items-center justify-between gap-4 p-5 text-left">
            <span className="font-semibold text-[var(--text)]">{item.question}</span>
            <span className="text-[var(--gold)]">{open === index ? "-" : "+"}</span>
          </button>
          {open === index ? <motion.p initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} className="px-5 pb-5 text-sm leading-6 text-[var(--muted)]">{item.answer}</motion.p> : null}
        </SpotlightCard>
      ))}
    </div>
  );
}

export function AnimatedTestimonials({ items }: { items: Array<{ quote: string; name: string; role: string }> }) {
  const [index, setIndex] = useState(0);
  const item = items[index % items.length];
  return (
    <GlareCard>
      <div className="p-7">
        <motion.blockquote key={item.quote} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="text-xl font-medium leading-8 text-[var(--text)]">
          “{item.quote}”
        </motion.blockquote>
        <div className="mt-6 flex items-center justify-between">
          <div>
            <p className="font-semibold text-[var(--text)]">{item.name}</p>
            <p className="text-sm text-[var(--muted)]">{item.role}</p>
          </div>
          <button type="button" onClick={() => setIndex((current) => current + 1)} className="rounded-full border border-[color:var(--border)] px-4 py-2 text-sm font-semibold text-[var(--gold)]">
            Next
          </button>
        </div>
      </div>
    </GlareCard>
  );
}
