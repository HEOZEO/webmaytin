import React from 'react';
import { motion } from 'framer-motion';

// Preset variants
export const variants = {
  fadeUp: {
    hidden: { opacity: 0, y: 40 },
    visible: { opacity: 1, y: 0 },
  },
  fadeLeft: {
    hidden: { opacity: 0, x: -50 },
    visible: { opacity: 1, x: 0 },
  },
  fadeRight: {
    hidden: { opacity: 0, x: 50 },
    visible: { opacity: 1, x: 0 },
  },
  fadeIn: {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1 },
  },
  zoomIn: {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { opacity: 1, scale: 1 },
  },
};

/**
 * ScrollReveal - Wrapper component that animates children when they enter viewport
 * @param {string} variant - 'fadeUp' | 'fadeLeft' | 'fadeRight' | 'fadeIn' | 'zoomIn'
 * @param {number} delay - animation delay in seconds
 * @param {number} duration - animation duration in seconds
 * @param {string} className - extra tailwind classes
 */
export default function ScrollReveal({
  children,
  variant = 'fadeUp',
  delay = 0,
  duration = 0.8,
  className = '',
  ...props
}) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.15 }}
      variants={variants[variant]}
      transition={{
        duration,
        delay,
        ease: [0.25, 0.1, 0.25, 1], // smooth cubic-bezier
      }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

/**
 * StaggerContainer - Wraps children and staggers their animations
 * @param {number} staggerChildren - delay between each child in seconds
 */
export function StaggerContainer({
  children,
  staggerChildren = 0.1,
  delayChildren = 0,
  className = '',
  ...props
}) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.1 }}
      variants={{
        hidden: {},
        visible: {
          transition: {
            staggerChildren,
            delayChildren,
          },
        },
      }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

/**
 * StaggerItem - Use inside StaggerContainer
 * @param {string} variant - animation variant name
 */
export function StaggerItem({
  children,
  variant = 'fadeUp',
  duration = 0.8,
  className = '',
  ...props
}) {
  return (
    <motion.div
      className={className}
      variants={variants[variant]}
      transition={{ duration, ease: [0.25, 0.1, 0.25, 1] }}
      {...props}
    >
      {children}
    </motion.div>
  );
}
