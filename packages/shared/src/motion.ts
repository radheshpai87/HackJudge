import { Variants } from 'framer-motion';

export const pageVariants: Variants = {
  hidden:  { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0,
    transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] } },
  exit:    { opacity: 0, y: -8,
    transition: { duration: 0.15, ease: [0.4, 0, 1, 1] } },
};

export const cardVariants: Variants = {
  hidden:  { opacity: 0, scale: 0.97 },
  visible: { opacity: 1, scale: 1,
    transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] } },
};

export const listVariants: Variants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1,
    transition: { staggerChildren: 0.04, delayChildren: 0.05 } },
};

export const itemVariants: Variants = {
  hidden:  { opacity: 0, x: -8 },
  visible: { opacity: 1, x: 0,
    transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] } },
};

export const burstVariants: Variants = {
  hidden:  { opacity: 0, scale: 0.8 },
  visible: { opacity: 1, scale: 1,
    transition: { type: 'spring', stiffness: 400, damping: 20 } },
  exit:    { opacity: 0, scale: 1.1,
    transition: { duration: 0.2 } },
};

export const drawerVariants: Variants = {
  hidden:  { y: '100%' },
  visible: { y: 0,
    transition: { type: 'spring', stiffness: 300, damping: 30 } },
  exit:    { y: '100%',
    transition: { duration: 0.2, ease: [0.4, 0, 1, 1] } },
};
