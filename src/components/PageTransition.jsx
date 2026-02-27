// src/components/PageTransition.jsx
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';

// Slide variants for different directions
const slideVariants = {
  right: {
    initial: { 
      opacity: 0,
      x: 100,
      scale: 0.95
    },
    animate: { 
      opacity: 1,
      x: 0,
      scale: 1,
      transition: {
        duration: 0.1,
        ease: [0.68, -0.55, 0.265, 1.55] // Bounce effect
      }
    },
    exit: { 
      opacity: 0,
      x: -100,
      scale: 0.95,
      transition: {
        duration: 0.1
      }
    }
  },
  
  left: {
    initial: { 
      opacity: 0,
      x: -100,
      scale: 0.95
    },
    animate: { 
      opacity: 1,
      x: 0,
      scale: 1,
      transition: {
        duration: 0.4,
        ease: [0.68, -0.55, 0.265, 1.55]
      }
    },
    exit: { 
      opacity: 0,
      x: 100,
      scale: 0.95,
      transition: {
        duration: 0.1
      }
    }
  },
  
  top: {
    initial: { 
      opacity: 0,
      y: -100,
      scale: 0.95
    },
    animate: { 
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.1,
        ease: [0.68, -0.55, 0.265, 1.55]
      }
    },
    exit: { 
      opacity: 0,
      y: 100,
      scale: 0.95,
      transition: {
        duration: 0.1
      }
    }
  },
  
  bottom: {
    initial: { 
      opacity: 0,
      y: 100,
      scale: 0.95
    },
    animate: { 
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.1,
        ease: [0.68, -0.55, 0.265, 1.55]
      }
    },
    exit: { 
      opacity: 0,
      y: -100,
      scale: 0.95,
      transition: {
        duration: 0.1
      }
    }
  },
  
  rotate: {
    initial: { 
      opacity: 0,
      x: 100,
      rotate: 15,
      scale: 0.9
    },
    animate: { 
      opacity: 1,
      x: 0,
      rotate: 0,
      scale: 1,
      transition: {
        duration: 0.1,
        ease: [0.68, -0.55, 0.265, 1.55]
      }
    },
    exit: { 
      opacity: 0,
      x: -100,
      rotate: -15,
      scale: 0.9,
      transition: {
        duration: 0.1
      }
    }
  },
  
  fadeScale: {
    initial: { 
      opacity: 0,
      scale: 0.8
    },
    animate: { 
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.1,
        ease: "easeOut"
      }
    },
    exit: { 
      opacity: 0,
      scale: 0.8,
      transition: {
        duration: 0.1
      }
    }
  }
};

const PageTransition = ({ children, direction = 'right' }) => {
  const location = useLocation();
  const variant = slideVariants[direction] || slideVariants.right;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial="initial"
        animate="animate"
        exit="exit"
        variants={variant}
        className="w-full"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};

export default PageTransition;