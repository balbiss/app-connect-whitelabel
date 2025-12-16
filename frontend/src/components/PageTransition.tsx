import { motion } from "framer-motion";
import { ReactNode, memo } from "react";

interface PageTransitionProps {
  children: ReactNode;
}

const pageVariants = {
  initial: {
    opacity: 0,
    x: 10,
  },
  animate: {
    opacity: 1,
    x: 0,
  },
  exit: {
    opacity: 0,
    x: -10,
  },
};

const pageTransition = {
  type: "tween",
  ease: [0.4, 0, 0.2, 1], // easeInOut cubic-bezier
  duration: 0.2, // Reduzido de 0.3 para 0.2 para ser mais rápido
};

export const PageTransition = memo(({ children }: PageTransitionProps) => {
  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageVariants}
      transition={pageTransition}
      style={{ willChange: 'transform, opacity' }} // Otimização de performance
    >
      {children}
    </motion.div>
  );
});
PageTransition.displayName = 'PageTransition';




